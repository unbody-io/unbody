import axios, { AxiosInstance } from 'axios'
import { PluginLifecycle } from 'src/lib/plugins-common'
import {
  DocumentScore,
  RerankParams,
  RerankResult,
  RerankerPlugin,
  RerankerPluginContext,
} from 'src/lib/plugins-common/reranker/Reranker.interface'
import { Config, Context } from './plugin.types'
import { schemas } from './schemas'

export class RerankerTransformers implements PluginLifecycle, RerankerPlugin {
  private config: Config
  private client: AxiosInstance

  schemas: RerankerPlugin['schemas'] = schemas

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
    ctx: RerankerPluginContext,
    params: RerankParams,
  ): Promise<RerankResult> => {
    const { query, documents } = params

    const response = await this.client.post<{
      scores: DocumentScore[]
    }>('/rerank', { query, documents })

    return { scores: response.data.scores }
  }
}
