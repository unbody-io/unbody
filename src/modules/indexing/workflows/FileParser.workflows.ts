import {
  ApplicationFailure,
  executeChild,
  proxyActivities,
} from '@temporalio/workflow'
import { ParseFileResult } from 'src/lib/plugins-common/file-parser'
import { FileParserActivities } from '../activities/FileParser.activities'

export type ParseFileWorkflowParams = {
  sourceId: string
  recordId: string

  url: string
  fileId: string
  filename: string
  mimeType: string
  metadata?: Record<string, any>
}

export async function parseFileWorkflow(params: ParseFileWorkflowParams) {
  const {
    parseFile,
    getFileParsers,
    processFileRecord,
    makeAttachmentPublic,
    downloadAttachment,
  } = proxyActivities<FileParserActivities>({
    startToCloseTimeout: '10m',
    retry: {
      nonRetryableErrorTypes: ['UNSUPPORTED_MIME_TYPE'],
    },
  })

  const parsers = await getFileParsers({
    mimeType: params.mimeType,
  })

  let res: ParseFileResult | null = null
  let parserAlias: string | null = null

  for (const parser of parsers) {
    parserAlias = parser.alias

    res = await parseFile({
      sourceId: params.sourceId,
      recordId: params.recordId,
      fileId: params.fileId,
      filename: params.filename,
      mimeType: params.mimeType,
      url: params.url,
      parserAlias: parser.alias,
      parserOptions: parser.options,
    })

    if (res) break
  }

  if (!res)
    throw new ApplicationFailure(
      `No parser found for "${params.mimeType}"`,
      'UNSUPPORTED_MIME_TYPE',
    )

  const parsedAttachments: ParseFileResult[] = []

  if (res.attachments && res.attachments.length > 0) {
    for (const attachment of res.attachments) {
      const file = await downloadAttachment({
        attachment,
        parserAlias: parserAlias!,
        recordId: params.recordId,
        sourceId: params.sourceId,
      })

      const res = await executeChild('parseFileWorkflow', {
        args: [
          {
            fileId: file.id,
            url: file.privateUrl,
            mimeType: attachment.contentType,
            sourceId: params.sourceId,
            filename: file.filename,
            recordId: params.recordId,
          },
        ],
      })

      parsedAttachments.push(res)
    }
  }

  const processedAttachments = await Promise.all(
    parsedAttachments.map(async (attachment, index) => {
      const { publicUrl } = await makeAttachmentPublic({
        sourceId: params.sourceId,
        recordId: params.recordId,
        fileId: res!.attachments[index].id,
      })

      return {
        ...attachment,
        record: {
          ...attachment.record,
          url: publicUrl,
        },
        raw: res!.attachments[index],
      }
    }),
  )

  const record = await processFileRecord({
    attachments: {
      raw: res.attachments,
      processed: processedAttachments.map((attachment, index) => ({
        contentType: attachment.raw.contentType,
        filename: attachment.raw.filename,
        id: attachment.raw.id,
        processed: attachment.record,
        url: attachment.record.url,
      })),
    },
    fileId: params.fileId,
    filename: params.filename,
    mimeType: params.mimeType,
    parserAlias: parserAlias!,
    parserOptions: parsers.find((p) => p.alias === parserAlias!)?.options || {},
    record: res.record,
    recordId: params.recordId,
    sourceId: params.sourceId,
    recordMetadata: params.metadata || {},
  })

  return {
    params,
    record: record.record,
  }
}
