import { gaxios } from 'google-auth-library'
import { driveactivity_v2, google } from 'googleapis'
import { ReadStream, createReadStream, createWriteStream } from 'node:fs'
import * as path from 'node:path'
import * as uuid from 'uuid'
import { z } from 'zod'
import {
  JobSchedulerConsumer,
  PluginContext,
  PluginLifecycle,
  WebhookConsumer,
} from '../../lib/plugins-common'
import {
  ConnectParams,
  ConnectResult,
  GetRecordMetadataParams,
  GetRecordMetadataResult,
  GetRecordParams,
  GetRecordResult,
  HandleEntryPointUpdateResult,
  HandleEntrypointUpdateParams,
  HandleSourceUpdateParams,
  HandleSourceUpdateResult,
  IndexingEvent,
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
import { Job } from '../../lib/plugins-common/resources/job-scheduler'
import {
  Webhook,
  WebhookEvent,
} from '../../lib/plugins-common/resources/webhook-registry'
import { settle } from './async.utils'
import { GoogleOAuth, getOAuth2Client } from './auth'
import {
  Config,
  Context,
  SourceData,
  SourceEntrypoint,
  SourceState,
} from './plugin.types'
import { GOOGLE_DRIVE_FOLDER_MIME_TYPE, GOOGLE_DRIVE_SCOPES } from './shared'
import {
  createAssetDownloader,
  exportFile,
  flattenFileList,
  generateFileMetadata,
  getFileMetadata,
  listDrives,
  listFilesInFolder,
  listFolders,
  promisifyStreamPipeline,
} from './utils'

const configSchema = z
  .object({
    clientSecret: z.object({
      web: z.object({
        client_id: z.string(),
        project_id: z.string(),
        auth_uri: z.string(),
        token_uri: z.string(),
        auth_provider_x509_cert_url: z.string(),
        client_secret: z.string(),
        redirect_uris: z.array(z.string()),
        javascript_origins: z.array(z.string()),
      }),
    }),

    redirectUri: z.string().optional(),
    scopes: z.array(z.string()).optional().default(GOOGLE_DRIVE_SCOPES),
  })
  .required()

export class GoogleDriveProvider
  implements
    PluginLifecycle<PluginContext, Config>,
    ProviderPlugin<Context>,
    JobSchedulerConsumer<Context>,
    WebhookConsumer<Context>
{
  config!: Config

  schemas: ProviderPlugin['schemas'] = {
    config: configSchema,
  }

  constructor() {}

  initialize = async (config: Config) => {
    this.config = config
  }

  bootstrap = async (ctx: PluginContext) => {}

  destroy = async (ctx: PluginContext) => {}

  listEntrypointOptions = async (
    ctx: Context,
    params: ListEntrypointOptionsParams,
  ): Promise<ListEntrypointOptionsResult> => {
    const auth = await this._getAuth(ctx.source)

    if (params.parent) {
      const folders = await listFolders({ auth, parent: params.parent.id })

      return {
        type: 'list',
        options: folders.map((folder) => ({
          id: folder.id,
          name: folder.name,
          expandable: true,
          selectable: true,
          description: '',
          typeLabel: 'Folder',
          typeDescription: 'Google Drive Folder',
        })),
      }
    }

    const drives = await listDrives({ auth })

    return {
      type: 'list',
      options: [
        {
          id: 'root',
          name: 'My Drive',
          expandable: true,
          selectable: false,
          description: '',
          typeLabel: 'Drive',
          typeDescription: 'Google Drive',
        },
        ...drives.map((drive) => ({
          id: drive.id,
          name: drive.name,
          expandable: true,
          selectable: false,
          description: '',
          typeLabel: 'Drive',
          typeDescription: 'Google Drive',
        })),
      ],
    }
  }

  handleEntrypointUpdate = async (
    ctx: Context,
    params: HandleEntrypointUpdateParams,
  ): Promise<HandleEntryPointUpdateResult<SourceEntrypoint>> => {
    const { entrypoint } = params

    if (!entrypoint || entrypoint.type !== 'option' || !entrypoint.option?.id)
      throw new ProviderPlugin.Exceptions.InvalidEntrypoint(
        'Invalid entrypoint',
      )

    if (!ctx.source.credentials || !ctx.source.credentials.refreshToken) {
      throw new ProviderPlugin.Exceptions.NotConnected('')
    }

    const auth = await this._getAuth(ctx.source)

    const [res, err] = await settle(() =>
      google.drive({ version: 'v3', auth }).files.get({
        fields: '*',
        supportsAllDrives: true,
        fileId: entrypoint.option.id,
      }),
    )

    if (err) {
      const error = err as gaxios.GaxiosError

      if (error.response && error.status === 404)
        throw new ProviderPlugin.Exceptions.InvalidEntrypoint(
          'Invalid entrypoint: file not found',
        )

      throw err
    }

    const file = res.data

    if (file.mimeType !== 'application/vnd.google-apps.folder')
      throw new ProviderPlugin.Exceptions.InvalidEntrypoint(
        'Invalid entrypoint: not a folder',
      )

    return {
      entrypoint: {
        id: file.id!,
        name: file.name!,
        driveId: file.driveId! || 'root',
      },
    }
  }

  validateEntrypoint = async (
    ctx: Context,
    params: ValidateEntrypointParams<SourceEntrypoint | undefined>,
  ): Promise<ValidateEntrypointResult<SourceEntrypoint>> => {
    const entrypoint = params.entrypoint || ctx.source.entrypoint

    if (!entrypoint || !entrypoint.id || !entrypoint.driveId) {
      throw new ProviderPlugin.Exceptions.InvalidEntrypoint(
        'Invalid entrypoint',
      )
    }

    if (!ctx.source.credentials || !ctx.source.credentials.refreshToken) {
      throw new ProviderPlugin.Exceptions.NotConnected('')
    }

    const auth = await this._getAuth(ctx.source)

    const [res, err] = await settle(() =>
      google.drive({ version: 'v3', auth }).files.get({
        fields: '*',
        supportsAllDrives: true,
        fileId: entrypoint.id,
      }),
    )

    if (err) {
      const error = err as gaxios.GaxiosError

      if (error.response && error.status === 404)
        throw new ProviderPlugin.Exceptions.InvalidEntrypoint(
          'Invalid entrypoint: file not found',
        )

      throw err
    }

    const file = res.data

    if (file.mimeType !== 'application/vnd.google-apps.folder')
      throw new ProviderPlugin.Exceptions.InvalidEntrypoint(
        'Invalid entrypoint: not a folder',
      )

    if (file.trashed)
      throw new ProviderPlugin.Exceptions.InvalidEntrypoint(
        'Invalid entrypoint: folder is deleted',
      )

    return {
      entrypoint,
    }
  }

  connect = async (
    ctx: Context,
    params: ConnectParams,
  ): Promise<ConnectResult> => {
    const auth = new GoogleOAuth(this.config.clientSecret, null, {
      defaultAuthUrlOptions: {
        scope: GOOGLE_DRIVE_SCOPES,
        redirect_uri: this.config.redirectUri,
        access_type: 'offline',
        prompt: 'consent',
      },
    })

    const url = await auth.generateAuthUrl({
      ...(this.config.scopes ? { scope: this.config.scopes } : {}),
      ...(params.redirectUrl ? { redirect_uri: params.redirectUrl } : {}),
      ...(params.state
        ? { state: new URLSearchParams(params.state).toString() }
        : {}),
    })

    return {
      redirectUrl: url,
    }
  }

  verifyConnection = async (
    ctx: Context,
    params: VerifyConnectionParams,
  ): Promise<VerifyConnectionResult> => {
    const auth = new GoogleOAuth(this.config.clientSecret, null)

    if (params.payload) {
      const [res, err] = await settle(() => auth.getToken(params.payload!.code))

      if (err) {
        const error = err as gaxios.GaxiosError

        if (error.response?.data?.error) {
          throw new ProviderPlugin.Exceptions.InvalidConnection(
            `${error.response.data.error} - ${error.response.data.error_description}`,
          )
        }

        throw err
      }

      return {
        isValid: true,
        credentials: {
          refreshToken: res.tokens.refresh_token,
        },
      }
    } else if (ctx.source.credentials) {
      await this._getAuth(ctx.source)

      return {
        isValid: true,
      }
    }

    return {
      isValid: false,
    }
  }

  initSource = async (
    ctx: Context,
    params: InitSourceParams,
  ): Promise<InitSourceResult<SourceState>> => {
    const events: IndexingEvent[] = []
    let lastUpdate: Date | undefined

    const auth = await this._getAuth(ctx.source)

    const files = await listFilesInFolder({
      auth,
      folderId: ctx.source.entrypoint.id,
      recursive: true,
    }).then((files) =>
      flattenFileList(files).filter(
        (file) =>
          file.mimeType !== GOOGLE_DRIVE_FOLDER_MIME_TYPE && !file.trashed,
      ),
    )

    for (const file of files) {
      if (params.maxRecords && events.length >= params.maxRecords) break

      events.push({
        eventName: 'created',
        recordId: file.id,
        recordType: '',
        dependsOn: [],
        metadata: generateFileMetadata({ file }),
      })

      if (!lastUpdate || new Date(file.modifiedTime) > lastUpdate)
        lastUpdate = new Date(file.modifiedTime)
    }

    return {
      status: 'ready',
      events: events,
      sourceState: {
        lastEventTimestamp: lastUpdate ? lastUpdate.toJSON() : undefined,
      },
    }
  }

  handleSourceUpdate = async (
    ctx: Context,
    params: HandleSourceUpdateParams,
  ): Promise<HandleSourceUpdateResult<SourceState>> => {
    const auth = await this._getAuth(ctx.source)

    const startTime = new Date()

    const activities: driveactivity_v2.Schema$DriveActivity[] = []
    let nextPageToken: string = ''

    if (!ctx.source.entrypoint.id)
      throw new ProviderPlugin.Exceptions.InvalidEntrypoint('')

    if (!ctx.source.state.lastEventTimestamp) {
      return {
        status: 'ready',
        events: [],
        sourceState: ctx.source.state || {},
      }
    }

    while (true) {
      const result = await google
        .driveactivity({ version: 'v2', auth })
        .activity.query({
          requestBody: {
            pageToken: nextPageToken,
            ancestorName: `items/${ctx.source.entrypoint.id}`,
            filter: `time > "${ctx.source.state.lastEventTimestamp}" AND time <= ${+startTime}`,
          },
          fields: '*',
        })

      const { data } = result

      data.activities && activities.push(...data.activities)

      if (!data.nextPageToken) break
      nextPageToken = data.nextPageToken
    }

    const sorted = activities.reverse().flatMap((activity) => {
      const targets = (activity.targets || [])
        .map((target) => ({
          ...target,
          id: target.driveItem?.name?.split('/')?.[1] || '',
        }))
        .filter((target) => !!target.id)

      return targets.map((target) => ({
        ...target,
        timestamp: activity.timestamp,
        event:
          activity.primaryActionDetail?.move ||
          activity.primaryActionDetail?.rename
            ? 'moved'
            : activity.primaryActionDetail?.create ||
                activity.primaryActionDetail?.restore
              ? 'created'
              : activity.primaryActionDetail?.edit
                ? 'updated'
                : activity.primaryActionDetail?.delete
                  ? 'deleted'
                  : 'unknown',
      }))
    })

    const state: Record<
      string,
      {
        timestamp: string
        deleted?: boolean
        patched?: boolean
        updated?: boolean
        created?: boolean
      }
    > = {}

    for (const activity of sorted) {
      const { id, event, driveItem } = activity

      if (!event || event === 'unknown') continue

      if (driveItem?.folder && event === 'moved') {
        const files = await listFilesInFolder({
          auth,
          folderId: id,
          recursive: true,
        }).then((files) =>
          flattenFileList(files).filter(
            (file) => file.mimeType !== GOOGLE_DRIVE_FOLDER_MIME_TYPE,
          ),
        )
        files.forEach((file) => {
          state[file.id] = {
            ...(state[file.id] || {}),
            timestamp:
              activity.timestamp || ctx.source.state.lastEventTimestamp!,
            patched: true,
          }
        })
      }

      if (!state[id])
        state[id] = {
          timestamp: activity.timestamp || ctx.source.state.lastEventTimestamp,
        }

      const rs = state[id]!
      rs.timestamp = activity.timestamp || rs.timestamp
      if (event === 'deleted') rs.deleted = true

      if (event === 'moved') rs.patched = true
      else if (event === 'updated') rs.updated = true
      else if (event === 'created') {
        rs.created = true
        rs.deleted = false
      }
    }

    const events: IndexingEvent[] = []

    let lastUpdate: Date | undefined

    for (const [id, rs] of Object.entries(state)) {
      events.push({
        eventName: rs.created
          ? 'created'
          : rs.updated
            ? 'updated'
            : rs.deleted
              ? 'deleted'
              : 'patched',
        recordId: id,
        recordType: '',
        dependsOn: [],
      })

      if (!lastUpdate || new Date(rs.timestamp) > lastUpdate)
        lastUpdate = new Date(rs.timestamp)
    }

    return {
      status: 'ready',
      events: events,
      sourceState: {
        lastEventTimestamp: lastUpdate
          ? lastUpdate.toJSON()
          : ctx.source.state.lastEventTimestamp,
      },
    }
  }

  getRecordMetadata = async (
    ctx: Context,
    params: GetRecordMetadataParams,
  ): Promise<GetRecordMetadataResult> => {
    const auth = await this._getAuth(ctx.source)

    return {
      metadata: await getFileMetadata({
        auth,
        fileId: params.recordId,
        rootFolderId: ctx.source.entrypoint.id,
      }),
    }
  }

  getRecord = async (
    ctx: Context,
    params: GetRecordParams,
  ): Promise<GetRecordResult> => {
    const auth = await this._getAuth(ctx.source)

    const metadata = await getFileMetadata({
      auth,
      fileId: params.recordId,
      rootFolderId: ctx.source.entrypoint.id,
    })

    const fileStorage = await ctx.getResource('fileStorage')

    const mimeType = metadata.mimeType
    const uniqueId = uuid.v4()

    if (mimeType === 'application/vnd.google-apps.document') {
      const res = await exportFile({
        auth,
        fileId: metadata.id,
        mimeType: 'application/zip',
      })
      const readStream = res.data

      await promisifyStreamPipeline(
        readStream as ReadStream,
        createWriteStream(path.join(ctx.tempDir, `${uniqueId}.zip`)),
      )

      await fileStorage.upload(
        uniqueId,
        createReadStream(path.join(ctx.tempDir, `${uniqueId}.zip`)),
        {
          contentType: 'application/zip',
        },
      )

      return {
        status: 'ready',
        result: {
          type: 'file',
          metadata: metadata,
          mimeType: metadata.mimeType,
          fileReference: {
            key: uniqueId,
            isExternal: false,
            mimeType: 'application/zip',
          },
        },
      }
    } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      const res = await exportFile({
        auth,
        fileId: metadata.id,
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const readStream = res.data

      await promisifyStreamPipeline(
        readStream as ReadStream,
        createWriteStream(path.join(ctx.tempDir, `${uniqueId}`)),
      )

      await fileStorage.upload(
        uniqueId,
        createReadStream(path.join(ctx.tempDir, `${uniqueId}`)),
        {
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      )

      return {
        status: 'ready',
        result: {
          type: 'file',
          metadata: metadata,
          mimeType: metadata.mimeType,
          fileReference: {
            key: uniqueId,
            isExternal: false,
            mimeType:
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        },
      }
    }

    await createAssetDownloader({
      auth,
      fileId: metadata.id,
    })(path.join(ctx.tempDir, `${uniqueId}`))

    await fileStorage.upload(
      uniqueId,
      createReadStream(path.join(ctx.tempDir, `${uniqueId}`)),
      {
        contentType: metadata.mimeType,
      },
    )

    return {
      status: 'ready',
      result: {
        type: 'file',
        metadata: metadata,
        mimeType: metadata.mimeType,
        fileReference: {
          key: uniqueId,
          isExternal: false,
          mimeType: metadata.mimeType,
        },
      },
    }
  }

  processRecord = async (
    ctx: Context,
    params: ProcessRecordParams,
  ): Promise<ProcessRecordResult> => {
    return {
      record: {
        ...params.metadata,
        ...params.content,
        remoteId: params.metadata.id,
      },
    }
  }

  private _getAuth = async (source: SourceData) => {
    const client = getOAuth2Client(
      this.config.clientSecret,
      source.credentials!,
    )

    if (source) {
      const [res, err] = await settle(() => client.getAccessToken())
      if (err) {
        const error = err as gaxios.GaxiosError
        if (
          error.response?.status &&
          error.response?.status >= 400 &&
          error.response?.status < 500
        ) {
          throw new ProviderPlugin.Exceptions.InvalidConnection(
            `${error.response.data.error} - ${error.response.data.error_description}`,
          )
        }
      }
    }

    return client
  }

  registerObserver = async (
    ctx: Context,
    params: RegisterObserverParams,
  ): Promise<RegisterObserverResult> => {
    await this._registerWebhook(ctx)

    return {}
  }

  unregisterObserver = async (
    ctx: Context,
    params: UnregisterObserverParams,
  ): Promise<UnregisterObserverResult> => {
    await this._deleteWebhook(ctx)

    return {}
  }

  onExecuteJob = async (ctx: Context, job: Job) => {
    if (job.name === 'renew-channel') {
      await this._deleteWebhook(ctx)
      await this.registerObserver(ctx, {})
    }
  }

  onWebhookEvent = async (
    ctx: Context,
    webhook: Webhook,
    event: WebhookEvent,
  ) => {
    const webhookRegistry = await ctx.getResource('webhookRegistry')

    if (webhook.scope === 'source') {
      if (webhook.key === 'notification-channel') {
        const { secret } = await webhookRegistry.getSecret(webhook)
        const token = event.headers['x-goog-channel-token']
        if (token !== secret) return

        await ctx.dispatchEvent(
          new ProviderPlugin.Events.SourceUpdated({
            idempotencyKey: uuid.v4(),
            sourceId: ctx.source.id,
          }),
        )
      }
    }
  }

  private _deleteWebhook = async (ctx: Context) => {
    const jobScheduler = await ctx.getResource('jobScheduler')
    const webhookRegistry = await ctx.getResource('webhookRegistry')

    await jobScheduler.cancelAll('source')

    const auth = await this._getAuth(ctx.source)

    const webhook = await webhookRegistry.get('notification-channel', 'source')
    if (webhook) {
      const metadata = webhook.metadata || {}
      const channelId = metadata.channelId

      await google.drive({ version: 'v3', auth }).channels.stop({
        requestBody: {
          id: channelId,
        },
      })
    }

    await webhookRegistry.deleteAll('source')
  }

  private _registerWebhook = async (ctx: Context) => {
    const jobScheduler = await ctx.getResource('jobScheduler')
    const webhookRegistry = await ctx.getResource('webhookRegistry')

    const auth = await this._getAuth(ctx.source)

    await webhookRegistry.deleteAll('source')
    await jobScheduler.cancelAll('source')

    const webhook = await webhookRegistry.create({
      metadata: {},
      scope: 'source',
      key: 'notification-channel',
      description: 'Google Drive notification channel',
    })

    const { secret } = await webhookRegistry.getSecret(webhook)

    const {
      data: { startPageToken: pageToken },
    } = await google
      .drive({ version: 'v3', auth })
      .changes.getStartPageToken({ auth })

    const channel = await google.drive({ version: 'v3', auth }).changes.watch({
      pageToken: pageToken!,
      fields: '*',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      requestBody: {
        id: webhook.id,
        type: 'webhook',
        token: secret,
        address: webhook.url,
        resourceId: ctx.source.entrypoint.id,
        expiration: (+new Date() + 1000 * 60 * 60 * 24 * 7) as any,
      },
    })

    const channelData = channel.data

    await webhookRegistry.updateById(webhook.id, {
      metadata: {
        channelId: channelData.id,
        resourceId: channelData.resourceId,
        expiration: channelData.expiration,
      },
    })

    if (channelData.expiration) {
      const expiration = new Date(+channelData.expiration)

      await jobScheduler.schedule({
        scope: 'source',
        name: 'renew-channel',
        schedule: +expiration,
        payload: {
          channelId: channelData.id,
          resourceId: channelData.resourceId,
        },
      })
    }
  }
}
