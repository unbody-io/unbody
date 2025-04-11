import { EnhancerPluginContext } from 'src/lib/plugins-common/enhancer'
import type { z } from 'zod'
import type { schemas } from './schemas'

export type Config = z.infer<typeof schemas.config>

export type EnhancerArgs = z.infer<typeof schemas.args>

export type EnhancerResult = {
  json: any
}

export type Context = EnhancerPluginContext
