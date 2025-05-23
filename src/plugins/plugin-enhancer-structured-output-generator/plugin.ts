import { ChatMessage } from '@langchain/core/messages'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import axios from 'axios'
import * as sharp from 'sharp'
import { PluginLifecycle } from 'src/lib/plugins-common'
import {
  EnhanceParams,
  EnhanceResult,
  EnhancerPlugin,
  EnhancerPluginContext,
} from 'src/lib/plugins-common/enhancer'
import { Config, Context, EnhancerArgs, EnhancerResult } from './plugin.types'
import { schemas } from './schemas'

const MAX_IMAGE_SIZE = 3 * 1024 * 1024 // 3MB

const reduceImageSize = async (image: Buffer) => {
  let sharpImage = sharp(image)
  let format = await sharpImage.metadata().then((meta) => meta.format)
  if (!format || !['png', 'jpg', 'jpeg', 'webp', 'avif'].includes(format))
    return null

  sharpImage = sharp(
    await sharpImage
      .toFormat('jpeg')
      .jpeg({
        quality: 80,
        force: true,
      })
      .toBuffer(),
  )

  const metadata = await sharpImage.metadata()
  format = metadata.format!
  let size = metadata.size!

  while (size > MAX_IMAGE_SIZE) {
    const reduceBy = size / MAX_IMAGE_SIZE
    const width = Math.floor(metadata.width! / reduceBy)
    const height = Math.floor(metadata.height! / reduceBy)

    sharpImage = sharpImage.resize({
      width: Math.floor(width),
      height: Math.floor(height),
    })

    sharpImage = sharp(await sharpImage.toBuffer())

    size = (await sharpImage.metadata()).size!
  }

  return sharpImage
}

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
    .then(async (response) => {
      const buffer = Buffer.from(response.data, 'binary')
      const image = await reduceImageSize(buffer)
      if (!image) return url

      const encoded = buffer.toString('base64')
      const metadata = await image.metadata()
      const format = (metadata.format || 'png').toLowerCase()
      return `data:image/${format};base64,${encoded}`
    })
}

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

    const messages: ChatMessage[] = [
      new ChatMessage({
        role: 'system',
        content:
          'Extract the information requested by the user in JSON format.',
      }),
    ]

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
      .withStructuredOutput(args.schema, {
        method: 'jsonMode',
      })
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
