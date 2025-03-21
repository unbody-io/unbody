import type { z } from 'zod'
import { PluginContext } from '..'

export type TextVectorizerPluginContext = PluginContext & {
  tempDir: string
}

export interface TextVectorizerPlugin<
  C extends PluginContext = TextVectorizerPluginContext,
> {
  schemas: {
    config: z.ZodObject<any, any, any>
    vectorizeOptions?: z.ZodObject<any, any, any>
  }

  vectorize: (ctx: C, params: VectorizeParams) => Promise<VectorizeResult>
}

export type VectorizeParams<
  T extends Record<string, any> = Record<string, any>,
> = {
  text: string[]
  options?: T
}

export type VectorizeResult = {
  embeddings: {
    embedding: number[]
  }[]

  usage: {
    tokens: number
  }
}
