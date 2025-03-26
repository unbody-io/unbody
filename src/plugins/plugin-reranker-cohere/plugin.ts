import axios, { AxiosInstance } from 'axios'
import { PluginLifecycle } from 'src/lib/plugins-common'
import {
  DocumentScore,
  RerankParams,
  RerankResult,
  RerankerPlugin,
  RerankerPluginContext,
} from 'src/lib/plugins-common/reranker/Reranker.interface'
import { z } from 'zod'
import { Config, Context, RerankOptions } from './plugin.types'

const configSchema = z.object({
  baseURL: z.string().optional(),
})

export class RerankerTransformers implements PluginLifecycle, RerankerPlugin {
  private config: Config
  private client: AxiosInstance

  schemas: RerankerPlugin['schemas'] = {
    config: configSchema,
    rerankOptions: z.object({}),
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

  rerank = async (
    ctx: RerankerPluginContext,
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
      document: documents[result.index],
      score: result.relevance_score,
    }))

    return { scores }
  }
}
