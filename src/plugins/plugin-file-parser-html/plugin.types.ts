import type { PluginContext } from 'src/lib/plugins-common'
import type * as z from 'zod'
import type { schemas } from './schemas'

export type Config = z.infer<(typeof schemas)['config']>

export type Context = PluginContext

export type ParseFileOptions = z.infer<(typeof schemas)['parseFileOptions']>
