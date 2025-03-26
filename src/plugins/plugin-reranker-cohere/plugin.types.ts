import { PluginContext } from 'src/lib/plugins-common'

export type Config = {
  baseURL?: string

  clientSecret: {
    apiKey: string
  }

  options?: RerankOptions
}

export type RerankOptions = {
  model: 'rerank-v3.5' | 'rerank-english-v3.0' | 'rerank-multilingual-v3.0'
}

export type Context = PluginContext
