import type { z } from 'zod'
import { PluginContext } from '..'

export type RerankerPluginContext = PluginContext & {
  tempDir: string
}

export interface RerankerPlugin<
  C extends PluginContext = RerankerPluginContext,
> {
  schemas: {
    config: z.ZodObject<any, any, any>
    rerankOptions?: z.ZodObject<any, any, any>
  }

  rerank: (ctx: C, params: RerankParams) => Promise<RerankResult>
}

export type RerankParams<T extends Record<string, any> = Record<string, any>> =
  {
    query: string
    documents: string[]

    options?: T
  }

export type DocumentScore = {
  document: string
  score: number
}

export type RerankResult = {
  scores: DocumentScore[]
}
