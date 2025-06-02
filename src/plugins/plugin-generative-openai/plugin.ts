import { ChatMessage } from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'
import { PluginContext, PluginLifecycle } from 'src/lib/plugins-common'
import {
  GenerateTextOptionsBase,
  GenerateTextParams,
  GenerateTextResult,
  GenerativePlugin,
  GetSupportedModelsParams,
  GetSupportedModelsResult,
} from 'src/lib/plugins-common/generative'
import { Config, Context, Model } from './plugin.types'
import { schemas } from './schemas'

const models: Record<
  Model,
  {
    imageInput: boolean
    jsonMode: boolean
    streaming: boolean
    structuredOutput: boolean
    functionCalling: boolean

    maxTokens: number
    contextWindow: number
  }
> = {
  'gpt-4o-mini': {
    imageInput: true,
    jsonMode: true,
    streaming: true,
    structuredOutput: true,
    functionCalling: true,

    maxTokens: 16_384,
    contextWindow: 128_000,
  },
  'gpt-4o': {
    streaming: true,
    imageInput: true,
    jsonMode: true,
    structuredOutput: true,
    functionCalling: true,

    maxTokens: 16_384,
    contextWindow: 128_000,
  },

  'o1-mini': {
    imageInput: false,
    jsonMode: true,
    streaming: true,
    structuredOutput: false,
    functionCalling: false,

    maxTokens: 65_536,
    contextWindow: 128_000,
  },
  o1: {
    streaming: true,
    imageInput: true,
    jsonMode: true,
    structuredOutput: true,
    functionCalling: true,

    maxTokens: 100_000,
    contextWindow: 200_000,
  },
  'o3-mini': {
    streaming: true,
    imageInput: false,
    jsonMode: true,
    structuredOutput: true,
    functionCalling: true,

    maxTokens: 100_000,
    contextWindow: 200_000,
  },

  'gpt-3.5-turbo': {
    imageInput: false,
    jsonMode: true,
    streaming: false,
    functionCalling: false,
    structuredOutput: false,

    maxTokens: 4096,
    contextWindow: 16385,
  },
  'gpt-4': {
    imageInput: false,
    jsonMode: true,
    streaming: true,
    functionCalling: false,
    structuredOutput: false,

    maxTokens: 8192,
    contextWindow: 8192,
  },
  'gpt-4-turbo': {
    imageInput: true,
    jsonMode: true,
    streaming: true,
    functionCalling: true,
    structuredOutput: false,

    maxTokens: 4096,
    contextWindow: 128000,
  },
}

export class GenerativeOpenAI
  implements PluginLifecycle<Context, Config>, GenerativePlugin<Context>
{
  private config!: Config

  schemas: GenerativePlugin['schemas'] = schemas

  constructor() {}

  initialize = async (config: Config) => {
    this.config = config
  }

  bootstrap = async (ctx: Context) => {}

  destroy = async (ctx: Context) => {}

  getSupportedModels = async (
    ctx: PluginContext,
    params: GetSupportedModelsParams,
  ): Promise<GetSupportedModelsResult> => {
    return {
      models: Object.keys(models).map((model) => ({
        name: model,
      })),
    }
  }

  generateText = async (
    ctx: Context,
    params: GenerateTextParams<GenerateTextOptionsBase>,
  ): Promise<GenerateTextResult> => {
    const options = params.options

    const model = options?.model || (this.config.options?.model as Model)
    const config = models[model as Model]

    if (!model) {
      throw new Error('Model not specified')
    }

    if (!config) throw new Error(`unknown model: ${model}`)

    const chat = new ChatOpenAI({
      model: model,
      topP: options?.topP,
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
      presencePenalty: options?.presencePenalty,
      frequencyPenalty: options?.frequencyPenalty,

      apiKey: this.config.clientSecret.apiKey,
      configuration: {
        baseURL: this.config.baseURL,
        apiKey: this.config.clientSecret.apiKey,
        project: this.config.clientSecret.project,
        organization: this.config.clientSecret.organization,
      },
    })

    const responseFormat = options?.responseFormat || 'text'

    if (
      !config.imageInput &&
      params.messages.some((msg) => msg.type === 'image')
    )
      throw new Error(`'${model}' doesn't support image input`)

    if (responseFormat === 'json_schema' && !options?.schema)
      throw new Error('Schema is required for json_schema response format')

    if (responseFormat === 'json_schema' && !config.structuredOutput)
      throw new Error(`'${model}' doesn't support json_schema response format`)

    if (responseFormat === 'json_object' && !config.jsonMode)
      throw new Error(`'${model}' doesn't support json_object response format`)

    if (options?.maxTokens && options.maxTokens > config.maxTokens)
      throw new Error(`'${model}' maxTokens limit is ${config.maxTokens}`)

    const llm =
      responseFormat === 'json_object'
        ? chat.withStructuredOutput(options?.schema || {}, {
            method: 'jsonMode',
          })
        : responseFormat === 'json_schema'
          ? chat.withStructuredOutput(options?.schema || {}, {
              method: 'jsonSchema',
            })
          : chat

    const messages: ChatMessage[] = params.messages.map(
      (msg) =>
        new ChatMessage({
          name: msg.name,
          role: msg.role,
          content: [
            msg.type === 'text'
              ? {
                  type: 'text',
                  text: msg.content,
                }
              : {
                  type: 'image_url',
                  image_url: {
                    url: msg.content.url,
                    detail: 'auto',
                  },
                },
          ],
        }),
    )

    let finishReason: string = ''
    const usage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    }

    const response = await llm.invoke(messages, {
      callbacks: [
        {
          handleLLMEnd: (output) => {
            usage.outputTokens =
              output.llmOutput!['tokenUsage']['completionTokens']
            usage.inputTokens = output.llmOutput!['tokenUsage']['promptTokens']
            usage.totalTokens = output.llmOutput!['tokenUsage']['totalTokens']
            if (output.generations?.[0]?.[0]?.generationInfo?.['finish_reason'])
              finishReason =
                output.generations[0][0].generationInfo['finish_reason']
          },
        },
      ],
      signal: params.signal,
    })

    return {
      content:
        options?.responseFormat && options?.responseFormat !== 'text'
          ? response
          : response.content,

      metadata: {
        usage,
        finishReason,
      },
    }
  }
}
