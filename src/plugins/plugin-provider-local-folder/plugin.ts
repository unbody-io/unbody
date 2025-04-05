import * as fs from 'fs'
import * as path from 'path'
import { settle } from 'src/lib/core-utils'
import * as uuid from 'uuid'
import { z } from 'zod'
import zodToJsonSchema from 'zod-to-json-schema'
import { PluginContext, PluginLifecycle } from '../../lib/plugins-common'
import {
  ConnectParams,
  ConnectResult,
  GetRecordMetadataParams,
  GetRecordMetadataResult,
  GetRecordParams,
  GetRecordResult,
  HandleEntrypointUpdateParams,
  HandleEntryPointUpdateResult,
  HandleSourceUpdateParams,
  HandleSourceUpdateResult,
  InitSourceParams,
  InitSourceResult,
  ListEntrypointOptionsParams,
  ListEntrypointOptionsResult,
  ProcessRecordParams,
  ProcessRecordResult,
  ProviderPlugin,
  RegisterObserverParams,
  RegisterObserverResult,
  UnregisterObserverParams,
  UnregisterObserverResult,
  ValidateEntrypointParams,
  ValidateEntrypointResult,
  VerifyConnectionParams,
  VerifyConnectionResult,
} from '../../lib/plugins-common/provider'
import {
  Config,
  Context,
  EventDocument,
  RecordMetadata,
  SourceCredentials,
  SourceEntrypoint,
  SourceState,
} from './plugin.types'
import { getFileMetadata, scanFolder, watchForChanges } from './utils'

const configSchema = z.object({})
const entrypointSchema = z.object({
  directory: z.string(),
  maxDepth: z.number().min(1).optional().default(1),
})

export class LocalFolderProvider
  implements PluginLifecycle<PluginContext, Config>, ProviderPlugin<Context>
{
  config!: Config

  schemas: ProviderPlugin['schemas'] = {
    config: configSchema,
  }

  private _watchers: Record<string, { stop: () => Promise<void> }> = {}

  constructor() {}

  init = async () => {}

  initialize = async (config: Config) => {
    this.config = config
  }

  bootstrap = async (ctx: Context) => {
    const sourcesCollection = await this._sourcesCollection(ctx)
    const eventsCollection = await this._eventsCollection(ctx)

    await sourcesCollection.createIndex(
      {
        id: 1,
        lockedAt: 1,
      },
      {},
    )

    await eventsCollection.createIndex(
      {
        sourceId: 1,
        recordId: 1,
      },
      {},
    )

    await eventsCollection.createIndex(
      {
        timestamp: 1,
      },
      {},
    )
  }

  destroy = async (ctx: PluginContext) => {}

  startService = async (ctx: Context) => {
    const sourcesCollection = await this._sourcesCollection(ctx)

    while (true) {
      const sources = await sourcesCollection.find({}).toArray()

      const sourceIds = sources.map((source) => source.sourceId)

      const watchers = Object.keys(this._watchers)

      for (const sourceId of watchers) {
        if (!sourceIds.includes(sourceId)) {
          await this._watchers[sourceId].stop()
          delete this._watchers[sourceId]
        }
      }

      for (const source of sources) {
        if (this._watchers[source.sourceId]) continue
        const watcher = await this._watchForChanges(ctx, source.sourceId)
        if (watcher) this._watchers[source.sourceId] = watcher
      }

      await new Promise((resolve) => setTimeout(resolve, 10000))
    }
  }

  stopService = async (ctx: Context) => {
    const sourcesCollection = await this._sourcesCollection(ctx)

    const ids = Object.keys(this._watchers)

    for (const sourceId of ids) {
      await this._watchers[sourceId].stop()
      delete this._watchers[sourceId]
    }

    await sourcesCollection.updateMany(
      {
        sourceId: { $in: ids },
      },
      {
        $set: {
          lockedAt: null,
        },
      },
    )
  }

  listEntrypointOptions = async (
    ctx: Context,
    params: ListEntrypointOptionsParams,
  ): Promise<ListEntrypointOptionsResult> => {
    return {
      type: 'form',
      schema: zodToJsonSchema(entrypointSchema),
    }
  }

  handleEntrypointUpdate = async (
    ctx: Context,
    params: HandleEntrypointUpdateParams,
  ): Promise<HandleEntryPointUpdateResult<SourceEntrypoint>> => {
    const { entrypoint } = await this._validateEntrypoint(
      params.entrypoint.type === 'form'
        ? (params.entrypoint.fields as SourceEntrypoint)
        : undefined,
    )

    if (!entrypoint)
      throw new ProviderPlugin.Exceptions.InvalidEntrypoint(
        'Entrypoint is required',
      )

    return {
      entrypoint,
    }
  }

  validateEntrypoint = async (
    ctx: Context,
    params: ValidateEntrypointParams<SourceEntrypoint | undefined>,
  ): Promise<ValidateEntrypointResult<SourceEntrypoint>> => {
    if (params.entrypoint) return this._validateEntrypoint(params.entrypoint)
    return this._validateEntrypoint(ctx.source.entrypoint)
  }

  private _validateEntrypoint = async (
    entrypoint: SourceEntrypoint | undefined,
  ): Promise<{ entrypoint: SourceEntrypoint }> => {
    if (!entrypoint)
      throw new ProviderPlugin.Exceptions.InvalidEntrypoint(
        'Entrypoint is required',
      )

    const { directory, maxDepth } = entrypoint

    const [parsed, err] = await settle(() =>
      entrypointSchema.parseAsync({ directory, maxDepth }),
    )

    if (err) {
      if (err instanceof z.ZodError) {
        throw new ProviderPlugin.Exceptions.InvalidEntrypoint(err.message)
      }

      throw new ProviderPlugin.Exceptions.InvalidEntrypoint(err.message)
    }

    if (!path.isAbsolute(parsed.directory))
      throw new ProviderPlugin.Exceptions.InvalidEntrypoint(
        'Directory must be an absolute path',
      )

    if (!fs.existsSync(parsed.directory))
      throw new ProviderPlugin.Exceptions.InvalidEntrypoint(
        'Directory does not exist',
      )

    if (!fs.lstatSync(parsed.directory).isDirectory())
      throw new ProviderPlugin.Exceptions.InvalidEntrypoint(
        'Directory must be a directory',
      )

    return {
      entrypoint: {
        directory,
        maxDepth,
      },
    }
  }

  connect = async (
    ctx: Context,
    params: ConnectParams,
  ): Promise<ConnectResult> => {
    return {}
  }

  verifyConnection = async (
    ctx: Context,
    params: VerifyConnectionParams,
  ): Promise<VerifyConnectionResult<SourceCredentials>> => {
    return {
      isValid: true,
      credentials: {},
    }
  }

  initSource = async (
    ctx: Context,
    params: InitSourceParams,
  ): Promise<InitSourceResult<SourceState>> => {
    const timestamp = new Date()

    const events = await scanFolder({
      sourceId: ctx.source.id,
      directory: ctx.source.entrypoint.directory,
      maxDepth: ctx.source.entrypoint.maxDepth,
    })

    const eventsCollection = await this._eventsCollection(ctx)
    await eventsCollection.deleteMany({ sourceId: ctx.source.id })
    if (events.length > 0) await eventsCollection.insertMany(events)

    return {
      status: 'ready',
      events: events.map((event) => ({
        eventName: 'created',
        recordType: 'file',
        recordId: event.recordId,
        metadata: event.metadata,
      })),
      sourceState: {
        lastEventTimestamp: timestamp.toJSON(),
      },
    }
  }

  handleSourceUpdate = async (
    ctx: Context,
    params: HandleSourceUpdateParams,
  ): Promise<HandleSourceUpdateResult<SourceState>> => {
    const eventsCollection = await this._eventsCollection(ctx)
    const changes = await eventsCollection
      .find({
        sourceId: ctx.source.id,
        ...(ctx.source.state.lastEventTimestamp
          ? {
              timestamp: {
                $gt: +new Date(ctx.source.state.lastEventTimestamp),
              },
            }
          : {}),
      })
      .sort({ _id: 1 })
      .limit(params.maxRecords || 500)
      .toArray()
      .then((res) =>
        res.map(
          (ev) =>
            ({
              eventName: ev.eventName,
              filename: ev.filename,
              recordId: ev.recordId,
              sourceId: ev.sourceId,
              timestamp: +ev.timestamp,
              metadata: ev.metadata,
            }) satisfies EventDocument,
        ),
      )

    const recordStates: Record<
      string,
      | {
          recordId: string
          eventName: 'deleted'
          timestamp: number
        }
      | {
          recordId: string
          eventName: 'created' | 'updated'
          timestamp: number
          metadata: RecordMetadata
        }
    > = {}

    for (const change of changes) {
      if (change.eventName === 'deleted') {
        recordStates[change.recordId] = {
          recordId: change.recordId,
          eventName: 'deleted',
          timestamp: change.timestamp,
        }
      } else {
        recordStates[change.recordId] = {
          recordId: change.recordId,
          eventName: change.eventName,
          metadata: change.metadata,
          timestamp: change.timestamp,
        }
      }
    }

    const events: HandleSourceUpdateResult<SourceState>['events'] = []
    Object.values(recordStates).forEach((recordState) => {
      events.push({
        eventName: recordState.eventName,
        recordId: recordState.recordId,
        recordType: 'file',
        metadata:
          recordState.eventName === 'deleted'
            ? undefined
            : recordState.metadata,
      })
    })

    return {
      status: 'ready',
      events: events,
      sourceState: {
        lastEventTimestamp:
          changes.length > 0
            ? new Date(changes[changes.length - 1].timestamp).toJSON()
            : ctx.source.state.lastEventTimestamp,
      },
    }
  }

  getRecordMetadata = async (
    ctx: Context,
    params: GetRecordMetadataParams,
  ): Promise<GetRecordMetadataResult> => {
    const eventsCollection = await this._eventsCollection(ctx)
    const event = await eventsCollection.findOne(
      {
        sourceId: ctx.source.id,
        recordId: params.recordId,
        eventName: { $ne: 'deleted' },
      },
      { sort: ['desc'] },
    )

    if (!event)
      throw new ProviderPlugin.Exceptions.FileNotFound("Record doesn't exist")

    const filename = path.join(ctx.source.entrypoint.directory, event.filename)
    const [stats, err] = await settle(() => fs.promises.stat(filename))

    if (err)
      throw new ProviderPlugin.Exceptions.FileNotFound("Record doesn't exist")

    const metadata = await getFileMetadata(
      ctx.source.entrypoint.directory,
      filename,
      stats,
    )

    return {
      metadata,
    }
  }

  getRecord = async (
    ctx: Context,
    params: GetRecordParams,
  ): Promise<GetRecordResult> => {
    const fileStorage = await ctx.getResource('fileStorage')
    const eventsCollection = await this._eventsCollection(ctx)
    const event = await eventsCollection.findOne(
      {
        sourceId: ctx.source.id,
        recordId: params.recordId,
        eventName: { $ne: 'deleted' },
      },
      {
        sort: ['desc'],
      },
    )

    if (!event)
      throw new ProviderPlugin.Exceptions.FileNotFound("Record doesn't exist")
    const filename = path.join(ctx.source.entrypoint.directory, event.filename)

    const [stats, statsErr] = await settle(() => fs.promises.stat(filename))
    if (statsErr)
      throw new ProviderPlugin.Exceptions.FileNotFound("Record doesn't exist")

    const metadata = await getFileMetadata(
      ctx.source.entrypoint.directory,
      filename,
      stats,
    )

    const fileKey = uuid.v4()
    await fileStorage.upload(fileKey, await fs.promises.readFile(filename), {
      size: metadata.size,
      contentType: metadata.mimeType,
    })

    return {
      status: 'ready',
      result: {
        type: 'file',
        metadata: event.metadata,
        fileReference: {
          key: fileKey,
          mimeType: metadata.mimeType,
          isExternal: false,
        },
        mimeType: metadata.mimeType,
      },
    }
  }

  processRecord = async (
    ctx: Context,
    params: ProcessRecordParams,
  ): Promise<ProcessRecordResult> => {
    return {
      record: {
        ...params.content,
        ...params.metadata,
        remoteId: params.metadata.id,
      },
    }
  }

  registerObserver = async (
    ctx: Context,
    params: RegisterObserverParams,
  ): Promise<RegisterObserverResult> => {
    const sourcesCollection = await this._sourcesCollection(ctx)

    await sourcesCollection.deleteMany({
      sourceId: ctx.source.id,
    })

    await sourcesCollection.insertOne({
      sourceId: ctx.source.id,
      entrypoint: ctx.source.entrypoint,
    })

    return {}
  }

  unregisterObserver = async (
    ctx: Context,
    params: UnregisterObserverParams,
  ): Promise<UnregisterObserverResult> => {
    const sourcesCollection = await this._sourcesCollection(ctx)
    await sourcesCollection.deleteOne({
      sourceId: ctx.source.id,
    })
    const eventsCollection = await this._eventsCollection(ctx)
    await eventsCollection.deleteMany({
      sourceId: ctx.source.id,
    })

    return {}
  }

  private _sourcesCollection = async (ctx: Context) => {
    return ctx.getResource('database').then((db) => db.getCollection('sources'))
  }

  private _watchForChanges = async (ctx: Context, sourceId: string) => {
    const sourcesCollection = await this._sourcesCollection(ctx)
    const eventsCollection = await this._eventsCollection(ctx)

    const source = await sourcesCollection.findOneAndUpdate(
      {
        $or: [
          {
            sourceId,
            lockedAt: null,
          },
          {
            sourceId,
            lockedAt: { $lt: new Date(Date.now() - 1000 * 60) },
          },
        ],
      },
      {
        $set: {
          lockedAt: new Date(),
        },
      },
    )

    if (!source) return

    const interval = setInterval(async () => {
      await sourcesCollection.updateOne(
        {
          sourceId,
        },
        {
          $set: {
            lockedAt: new Date(),
          },
        },
      )
    }, 10000)

    const watcher = await watchForChanges(
      {
        sourceId,
        maxDepth: source.entrypoint.maxDepth,
        directory: source.entrypoint.directory,
      },
      async (event) => {
        const date = new Date()
        date.setMilliseconds(0)

        await eventsCollection.insertOne(event)
        await ctx.dispatchEvent(
          new ProviderPlugin.Events.SourceUpdated({
            sourceId: sourceId,
            idempotencyKey: uuid.v5(date.toJSON(), uuid.v5.URL),
          }),
        )
      },
    )

    return {
      stop: async () => {
        clearInterval(interval)
        await watcher.close()
      },
    }
  }

  private _eventsCollection = async (ctx: Context) => {
    return ctx.getResource('database').then((db) => db.getCollection('events'))
  }
}
