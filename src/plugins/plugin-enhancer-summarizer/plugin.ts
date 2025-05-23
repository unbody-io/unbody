import { PromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import { loadSummarizationChain } from 'langchain/chains'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { PluginLifecycle } from 'src/lib/plugins-common'
import {
  EnhanceParams,
  EnhanceResult,
  EnhancerPlugin,
  EnhancerPluginContext,
} from 'src/lib/plugins-common/enhancer'
import {
  Config,
  Context,
  SummarizerArgs,
  SummarizerResult,
} from './plugin.types'
import { schemas } from './schemas'

const DEFAULT_PROMPT_TEMPLATE = `Write a summary of the given input, adhering to the following instructions:
- The summary must not exceed {maxWords} words.
- Base your summary solely on the information provided in the original text, do not make up information that is not in the original text.
- Maintain the same language, tone, and style as the original text.
- Do not describe the text, but instead, write the summary as if it were a standalone piece of content.

Use the following metadata to help you understand the input:
{documentMetadata}

INPUT:
"{text}"

SUMMARY:
`

export class Summarizer implements PluginLifecycle, EnhancerPlugin {
  private config!: Config

  schemas: EnhancerPlugin['schemas'] = schemas

  constructor() {}

  initialize = async (config: Config) => {
    this.config = config
  }

  bootstrap = async (ctx: Context) => {}

  destroy = async (ctx: Context) => {}

  enhance = async (
    ctx: EnhancerPluginContext,
    params: EnhanceParams<SummarizerArgs>,
  ): Promise<EnhanceResult<SummarizerResult>> => {
    const res = await this._summarize(params.args)

    return {
      result: res,
      status: 'ready',
      type: 'json',
    }
  }

  private _summarize = async (args: SummarizerArgs) => {
    if (args.model.startsWith('openai-')) {
      return this._summarizeOpenAI(args)
    }

    throw new Error('Unsupported model')
  }

  private _summarizeOpenAI = async (args: SummarizerArgs) => {
    const model = new ChatOpenAI({
      model: args.model.replace('openai-', ''),
      apiKey: this.config.clientSecret.openai?.apiKey,
    })

    const splitter = new RecursiveCharacterTextSplitter({
      separators: ['\n\n', '\n', ' ', ''],
      chunkSize: args.chunkSize || 16000,
      chunkOverlap: args.chunkOverlap || 200,
    })

    const docs = await splitter.createDocuments([args.text])

    let template = new PromptTemplate({
      template: args.prompt || DEFAULT_PROMPT_TEMPLATE,
      inputVariables: ['text', 'documentMetadata', 'maxWords'],
    })

    const usageMetadata = {
      inputTokens: 0,
      outputTokens: 0,
      finishReason: '',
    }

    const chain = loadSummarizationChain(model, {
      type: 'map_reduce',
      combinePrompt: template,
      combineMapPrompt: template,
      verbose: false,
    }).withConfig({
      callbacks: [
        {
          handleLLMEnd: async (output: any) => {
            const lastGeneration =
              output.generations[output.generations.length - 1]

            usageMetadata.finishReason =
              lastGeneration?.[lastGeneration?.length - 1]?.generationInfo
                ?.finish_reason || ''

            usageMetadata.inputTokens +=
              output.llmOutput?.tokenUsage?.promptTokens || 0

            usageMetadata.outputTokens +=
              output.llmOutput?.tokenUsage?.completionTokens || 0
          },
        },
      ],
    })

    const res = await chain.invoke({
      input_documents: docs,
      documentMetadata: !args.metadata
        ? ''
        : typeof args.metadata === 'string'
          ? args.metadata
          : JSON.stringify(args.metadata),
      maxWords: args.maxWords || 100,
    })

    return {
      summary: res?.text || '',
      metadata: {
        finishReason: usageMetadata.finishReason,
        usage: {
          inputTokens: usageMetadata.inputTokens,
          outputTokens: usageMetadata.outputTokens,
        },
      },
    }
  }
}
