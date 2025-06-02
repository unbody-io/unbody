import axios, { AxiosInstance } from 'axios'
import { PluginLifecycle } from 'src/lib/plugins-common'
import {
  DocumentScore,
  RerankParams,
  RerankResult,
  RerankerPlugin,
  RerankerPluginContext,
} from 'src/lib/plugins-common/reranker/Reranker.interface'
import { Config, Context, RerankOptions } from './plugin.types'
import { schemas } from './schemas'

export class RerankerTransformers
  implements
    PluginLifecycle<Context, Config>,
    RerankerPlugin<Context, RerankOptions>
{
  private config!: Config
  private client!: AxiosInstance

  schemas: RerankerPlugin['schemas'] = schemas

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

  rerank = async (
    ctx: Context,
    params: RerankParams<RerankOptions>,
  ): Promise<RerankResult> => {
    const { query, documents } = params

    const model = params.options?.model || this.config.options?.model

    if (!model) throw new Error('Model not provided')

    const response = await this.client.post<{
      results: {
        index: number
        relevance_score: number
      }[]
    }>('/v2/rerank', {
      model,
      query,
      documents: documents.map((doc) => ({
        text: doc,
      })),
    })

    const scores: DocumentScore[] = response.data.results.map((result) => ({
      document: documents[result.index]!,
      score: result.relevance_score,
    }))

    return { scores }
  }
}
