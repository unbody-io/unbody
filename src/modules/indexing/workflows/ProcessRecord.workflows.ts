import {
  ApplicationFailure,
  executeChild,
  proxyActivities,
  sleep,
} from '@temporalio/workflow'
import { ParseFileResult } from 'src/lib/plugins-common/file-parser'
import { IndexingEvent } from 'src/lib/plugins-common/provider'
import { RecordProcessorActivities } from '../activities/RecordProcessor.activities'
import { EnhanceRecordObjectsWorkflowParams } from './Enhancement.workflows'

export type ProcessEventWorkflowParams = {
  sourceId: string
  jobId: string
  event: IndexingEvent
}

export async function processEventWorkflow(params: ProcessEventWorkflowParams) {
  const { insertRecord, updateRecord, patchRecord, getRecord, deleteRecord } =
    proxyActivities<RecordProcessorActivities>({
      startToCloseTimeout: '10m',
      retry: {
        nonRetryableErrorTypes: ['UNSUPPORTED_MIME_TYPE'],
      },
    })

  const { event, sourceId, jobId } = params

  const process = async (action: 'insert' | 'update' | 'patch') => {
    const { record } = await executeChild('processRecordWorkflow', {
      args: [
        {
          event,
          jobId: jobId,
          sourceId: sourceId,
        } as ProcessRecordWorkflowParams,
      ],
      parentClosePolicy: 'TERMINATE',
    })

    const res =
      action === 'insert'
        ? await insertRecord({
            record: record,
            sourceId: sourceId,
            recordId: event.recordId,
          })
        : action === 'patch'
          ? await patchRecord({
              payload: event.metadata || {},
              sourceId: sourceId,
              recordId: event.recordId,
            })
          : await updateRecord({
              record: record,
              sourceId: sourceId,
              recordId: event.recordId,
            })

    await executeChild('enhanceRecordObjectsWorkflow', {
      args: [
        {
          record: record,
          sourceId: sourceId,
          objects: res.objects,
          objectId: res.objectId,
          recordId: event.recordId,
        } as EnhanceRecordObjectsWorkflowParams,
      ],
      parentClosePolicy: 'TERMINATE',
      taskQueue: 'enhancement-queue',
    })
  }

  if (event.eventName === 'deleted') {
    const record = await getRecord({
      sourceId,
      recordId: event.recordId,
    })
    if (record)
      await deleteRecord({
        sourceId: params.sourceId,
        recordId: params.event.recordId,
        collection: record.__typename,
      })
  } else if (event.eventName === 'created') {
    await process('insert')
  } else if (event.eventName === 'updated') {
    const record = await getRecord({
      sourceId,
      recordId: event.recordId,
    })

    await process(record ? 'update' : 'insert')
  } else if (event.eventName === 'patched') {
    const record = await getRecord({
      sourceId,
      recordId: event.recordId,
    })

    await process(record ? 'patch' : 'insert')
  }

  return {}
}

export type ProcessRecordWorkflowParams = {
  sourceId: string
  jobId: string
  event: IndexingEvent
}

export async function processRecordWorkflow(
  params: ProcessRecordWorkflowParams,
) {
  const {
    getRemoteRecord,
    processRecord,
    getFileParsers,
    downloadRecordFile,
    makeAttachmentPublic,
    downloadRecordAttachment,
  } = proxyActivities<RecordProcessorActivities>({
    startToCloseTimeout: '10m',
    retry: {
      nonRetryableErrorTypes: ['unsupported_mime_type'],
    },
  })

  if (params.event.metadata?.['mimeType']) {
    const parsers = await getFileParsers({
      mimeType: params.event.metadata['mimeType'],
    })
    if (parsers.length === 0) {
      throw new ApplicationFailure(
        `No parser found for "${params.event.metadata['mimeType']}"`,
        'unsupported_mime_type',
      )
    }
  }

  let res = await getRemoteRecord({
    sourceId: params.sourceId,
    recordId: params.event.recordId,
    metadata: params.event.metadata,
  })

  if (res.status === 'pending') {
    while (true) {
      await sleep('10 seconds')
      res = await getRemoteRecord({
        sourceId: params.sourceId,
        recordId: params.event.recordId,
        metadata: params.event.metadata,
        taskId: res.taskId,
      })

      if (res.status === 'ready') break
    }
  }

  const result = 'result' in res && res.result

  if (!result) return {}

  if (result.type === 'file') {
    const file = await downloadRecordFile({
      sourceId: params.sourceId,
      recordId: params.event.recordId,
      result,
    })
    const parsed = await executeChild('parseFileWorkflow', {
      taskQueue: 'file-parser-queue',
      args: [
        {
          fileId: file.id,
          url: file.privateUrl,
          mimeType: result.mimeType,
          sourceId: params.sourceId,
          filename: file.filename,
          recordId: params.event.recordId,
        },
      ],
    })

    const { publicUrl } = await makeAttachmentPublic({
      fileId: file.id,
      sourceId: params.sourceId,
      recordId: params.event.recordId,
    })

    const { record } = await processRecord({
      sourceId: params.sourceId,
      recordId: params.event.recordId,
      metadata: result.metadata,
      attachments: {
        raw: [],
        processed: [],
      },
      content: {
        ...parsed.record,
        url: publicUrl,
      },
    })

    return { record }
  } else {
    const parsedAttachments: ParseFileResult[] = []

    for (const attachment of result.attachments) {
      const file = await downloadRecordAttachment({
        attachment,
        sourceId: params.sourceId,
        recordId: params.event.recordId,
      })

      const res = await executeChild('parseFileWorkflow', {
        taskQueue: 'file-parser-queue',
        args: [
          {
            fileId: file.id,
            url: file.privateUrl,
            mimeType: attachment.contentType,
            sourceId: params.sourceId,
            filename: file.filename,
            recordId: params.event.recordId,
          },
        ],
      })

      parsedAttachments.push(res)
    }

    const processedAttachments = await Promise.all(
      parsedAttachments.map(async (attachment, index) => {
        const { publicUrl } = await makeAttachmentPublic({
          sourceId: params.sourceId,
          recordId: params.event.recordId,
          fileId: result.attachments[index].id,
        })

        return {
          ...attachment,
          record: {
            ...attachment.record,
            url: publicUrl,
          },
          raw: result.attachments[index],
        }
      }),
    )

    const { record } = await processRecord({
      sourceId: params.sourceId,
      recordId: params.event.recordId,
      metadata: result.metadata,
      content: result.content,
      attachments: {
        raw: result.attachments,
        processed: processedAttachments.map((attachment, index) => ({
          contentType: attachment.raw.contentType,
          filename: attachment.raw.filename,
          id: attachment.raw.id,
          processed: attachment.record,
          url: attachment.record.url,
        })),
      },
    })

    return {
      record,
    }
  }
}
