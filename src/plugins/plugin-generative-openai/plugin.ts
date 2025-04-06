import { ChatMessage } from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'
import { PluginContext, PluginLifecycle } from 'src/lib/plugins-common'
import {
  GenerateTextOptionsBase,
  GenerateTextParams,
  GenerateTextResult,
  GenerateTextResultStream,
  GenerateTextResultStreamChunk,
  GenerateTextResultStreamPayload,
  GenerativePlugin,
  GetSupportedModelsParams,
  GetSupportedModelsResult,
} from 'src/lib/plugins-common/generative'
import * as stream from 'stream'
import { z } from 'zod'
import { Config, Context, Model } from './plugin.types'

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

const configSchema = z.object({
  clientSecret: z.object({
    apiKey: z.string(),
    project: z.string().optional(),
    organization: z.string().optional(),
  }),
})

const generateTextOptionsSchema = z.object({
  model: z
    .enum<Model, Readonly<[Model, ...Model[]]>>(Object.keys(models) as any)
    .optional(),
  topP: z.number().optional(),
  maxTokens: z.number().optional(),
  temperature: z.number().optional(),
  presencePenalty: z.number().optional(),
  frequencyPenalty: z.number().optional(),
  schema: z.record(z.any()).optional(),
  responseFormat: z
    .enum(['text', 'json_object', 'json_schema'])
    .optional()
    .default('text'),
})

export class GenerativeOpenAI implements PluginLifecycle, GenerativePlugin {
  private config: Config

  schemas: GenerativePlugin['schemas'] = {
    config: configSchema,
    generateTextOptions: generateTextOptionsSchema,
  }

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
  ): Promise<GenerateTextResult | GenerateTextResultStream> => {
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

    if (params.stream && !config.streaming)
      throw new Error(`'${model}' doesn't support streaming`)

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

    if (params.stream) {
      const response = await llm.stream(messages, {
        options: {
          body: {
            stream_options: {
              include_usage: true,
            },
          },
        },
      })

      const format = params.options?.responseFormat || 'text'

      const stream = new Stream(
        response as any,
        (chunk) => {
          if (format === 'text')
            return {
              content: chunk.content,
            }

          return {
            content: chunk,
          }
        },
        (acc, chunk) => {
          if (format === 'text')
            return {
              ...acc,
              content:
                (typeof acc.content === 'string' ? acc.content : '') +
                chunk.content,
            }

          return {
            ...acc,
            content: chunk,
          }
        },
      )

      return stream
    }

    const response = await llm.invoke(messages, {
      callbacks: [
        {
          handleLLMEnd: (output) => {
            usage.outputTokens = output.llmOutput!.tokenUsage.completionTokens
            usage.inputTokens = output.llmOutput!.tokenUsage.promptTokens
            usage.totalTokens = output.llmOutput!.tokenUsage.totalTokens
            if (output.generations?.[0]?.[0].generationInfo?.finish_reason)
              finishReason =
                output.generations?.[0]?.[0].generationInfo?.finish_reason
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

export class Stream extends stream.Readable {
  private _firstChunk: boolean = true
  private _finished: boolean = false

  constructor(
    private readonly _readable?: stream.Readable,
    private readonly _readChunk?: (chunk: any) => GenerateTextResultStreamChunk,
    private readonly _appendChunk?: (
      acc: GenerateTextResultStreamPayload,
      chunk: GenerateTextResultStreamChunk,
    ) => GenerateTextResultStreamPayload,
  ) {
    super({ read: () => {} })

    if (this._readable) {
      let acc: null | GenerateTextResultStreamPayload = null
      ;(async () => {
        if (this._readable)
          for await (const chunk of this._readable) {
            const data = this._readChunk ? this._readChunk(chunk) : chunk
            this.pushChunk(data)

            if (!acc) {
              acc = {
                content: null as any,
                finished: true,
                metadata: {
                  finishReason: '',
                  usage: {
                    inputTokens: 0,
                    outputTokens: 0,
                    totalTokens: 0,
                  },
                },
              }
            }

            if (this._appendChunk && acc && chunk) {
              acc = this._appendChunk(acc, chunk)
            }
          }

        if (acc) {
          this.pushFinal(acc)
          this.close()
        }
      })().catch((err) => {
        this.emit('error', err)
        this.close()
      })
    }
  }

  pushChunk = (chunk: GenerateTextResultStreamChunk) => {
    let data = (!this._firstChunk ? '\n' : '') + JSON.stringify(chunk)
    this._firstChunk = false

    return super.emit('data', Buffer.from(data, 'utf-8'))
  }

  pushFinal = (payload: GenerateTextResultStreamPayload) => {
    const data = '\n' + JSON.stringify({ ...payload, finished: true })
    return super.emit('data', Buffer.from(data, 'utf-8'))
  }

  close() {
    this.push(null)
    this.emit('close')
  }
}
