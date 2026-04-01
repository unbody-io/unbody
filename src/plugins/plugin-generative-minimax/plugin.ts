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

const MINIMAX_BASE_URL = 'https://api.minimax.io/v1'

// MiniMax temperature must be in (0.0, 1.0] — clamp zero to a small positive value
const clampTemperature = (t: number | undefined): number | undefined => {
  if (t === undefined) return undefined
  if (t <= 0) return 0.01
  if (t > 1) return 1.0
  return t
}

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
  'MiniMax-M2.7': {
    imageInput: false,
    jsonMode: true,
    streaming: true,
    structuredOutput: true,
    functionCalling: true,
    maxTokens: 8192,
    contextWindow: 204_800,
  },
  'MiniMax-M2.7-highspeed': {
    imageInput: false,
    jsonMode: true,
    streaming: true,
    structuredOutput: true,
    functionCalling: true,
    maxTokens: 8192,
    contextWindow: 204_800,
  },
  'MiniMax-M2.5': {
    imageInput: false,
    jsonMode: true,
    streaming: true,
    structuredOutput: true,
    functionCalling: true,
    maxTokens: 8192,
    contextWindow: 204_800,
  },
  'MiniMax-M2.5-highspeed': {
    imageInput: false,
    jsonMode: true,
    streaming: true,
    structuredOutput: true,
    functionCalling: true,
    maxTokens: 8192,
    contextWindow: 204_800,
  },
}

export class GenerativeMiniMax
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

    const model =
      (options?.model as Model | undefined) ||
      (this.config.options?.model as Model | undefined)

    if (!model) {
      throw new Error('Model not specified')
    }

    const config = models[model]
    if (!config) throw new Error(`unknown model: ${model}`)

    const baseURL = this.config.baseURL || MINIMAX_BASE_URL

    const chat = new ChatOpenAI({
      model: model,
      topP: options?.topP,
      maxTokens: options?.maxTokens,
      temperature: clampTemperature(options?.temperature),
      apiKey: this.config.clientSecret.apiKey,
      configuration: {
        baseURL,
        apiKey: this.config.clientSecret.apiKey,
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
