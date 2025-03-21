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

export type SummarizerArgs = {
  prompt?: string

  text: string
  metadata?: string | Record<string, any>
  maxWords?: number
  chunkSize?: number
  chunkOverlap?: number
  model: 'openai-gpt-4o' | 'openai-gpt-4o-mini' | 'openai-gpt-3.5-turbo'
}

export type SummarizerResult = {
  summary: string
  metadata: {
    finishReason: string
    usage: {
      inputTokens: number
      outputTokens: number
    }
  }
}

export type Context = EnhancerPluginContext
