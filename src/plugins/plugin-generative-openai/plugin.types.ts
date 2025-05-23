import { GenerativePluginContext } from 'src/lib/plugins-common/generative'
import type { z } from 'zod'
import { model, schemas } from './schemas'

export type Config = z.infer<typeof schemas.config>

export type Model = keyof typeof model.enum

export type Context = GenerativePluginContext
