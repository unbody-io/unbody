import type { z } from 'zod'
import { PluginContext } from '..'

export type EnhancerPluginContext = PluginContext & {
  tempDir: string
}

export interface EnhancerPlugin<
  C extends PluginContext = EnhancerPluginContext,
> {
  schemas: {
    config: z.ZodObject<any, any, any>
    args: z.ZodObject<any, any, any>
  }

  enhance: (ctx: C, params: EnhanceParams) => Promise<EnhanceResult>
}

export type EnhanceParams<T extends Record<string, any> = Record<string, any>> =
  {
    args: T
    taskId?: string
  }

export type EnhanceResult<T extends Record<string, any> = Record<string, any>> =

    | {
        status: 'pending'
        taskId: string
      }
    | {
        type: 'json'
        status: 'ready'

        result: T
      }
