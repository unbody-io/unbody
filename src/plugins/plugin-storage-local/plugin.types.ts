import { PluginContext } from 'src/lib/plugins-common'
import { z } from 'zod'
import { schemas } from './schemas'

export type Config = z.infer<typeof schemas.config>

export type Context = PluginContext
