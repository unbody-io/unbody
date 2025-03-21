import { EnhancerPluginContext } from 'src/lib/plugins-common/enhancer'

export type Config = {
  clientSecret: {
    openai?: {
      apiKey: string
      project?: string
      organization?: string
    }
  }
}

export type EnhancerArgs = {
  schema: any
  model: string
  prompt: string
  maxTokens?: number
  temperature?: number
  images?: {
    url: string
  }[]
}

export type EnhancerResult = {
  json: any
}

export type Context = EnhancerPluginContext
