import type { z } from 'zod'
import { PluginContext } from '..'

export type ImageVectorizerPluginContext = PluginContext & {
  tempDir: string
}

export interface ImageVectorizerPlugin<
  C extends PluginContext = ImageVectorizerPluginContext,
  A extends Record<string, any> = Record<string, any>,
> {
  schemas: {
    config: z.ZodObject<any, any, any>
    vectorizeOptions?: z.ZodObject<any, any, any>
  }

  vectorize: (ctx: C, params: VectorizeParams<A>) => Promise<VectorizeResult>
}

export type VectorizeParams<
  T extends Record<string, any> = Record<string, any>,
> = {
  image: string[]
  options?: T
}

export type VectorizeResult = {
  vectors: {
    vector: number[]
  }[]
}
