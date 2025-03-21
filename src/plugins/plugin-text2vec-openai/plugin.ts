import { OpenAI } from 'openai'
import { PluginLifecycle } from 'src/lib/plugins-common'
import {
  InputTooLongException,
  TextVectorizerPlugin,
  VectorizeParams,
  VectorizeResult,
} from 'src/lib/plugins-common/text-vectorizer'
import { encoding_for_model } from 'tiktoken'
import { z } from 'zod'
import { Config, Context } from './plugin.types'

const MAX_TOKENS = {
  'text-embedding-ada-002': 8191,
  'text-embedding-3-large': 8191,
  'text-embedding-3-small': 8191,
}

const vectorizeOptionsSchema = z.object({
  model: z
    .enum([
      'text-embedding-ada-002',
      'text-embedding-3-large',
      'text-embedding-3-small',
    ])
    .optional()
    .default('text-embedding-ada-002'),
  autoTrim: z.boolean().optional().default(true),
})

const configSchema = z.object({
  clientSecret: z.object({
    apiKey: z.string(),
    project: z.string().optional(),
    organization: z.string().optional(),
  }),
  options: vectorizeOptionsSchema.optional(),
})

export class OpenAITextVectorizer
  implements PluginLifecycle, TextVectorizerPlugin
{
  private client: OpenAI
  private config: Config

  schemas: TextVectorizerPlugin['schemas'] = {
    config: configSchema,
    vectorizeOptions: vectorizeOptionsSchema,
  }

  constructor() {}

  initialize = async (config: Config) => {
    this.config = config
    this.client = new OpenAI({
      baseURL: this.config.baseURL,
      apiKey: this.config.clientSecret.apiKey,
      project: this.config.clientSecret.project,
      organization: this.config.clientSecret.organization,
    })
  }

  bootstrap = async (ctx: Context) => {}

  destroy = async (ctx: Context) => {}

  vectorize = async (
    ctx: Context,
    params: VectorizeParams<Required<Config>['options']>,
  ): Promise<VectorizeResult> => {
    const input = [...params.text]
    let options: Config['options'] = {
      ...(this.config.options || {}),
      ...(params.options || {}),
    }

    for (let index = 0; index < input.length; index++) {
      let text = input[index]
      const enc = encoding_for_model(options!.model as any)
      const tokens = enc.encode(text).length

      if (options?.autoTrim) {
        while (true) {
          const tokens = enc.encode(text).length

          if (tokens <= MAX_TOKENS[options!.model!]) break

          text = text.slice(
            0,
            Math.floor(text.length / (tokens / MAX_TOKENS[options!.model!])),
          )
        }

        if (text.length < params.text[index].length) {
          ctx.logger.warn("Text was truncated to fit the model's token limit", {
            originalLength: params.text[index].length,
            truncatedLength: text.length,
            model: options!.model,
          })
        }
      } else if (tokens > MAX_TOKENS[options!.model!]) {
        throw new InputTooLongException(
          `Input text is too long for the model. Max tokens allowed: ${MAX_TOKENS[options!.model!]}, input tokens: ${tokens}.`,
        )
      }

      input[index] = text
    }

    const {
      data: { data, usage },
    } = await this.client.embeddings
      .create(
        {
          input: input,
          model: options!.model!,
          encoding_format: 'float',
        },
        {
          maxRetries: 3,
        },
      )
      .withResponse()

    return {
      embeddings: data.map((result) => ({
        embedding: result.embedding,
      })),
      usage: {
        tokens: usage.prompt_tokens,
      },
    }
  }
}
