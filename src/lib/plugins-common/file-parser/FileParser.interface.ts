import type { z } from 'zod'
import { PluginContext } from '..'

export type FileParserPluginContext = PluginContext & {
  tempDir: string
}

export namespace FileParserPlugin {
  export type Context = FileParserPluginContext

  export namespace Exceptions {
    class BaseError extends Error {}

    export class InvalidFileInput extends BaseError {}
    export class InvalidParserOptions extends BaseError {
      constructor(
        message: string,
        public errors: {
          path: (string | number)[]
          message: string
        }[],
      ) {
        super(message)
      }
    }
  }
}

export interface FileParserPlugin<
  C extends PluginContext = FileParserPluginContext,
> {
  schemas: {
    config: z.ZodObject<any, any, any>
    parseFileOptions?: z.ZodObject<any, any, any>
  }

  parseFile: (ctx: C, params: ParseFileParams) => Promise<ParseFileResult>
  processFileRecord: (
    ctx: C,
    params: ProcessFileRecordParams,
  ) => Promise<ProcessFileRecordResult>
}

export type ParseFileParams = {
  filename: string
  file: NodeJS.ReadableStream | Buffer
  metadata: Record<string, any>
  options?: Record<string, any>
}

export type ParseFileResult = {
  record: Record<string, any>
  attachments: {
    id: string
    filename: string
    contentType: string
    file: {
      key: string
      isExternal?: false
    }
  }[]
}

export type ProcessFileRecordParams = {
  record: Record<string, any>
  attachments: {
    raw: ParseFileResult['attachments']
    processed: {
      id: string
      url: string
      filename: string
      contentType: string
      processed: Record<string, any>
    }[]
  }

  options?: Record<string, any>
}

export type ProcessFileRecordResult = {
  record: Record<string, any>
}
