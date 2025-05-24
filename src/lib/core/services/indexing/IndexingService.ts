import axios from 'axios'
import * as _ from 'lodash'
import { UnbodySourceDoc } from 'src/lib/core-types'
import {
  HandleSourceUpdateParams,
  InitSourceParams,
  ProcessRecordContentResult,
  ProcessRecordExternalFileResult,
  ProcessRecordLocalFileResult,
} from 'src/lib/plugins-common/provider'
import { ChangeFileVisibilityParams } from 'src/lib/plugins-common/storage'
import { Modules } from '../../modules'
import { Plugins } from '../../plugins'
import { ProjectContext } from '../../project-context'

export class IndexingService {
  constructor(
    private _ctx: ProjectContext,
    private _plugins: Plugins,
    private _modules: Modules,
  ) {}

  async getDatabase(params: {}) {
    return this._modules.database.getDatabase(params)
  }

  async vectorizeRecord(params: { record: Record<string, any> }) {
    return this._modules.vectorizer.vectorizeObjects(params.record)
  }

  async getRecord(params: {
    sourceId: string
    recordId: string
    collection?: string
  }) {
    const database = await this.getDatabase({})
    const res = await database.getRecord({
      sourceId: params.sourceId,
      recordId: params.recordId,
      collection: params.collection,
    })

    if (!res) return null

    return res.record
  }

  async insertRecord(params: {
    sourceId: string
    recordId: string
    record: Record<string, any>
  }) {
    const database = await this.getDatabase({})
    const vectorized = await this.vectorizeRecord({
      record: params.record,
    })
    return await database.insertRecord({
      sourceId: params.sourceId,
      recordId: params.recordId,
      record: _.omit(vectorized, 'id') as any,
    })
  }

  async updateRecord(params: {
    sourceId: string
    recordId: string
    record: Record<string, any>
  }) {
    const database = await this.getDatabase({})
    const vectorized = await this.vectorizeRecord({
      record: params.record,
    })

    return await database.patchRecord({
      sourceId: params.sourceId,
      recordId: params.recordId,
      record: _.omit(vectorized, 'id') as any,
    })
  }

  async patchRecord(params: {
    sourceId: string
    recordId: string
    payload: Record<string, any>
  }) {
    const { sourceId, recordId, payload } = params

    const database = await this.getDatabase({})

    const existing = await database.getRecord({
      sourceId: sourceId,
      recordId: recordId,
    })

    if (!existing) throw new Error('Record not found')

    const collection = this._ctx.collections.getCollection(
      existing.record.__typename,
    )

    const final: Record<string, any> = {
      ...existing,
    }

    for (const key in payload) {
      const property = collection.properties.find((p) => p.name === key)
      if (!property) continue

      final[key] = payload[key]
    }

    const vectorized = await this.vectorizeRecord({
      record: final,
    })

    const res = await database.patchRecord({
      sourceId,
      recordId,
      record: _.omit(vectorized, 'id') as any,
    })

    return res
  }

  async deleteRecord(params: {
    recordId: string
    sourceId: string
    collection: string
  }) {
    const db = await this.getDatabase({})
    const storage = await this._modules.storage.getStorage({})

    await storage.deleteRecordFiles({
      recordId: params.recordId,
      sourceId: params.sourceId,
    })

    return db.deleteRecord(params)
  }

  async patchObject(params: {
    sourceId: string
    objectId: string
    collection: string
    payload: Record<string, any>
  }) {
    const database = await this.getDatabase({})

    const object = await database.getObject({
      collection: params.collection,
      objectId: params.objectId,
    })

    if (!object) {
      throw new Error('Object not found')
    }

    const collection = this._ctx.collections.getCollection(params.collection)
    const final: Record<string, any> = {
      __typename: params.collection,
    }

    for (const key in object.object) {
      const property = collection.properties.find((p) => p.name === key)
      if (!property || property.type === 'cref') continue
      if (key === 'id') continue

      final[key] = object.object[key]
    }

    for (const key in params.payload) {
      if (
        [
          '_id',
          'id',
          'remoteId',
          'sourceId',
          'createdAt',
          'updatedAt',
        ].includes(key)
      )
        continue

      const property = collection.properties.find((p) => p.name === key)
      if (!property) continue

      final[key] = params.payload[key]
    }

    const vectorized = await this.vectorizeRecord({
      record: final,
    })

    return database.patchObject({
      collection: params.collection,
      sourceId: params.sourceId,
      payload: {
        ...vectorized,
        __typename: params.collection,
        vectors: vectorized.vectors,
      },
      objectId: params.objectId,
    })
  }

  async initSource(
    params: InitSourceParams & {
      provider: string
      source: UnbodySourceDoc
    },
  ) {
    const provider = await this._modules.providers.getProvider({
      provider: params.provider,
      source: params.source,
    })

    return provider.initSource(params)
  }

  async handleSourceUpdate(
    params: HandleSourceUpdateParams & {
      provider: string
      source: UnbodySourceDoc
    },
  ) {
    const provider = await this._modules.providers.getProvider({
      provider: params.provider,
      source: params.source,
    })

    return provider.handleSourceUpdate({
      taskId: params.taskId,
      isManual: params.isManual,
      maxRecords: params.maxRecords,
    })
  }

  async deleteSourceResources(params: {
    provider: string
    source: UnbodySourceDoc
  }) {
    const provider = await this._modules.providers.getProvider({
      provider: params.provider,
      source: params.source,
    })

    const database = await this._modules.database.getDatabase({})
    await database.eraseSourceRecords({ sourceId: params.source.id })

    const storage = await this._modules.storage.getStorage({})

    await storage.deleteSourceFiles({ sourceId: params.source.id })

    const webhookRegistry = provider.webhookRegistry
    webhookRegistry && (await webhookRegistry.deleteAll('source'))

    const jobScheduler = provider.jobScheduler
    jobScheduler && jobScheduler.cancelAll('source')
  }

  async downloadRecordFile(params: {
    source: UnbodySourceDoc
    recordId: string
    result: ProcessRecordLocalFileResult | ProcessRecordExternalFileResult
  }) {
    const provider = await this._modules.providers.getProvider({
      provider: params.source.provider,
      source: params.source,
    })

    const { result } = params

    let res: NodeJS.ReadableStream | Buffer

    if (result.fileReference.isExternal) {
      res = await axios
        .get(result.fileReference.url, {
          responseType: 'stream',
        })
        .then((res) => res.data)
    } else {
      const key = result.fileReference.key
      const fs = provider.fileStorage
      res = await fs.download(key)
    }

    const storage = await this._modules.storage.getStorage({})

    const file = await storage.storeFile({
      file: res,
      sourceId: params.source.id,
      id: params.recordId,
      recordId: params.recordId,
      filename: result.metadata['originalName'] || 'file',
      mimeType: result.fileReference.mimeType,
      visibility: 'private',
    })

    if (!result.fileReference.isExternal) {
      const key = result.fileReference.key
      const fs = provider.fileStorage
      await fs.delete(key)
    }

    return file
  }

  async downloadRecordAttachment(params: {
    recordId: string
    source: UnbodySourceDoc
    attachment: ProcessRecordContentResult['attachments'][number]
  }) {
    const { attachment } = params

    const provider = await this._modules.providers.getProvider({
      source: params.source,
      provider: params.source.provider,
    })

    let res: NodeJS.ReadableStream | Buffer = null as any

    if (attachment.file.isExternal) {
      res = await axios
        .get(attachment.file.url, { responseType: 'stream' })
        .then((res) => res.data)
    } else {
      res = await provider.fileStorage.download(attachment.file.key)
    }

    const storage = await this._modules.storage.getStorage({})

    const file = await storage.storeFile({
      file: res,
      sourceId: params.source.id,
      id: attachment.id,
      recordId: params.recordId,
      filename: attachment.filename,
      mimeType: attachment.contentType,
      visibility: 'private',
    })

    return file
  }

  async changeFileVisibility(params: ChangeFileVisibilityParams) {
    const storage = await this._modules.storage.getStorage({})
    return storage.changeFileVisibility(params).then((res) => res.files[0])
  }
}
