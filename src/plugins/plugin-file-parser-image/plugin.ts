import * as path from 'path'
import * as sharp from 'sharp'
import { ImageBlockCollection } from 'src/lib/collections'
import { PluginLifecycle } from 'src/lib/plugins-common'
import {
  FileParserPlugin,
  FileParserPluginContext,
  ParseFileParams,
  ParseFileResult,
  ProcessFileRecordParams,
  ProcessFileRecordResult,
} from 'src/lib/plugins-common/file-parser'
import { buffer } from 'stream/consumers'
import { z } from 'zod'
import { Config, Context } from './plugin.types'

const configSchema = z.object({})

export class ImageFileParser
  implements PluginLifecycle<Context, Config>, FileParserPlugin<Context>
{
  private config!: Config

  schemas: FileParserPlugin['schemas'] = {
    config: configSchema,
  }

  constructor() {}

  initialize = async (config: Config) => {
    this.config = config
  }

  bootstrap = async (ctx: Context) => {}

  destroy = async (ctx: Context) => {}

  parseFile = async (
    ctx: Context,
    params: ParseFileParams,
  ): Promise<ParseFileResult> => {
    const fileBuffer = Buffer.isBuffer(params.file)
      ? params.file
      : await buffer(params.file)

    const image = sharp(fileBuffer)
    const metadata = await image.metadata()
    const originalName = path.basename(params.filename)

    const record = ImageBlockCollection.createPayload({
      originalName: originalName,
      alt: params.metadata.alt || '',
      title: '',
      caption: '',
      classNames: [],
      ext: metadata.format,
      size: metadata.size,
      width: metadata.width,
      height: metadata.height,
      mimeType: params.metadata.mimeType,
    })

    return {
      record: record,
      attachments: [],
    }
  }

  processFileRecord = async (
    ctx: Context,
    params: ProcessFileRecordParams,
  ): Promise<ProcessFileRecordResult> => {
    return {
      record: params.record,
    }
  }
}
