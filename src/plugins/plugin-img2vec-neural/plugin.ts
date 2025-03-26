import axios, { AxiosInstance } from 'axios'
import { PluginLifecycle } from 'src/lib/plugins-common'
import {
  ImageVectorizerPlugin,
  VectorizeParams,
  VectorizeResult,
} from 'src/lib/plugins-common/image-vectorizer'
import * as uuid from 'uuid'
import { z } from 'zod'
import { Config, Context } from './plugin.types'

const configSchema = z.object({
  baseURL: z.string().optional(),
})

export class Img2VecNeural implements PluginLifecycle, ImageVectorizerPlugin {
  private config: Config
  private client: AxiosInstance

  schemas: ImageVectorizerPlugin['schemas'] = {
    config: configSchema,
    vectorizeOptions: z.object({}),
  }

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
      params.image.map((image) =>
        this.client.post<{
          vector: number[]
        }>('/vectors', {
          id: uuid.v4(),
          image: image,
        }),
      ),
    )
    return {
      vectors: res.map((r) => ({
        vector: r.data.vector,
      })),
    }
  }
}
