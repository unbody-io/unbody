import { Injectable } from '@nestjs/common'
import { Unbody } from 'src/lib/core/Unbody'
import {
  ProcessRecordContentResult,
  ProcessRecordExternalFileResult,
  ProcessRecordLocalFileResult,
  ProcessRecordParams,
} from 'src/lib/plugins-common/provider'
import { IndexingService } from '../services/Indexing.service'

@Injectable()
export class RecordProcessorActivities {
  constructor(
    private indexingService: IndexingService,
    private unbody: Unbody,
  ) {}

  async getRemoteRecord({
    sourceId,
    taskId,
    recordId,
    metadata,
  }: {
    sourceId: string
    taskId?: string
    recordId: string
    metadata?: Record<string, any>
  }) {
    const provider = await this.indexingService.getProvider({ sourceId })

    return provider.getRecord({ recordId, metadata, taskId })
  }

  async processRecord({
    sourceId,
    taskId,
    recordId,
    metadata,
    content,
    attachments,
  }: {
    sourceId: string
    taskId?: string
    recordId: string
    metadata: Record<string, any>
    content: Record<string, any>
    attachments: ProcessRecordParams['attachments']
  }) {
    const provider = await this.indexingService.getProvider({ sourceId })

    return provider.processRecord({ recordId, metadata, content, attachments })
  }

  async insertRecord(params: {
    sourceId: string
    recordId: string
    record: Record<string, any>
  }) {
    return this.unbody.services.indexing.insertRecord(params)
  }

  async updateRecord(params: {
    sourceId: string
    recordId: string
    record: Record<string, any>
  }) {
    return this.unbody.services.indexing.updateRecord(params)
  }

  async patchRecord(params: {
    sourceId: string
    recordId: string
    payload: Record<string, any>
  }) {
    return this.unbody.services.indexing.patchRecord(params)
  }

  async getRecord(params: { sourceId: string; recordId: string }) {
    return this.unbody.services.indexing.getRecord(params)
  }

  async deleteRecord(params: {
    sourceId: string
    recordId: string
    collection: string
  }) {
    return this.unbody.services.indexing.deleteRecord(params)
  }

  async patchObject(params: {
    sourceId: string
    objectId: string
    collection: string
    payload: Record<string, any>
  }) {
    return this.unbody.services.indexing.patchObject(params)
  }

  async downloadRecordFile({
    sourceId,
    recordId,
    result,
  }: {
    recordId: string
    sourceId: string
    result: ProcessRecordLocalFileResult | ProcessRecordExternalFileResult
  }) {
    const source = await this.indexingService.getSource({ sourceId })

    return this.unbody.services.indexing.downloadRecordFile({
      recordId,
      source,
      result,
    })
  }

  async getFileParsers({ mimeType }: { mimeType: string }) {
    return this.unbody.modules.fileParsers.getParsersByMimeType({ mimeType })
  }

  async downloadRecordAttachment({
    sourceId,
    recordId,
    attachment,
  }: {
    recordId: string
    sourceId: string
    attachment: ProcessRecordContentResult['attachments'][number]
  }) {
    const source = await this.indexingService.getSource({ sourceId })

    return this.unbody.services.indexing.downloadRecordAttachment({
      recordId,
      source,
      attachment,
    })
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
    return this.unbody.services.indexing.changeFileVisibility({
      id: fileId,
      recordId: recordId,
      sourceId: sourceId,
      visibility: 'public',
    })
  }
}
