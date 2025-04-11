import { PluginContext } from 'src/lib/plugins-common'
import type { z } from 'zod'
import type { schemas } from './schemas'

export type Config = z.infer<typeof schemas.config>

export type Context = PluginContext
