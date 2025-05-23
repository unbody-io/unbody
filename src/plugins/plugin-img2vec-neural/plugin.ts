import axios, { AxiosInstance } from 'axios'
import * as sharp from 'sharp'
import { PluginLifecycle } from 'src/lib/plugins-common'
import {
  ImageVectorizerPlugin,
  VectorizeParams,
  VectorizeResult,
} from 'src/lib/plugins-common/image-vectorizer'
import * as uuid from 'uuid'
import { Config, Context } from './plugin.types'
import { schemas } from './schemas'

export class Img2VecNeural implements PluginLifecycle, ImageVectorizerPlugin {
  private config!: Config
  private client!: AxiosInstance

  schemas: ImageVectorizerPlugin['schemas'] = schemas

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
    const res = await Promise.all(
      params.image.map(async (image) => {
        let buffer = Buffer.from(image, 'base64')
        let sharpImage = sharp(buffer)
        const metadata = await sharpImage.metadata()
        const format = metadata.format
        const supportedFormats = this.config.supportedFormats || ['jpg']
        if (
          supportedFormats.length > 0 &&
          format &&
          !this.config.supportedFormats.includes(format)
        ) {
          sharpImage = sharpImage.toFormat(
            supportedFormats[0] as keyof sharp.FormatEnum,
          )
          buffer = await sharpImage.toBuffer()
        }

        return this.client.post<{
          vector: number[]
        }>('/vectors', {
          id: uuid.v4(),
          image: buffer.toString('base64'),
        })
      }),
    )
    return {
      vectors: res.map((r) => ({
        vector: r.data.vector,
      })),
    }
  }
}
