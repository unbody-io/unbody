import { FileParserPluginContext } from 'src/lib/plugins-common/file-parser'
import type * as z from 'zod'
import type { schemas } from './schemas'

export type Config = z.infer<(typeof schemas)['config']>

export type Context = FileParserPluginContext

export type ParseFileOptions = z.infer<(typeof schemas)['parseFileOptions']>
