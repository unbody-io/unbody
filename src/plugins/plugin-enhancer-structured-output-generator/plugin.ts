import { ChatMessage } from '@langchain/core/messages'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import axios from 'axios'
import { PluginLifecycle } from 'src/lib/plugins-common'
import {
  EnhanceParams,
  EnhanceResult,
  EnhancerPlugin,
  EnhancerPluginContext,
} from 'src/lib/plugins-common/enhancer'
import { z } from 'zod'
import { Config, Context, EnhancerArgs, EnhancerResult } from './plugin.types'

const configSchema = z.object({
  clientSecret: z.object({
    openai: z
      .object({
        apiKey: z.string(),
        project: z.string().optional(),
        organization: z.string().optional(),
      })
      .optional(),
  }),
})

const argsSchema = z.object({
  schema: z.any(),
  model: z.enum(['openai-gpt-4o', 'openai-gpt-4o-mini']),
  prompt: z.string(),
  maxTokens: z.number().optional(),
  temperature: z.number().optional(),
  images: z
    .array(
      z.object({
        url: z.string().url(),
      }),
    )
    .optional()
    .default([]),
})

const downloadImage = async (url: string) => {
  if (url.startsWith('data:image')) {
    return url
  }

  const _url = new URL(url)
  if (_url.protocol !== 'http:' && _url.protocol !== 'https:') {
    return url
  }

  return axios
    .get(url, { responseType: 'arraybuffer', timeout: 10000 })
    .then((response) => {
      return Buffer.from(response.data, 'binary').toString('base64')
    })
    .then((base64) => {
      return 'data:image/jpeg;base64,' + base64
    })
}

export class Summarizer implements PluginLifecycle, EnhancerPlugin {
  private config: Config

  schemas: EnhancerPlugin['schemas'] = {
    config: configSchema,
    args: argsSchema,
  }

  constructor() {}

  initialize = async (config: Config) => {
    this.config = config
  }

  bootstrap = async (ctx: Context) => {}

  destroy = async (ctx: Context) => {}

  enhance = async (
    ctx: EnhancerPluginContext,
    params: EnhanceParams<EnhancerArgs>,
  ): Promise<EnhanceResult<EnhancerResult>> => {
    const res = await this._generate(params.args)
    return {
      result: res,
      status: 'ready',
      type: 'json',
    }
  }

  private _generate = async (args: EnhancerArgs) => {
    if (args.model.startsWith('openai-')) {
      return this._generateOpenAI(args)
    }

    throw new Error('Unsupported model')
  }

  private _generateOpenAI = async (args: EnhancerArgs) => {
    const model = new ChatOpenAI({
      model: args.model.replace('openai-', ''),
      apiKey: this.config.clientSecret.openai?.apiKey,
    })

    const images = await Promise.all(
      (args.images || []).map(async ({ url }) => {
        return downloadImage(url).catch((e) => {
          return url
        })
      }),
    )

    const messages: ChatMessage[] = []

    messages.push(new ChatMessage(args.prompt, 'user'))
    images.forEach((img) => {
      messages.push(
        new ChatMessage({
          content: [
            {
              type: 'image_url',
              image_url: {
                url: img,
              },
            },
          ],
          role: 'user',
        }),
      )
    })

    const usageMetadata = {
      inputTokens: 0,
      outputTokens: 0,
      finishReason: '',
    }

    const callbacks = [
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
    ]

    const output = await model
      .withStructuredOutput(args.schema)
      .invoke(
        await ChatPromptTemplate.fromMessages(messages).formatMessages({}),
        { callbacks },
      )

    return {
      json: output,
      usageMetadata,
    }
  }
}
