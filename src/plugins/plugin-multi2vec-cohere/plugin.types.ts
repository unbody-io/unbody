import { PluginContext } from 'src/lib/plugins-common'
import { z } from 'zod'
import { model, schemas } from './schemas'

export type Config = z.infer<typeof schemas.config>
export type VectorizeOptions = z.infer<typeof schemas.vectorizeOptions>

export const Models = model.enum
export type Model = keyof typeof Models

export type Context = PluginContext
