import { Injectable } from '@nestjs/common'
import { ApplicationFailure } from '@temporalio/client'
import axios from 'axios'
import { FileParsers } from 'src/lib/core/modules/file-parsers'
import { Unbody } from 'src/lib/core/Unbody'
import {
  ParseFileResult,
  ProcessFileRecordParams,
} from 'src/lib/plugins-common/file-parser'

@Injectable()
export class FileParserActivities {
  constructor(private unbody: Unbody) {}

  async getFileParsers({ mimeType }: { mimeType: string }) {
    return this.unbody.modules.fileParsers.getParsersByMimeType({ mimeType })
  }

  async parseFile({
    filename,
    url,
    recordMetadata,
    parserAlias,
    parserOptions,
  }: {
    sourceId: string
    recordId: string
    fileId: string
    filename: string
    mimeType: string
    url: string
    taskId?: string
    recordMetadata?: Record<string, any>
    parserAlias: string
    parserOptions?: Record<string, any>
  }) {
    const parser = await this.unbody.modules.fileParsers.getParser(parserAlias)
    if (!parser)
      throw new ApplicationFailure(
        `FileParser ${parserAlias} not found`,
        'invalid_file_parser',
      )

    try {
      const res = await parser.parseFile({
        file: await axios
          .get(url, { responseType: 'stream', timeout: 120000 })
          .then((res) => res.data as NodeJS.ReadableStream),
        filename: filename,
        options: parserOptions,
        metadata: recordMetadata || {},
      })
      return res
    } catch (error) {
      if (error instanceof FileParsers.Exceptions.InvalidFileParserOptions) {
        throw new ApplicationFailure(
          `FileParser ${parserAlias} failed to parse file: ${error.message}`,
          'invalid_file_parser_input',
        )
      } else if (
        error instanceof FileParsers.Exceptions.InvalidFileParserOptions
      ) {
        throw new ApplicationFailure(
          `FileParser ${parserAlias} failed to parse file: ${error.message}`,
          'invalid_file_parser_options',
        )
      }

      throw error
    }
  }

  async processFileRecord({
    record,
    attachments,
    parserAlias,
  }: {
    sourceId: string
    recordId: string
    fileId: string
    filename: string
    mimeType: string
    taskId?: string
    recordMetadata?: Record<string, any>
    record: Record<string, any>
    attachments: ProcessFileRecordParams['attachments']
    parserAlias: string
    parserOptions?: Record<string, any>
  }) {
    const parser = await this.unbody.modules.fileParsers.getParser(parserAlias)
    if (!parser)
      throw new ApplicationFailure(
        `FileParser ${parserAlias} not found`,
        'invalid_file_parser',
      )

    const res = await parser.processFileRecord({
      record: record,
      attachments,
    })

    return res
  }

  async downloadAttachment({
    sourceId,
    recordId,
    parserAlias,
    attachment,
  }: {
    recordId: string
    sourceId: string
    parserAlias: string
    attachment: ParseFileResult['attachments'][number]
  }) {
    const parser = await this.unbody.modules.fileParsers.getParser(parserAlias)
    if (!parser)
      throw new ApplicationFailure(
        `FileParser ${parserAlias} not found`,
        'invalid_file_parser',
      )

    const fileStorage = parser.fileStorage
    const res = await fileStorage.download(attachment.file.key)

    const storage = await this.unbody.modules.storage.getStorage({})

    const file = await storage.storeFile({
      file: res,
      sourceId,
      id: attachment.id,
      recordId: recordId,
      filename: attachment.filename,
      mimeType: attachment.contentType,
      visibility: 'private',
    })

    return file
  }

  async makeAttachmentPublic({
    recordId,
    sourceId,
    fileId,
  }: {
    sourceId: string
    recordId: string
    fileId: string
  }) {
    const storage = await this.unbody.modules.storage.getStorage({})

    return storage
      .changeFileVisibility({
        id: fileId,
        sourceId,
        recordId,
        visibility: 'public',
      })
      .then((res) => res.files[0])
  }
}
