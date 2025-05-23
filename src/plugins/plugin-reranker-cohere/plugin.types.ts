import { RerankerPluginContext } from 'src/lib/plugins-common/reranker'
import { z } from 'zod'
import { model, schemas } from './schemas'

export type Config = z.infer<typeof schemas.config>
export type RerankOptions = z.infer<typeof schemas.rerankOptions>

export const Models = model.enum
export type Model = keyof typeof Models

export type Context = RerankerPluginContext
