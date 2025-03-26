import { DatabasePluginContext } from 'src/lib/plugins-common/database'
import type { ConnectToCustomOptions } from 'weaviate-client'
import { z } from 'zod'

export const configSchema = z.object({
  connection: z.object({
    httpHost: z.string().optional(),
    httpPort: z.number().optional(),
    httpSecure: z.boolean().optional(),
    httpPath: z.string().optional(),
    grpcHost: z.string().optional(),
    grpcPort: z.number().optional(),
    grpcSecure: z.boolean().optional(),
    headers: z.record(z.string()).optional(),
    skipInitChecks: z.boolean().optional(),
    timeout: z.object({
      query: z.number().optional(),
      insert: z.number().optional(),
      init: z.number().optional(),
    }).optional(),
    auth: z
      .union([
        z.object({
          username: z.string(),
          password: z.string(),
        }),
        z.object({
          apiKey: z.string(),
        }),
      ])
      .optional(),
    proxies: z.record(z.any()).optional(),
  }),
  modules: z
    .object({
      textVectorizer: z
        .object({
          name: z.string(),
          config: z.record(z.any()).optional(),
        })
        .optional(),
      imageVectorizer: z
        .object({
          name: z.string(),
          config: z.record(z.any()).optional(),
        })
        .optional(),
      generative: z
        .object({
          name: z.string(),
          config: z.record(z.any()).optional(),
        })
        .optional(),
      reranker: z
        .object({
          name: z.string(),
          config: z.record(z.any()).optional(),
        })
        .optional(),
    })
    .optional(),
})

export type Context = DatabasePluginContext

export type Config = z.infer<typeof configSchema>
