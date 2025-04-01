import axios, { AxiosInstance } from 'axios'
import * as sharp from 'sharp'
import { PluginLifecycle } from 'src/lib/plugins-common'
import {
  MultimodalVectorizerPlugin,
  VectorizeParams,
  VectorizeResult,
} from 'src/lib/plugins-common/multimodal-vectorizer'
import { z } from 'zod'
import { Config, Context } from './plugin.types'

const MAX_IMAGE_SIZE = 3 * 1024 * 1024 // 3MB

const vectorizeOptionsSchema = z.object({
  model: z
    .enum([
      'embed-english-v3.0',
      'embed-english-light-v3.0',
      'embed-multilingual-v3.0',
      'embed-multilingual-light-v3.0',
    ])
    .optional()
    .default('embed-english-v3.0'),
})

const configSchema = z.object({
  baseURL: z.string().optional(),
  clientSecret: z.object({
    apiKey: z.string().optional(),
  }),
  options: vectorizeOptionsSchema.optional(),
})

export class CohereMultimodalVectorizer
  implements PluginLifecycle, MultimodalVectorizerPlugin
{
  private client: AxiosInstance
  private config: Config

  schemas: MultimodalVectorizerPlugin['schemas'] = {
    config: configSchema,
    vectorizeOptions: vectorizeOptionsSchema,
  }

  constructor() {}

  initialize = async (config: Config) => {
    this.config = config

    this.client = axios.create({
      baseURL: this.config.baseURL || 'https://api.cohere.com/',
      headers: {
        Authorization: `Bearer ${this.config.clientSecret.apiKey}`,
      },
    })
  }

  bootstrap = async (ctx: Context) => {}

  destroy = async (ctx: Context) => {}

  vectorize = async (
    ctx: Context,
    params: VectorizeParams<Required<Config>['options']>,
  ): Promise<VectorizeResult> => {
    const model = params.options?.model || this.config.options?.model
    if (!model) throw new Error('Model not provided')

    const texts =
      params.texts.length > 0
        ? await this.client
            .post('/v2/embed', {
              model,
              texts: params.texts,
              embedding_types: ['float'],
              input_type:
                params.type === 'query' ? 'search_query' : 'search_document',
              truncate: 'END',
            })
            .then((res) => res.data.embeddings.float)
        : []

    const images: number[][] = []

    if (params.images.length > 0) {
      for (const image of params.images) {
        const encoded = await this._formatImage(image)

        const res = await this.client
          .post('/v2/embed', {
            model,
            images: [encoded],
            embedding_types: ['float'],
            input_type: 'image',
          })
          .then((res) => res.data.embeddings.float)

        images.push(res[0])
      }
    }

    return {
      vectors: {
        text: texts,
        image: images,
        combined: null as any,
      },
    }
  }

  private _formatImage = async (image: string) => {
    let buffer = Buffer.from(image, 'base64')
    let sharpImage = sharp(buffer)

    let format = await sharpImage.metadata().then((meta) => meta.format)
    if (!format) return image

    buffer = await sharpImage
      .toFormat('jpeg')
      .jpeg({
        quality: 80,
        force: true,
      })
      .toBuffer()
    sharpImage = sharp(buffer)

    const metadata = await sharpImage.metadata()
    format = metadata.format!
    let size = metadata.size!
    while (size > MAX_IMAGE_SIZE) {
      const reduceBy = size / MAX_IMAGE_SIZE
      sharpImage = sharpImage.resize({
        height: Math.floor(metadata.height! / reduceBy),
        width: Math.floor(metadata.width! / reduceBy),
      })
      buffer = await sharpImage.toBuffer()
      sharpImage = sharp(buffer)
      size = (await sharpImage.metadata()).size!
    }

    const encoded = buffer.toString('base64')
    return `data:image/jpeg;base64,${encoded}`
  }
}
