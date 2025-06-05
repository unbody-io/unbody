import axios, { AxiosInstance } from 'axios'
import * as sharp from 'sharp'
import { PluginLifecycle } from 'src/lib/plugins-common'
import {
  MultimodalVectorizerPlugin,
  VectorizeParams,
  VectorizeResult,
} from 'src/lib/plugins-common/multimodal-vectorizer'
import { Config, Context } from './plugin.types'
import { schemas } from './schemas'

export class CohereMultimodalVectorizer
  implements
    PluginLifecycle<Context, Config>,
    MultimodalVectorizerPlugin<Context, {}>
{
  private client!: AxiosInstance
  private config!: Config

  schemas: MultimodalVectorizerPlugin['schemas'] = schemas

  constructor() {}

  initialize = async (config: Config) => {
    this.config = config

    this.client = axios.create({
      baseURL: this.config.baseURL,
    })
  }

  bootstrap = async (ctx: Context) => {}

  destroy = async (ctx: Context) => {}

  vectorize = async (
    ctx: Context,
    params: VectorizeParams<{}>,
  ): Promise<VectorizeResult> => {
    const texts = params.texts || []
    const images = await Promise.all(
      (params.images || []).map((image) => this._formatImage(image)),
    )

    const res = await this.client.post<{
      textVectors: number[][]
      imageVectors: number[][]
    }>('/vectorize', {
      texts: texts,
      images: images,
    })

    return {
      vectors: {
        text: res.data.textVectors,
        image: res.data.imageVectors,
        combined: null as any,
      },
    }
  }

  private _formatImage = async (image: string) => {
    let buffer = Buffer.from(image, 'base64')
    let sharpImage = sharp(buffer)
    const metadata = await sharpImage.metadata()
    const format = metadata.format
    const supportedFormats = this.config.supportedImageFormats || ['jpg']
    if (
      supportedFormats.length > 0 &&
      !!format &&
      !supportedFormats.includes(format)
    ) {
      sharpImage = sharpImage.toFormat(
        supportedFormats[0] as keyof sharp.FormatEnum,
      )
      buffer = await sharpImage.toBuffer()
    }

    return buffer.toString('base64')
  }
}
