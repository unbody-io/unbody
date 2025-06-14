import axios, { AxiosInstance } from 'axios'
import { PluginLifecycle } from 'src/lib/plugins-common'
import {
  DocumentScore,
  RerankParams,
  RerankResult,
  RerankerPlugin,
} from 'src/lib/plugins-common/reranker/Reranker.interface'
import { z } from 'zod'
import { Config, Context } from './plugin.types'

const configSchema = z.object({
  baseURL: z.string().url(),
})

export class RerankerTransformers
  implements PluginLifecycle<Context, Config>, RerankerPlugin<Context>
{
  private config!: Config
  private client!: AxiosInstance

  schemas: RerankerPlugin['schemas'] = {
    config: configSchema,
    rerankOptions: z.object({}),
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

  rerank = async (
    ctx: Context,
    params: RerankParams,
  ): Promise<RerankResult> => {
    const { query, documents } = params

    const response = await this.client.post<{
      scores: DocumentScore[]
    }>('/rerank', { query, documents })

    return { scores: response.data.scores }
  }
}
