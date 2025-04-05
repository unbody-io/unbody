import { PluginContext } from 'src/lib/plugins-common'
import type * as z from 'zod'
import type { schemas } from './schemas'

export type Config = z.infer<typeof schemas.config>
export type VectorizeOptions = z.infer<typeof schemas.vectorizeOptions>

export type Context = PluginContext
