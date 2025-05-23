import { ImageVectorizerPluginContext } from 'src/lib/plugins-common/image-vectorizer'
import type * as z from 'zod'
import type { schemas } from './schemas'

export type Config = z.infer<typeof schemas.config>
export type VectorizeOptions = z.infer<typeof schemas.vectorizeOptions>

export type Context = ImageVectorizerPluginContext
