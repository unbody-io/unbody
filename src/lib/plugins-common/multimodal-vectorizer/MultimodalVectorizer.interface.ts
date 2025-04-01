import type { z } from 'zod'
import { PluginContext } from '..'

export type MultimodalVectorizerPluginContext = PluginContext & {
  tempDir: string
}

export interface MultimodalVectorizerPlugin<
  C extends PluginContext = MultimodalVectorizerPluginContext,
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
  texts: string[]
  images: string[]
  type: 'object' | 'query'

  options?: T
}

export type VectorizeResult = {
  vectors: {
    text: number[][]
    image: number[][]
    combined: number[]
  }
}
