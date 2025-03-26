import { PluginContext } from 'src/lib/plugins-common'
import { z } from 'zod'

export const configSchema = z.object({
  publicRootDir: z
    .string()
    .nonempty('cannot be empty'),
  publicBaseUrl: z
    .string()
    .url(),
  privateRootDir: z
    .string()
    .nonempty('cannot be empty'),
  privateBaseUrl: z
    .string()
    .url(),
})

export type Config = z.infer<typeof configSchema>

export type Context = PluginContext
