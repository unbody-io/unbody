import { settle } from 'src/lib/core-utils'
import { PluginEvent } from 'src/lib/plugins-common'
import {
  CacheStoreAPI,
  DatabaseAPI,
  FileStorageAPI,
  JobSchedulerAPI,
  LoggerAPI,
  WebhookRegistryAPI,
} from 'src/lib/plugins-common/resources'
import { PluginResources } from '../resources/PluginResources'
import { LoadedPlugin } from '../shared.types'

export type PluginInstanceBaseConfig = {
  logger?: LoggerAPI
}

export type PluginInstanceMethods<T> = {
  [K in keyof T]: Required<T>[K] extends (...args: any[]) => any
    ? Parameters<Required<T>[K]> extends [any, ...infer U]
      ? (...args: U) => ReturnType<Required<T>[K]>
      : () => ReturnType<Required<T>[K]>
    : never
}

export class PluginInstance<
  C extends PluginInstanceBaseConfig = PluginInstanceBaseConfig,
> {
  private _database: DatabaseAPI | undefined = undefined
  private _cacheStore: CacheStoreAPI | undefined = undefined
  private _fileStorage: FileStorageAPI | undefined = undefined
  private _jobScheduler: JobSchedulerAPI | undefined = undefined
  private _webhookRegistry: WebhookRegistryAPI | undefined = undefined

  constructor(
    protected readonly config: C,
    protected readonly plugin: LoadedPlugin,
    protected readonly resources: PluginResources,
    protected readonly methods: string[] = [],
  ) {
    for (const method of this.methods || []) {
      ;(this as any)[method] = this.runTask(method as string)
    }
  }

  get type() {
    return this.plugin.manifest.type
  }

  get fileStorage() {
    const pluginId = this.plugin.id

    if (!this._fileStorage) {
      this._fileStorage = {
        get: (key) => this.resources.fileStorage.get({ pluginId }, { key }),
        delete: (key) =>
          this.resources.fileStorage.delete({ pluginId }, { key }),
        download: (key) =>
          this.resources.fileStorage.download({ pluginId }, { key }),
        list: (options) =>
          this.resources.fileStorage.list({ pluginId }, { options }),
        upload: (key, file, options) =>
          this.resources.fileStorage.upload(
            { pluginId },
            { key, file, options },
          ),
      }
    }

    return this._fileStorage
  }

  get database() {
    const pluginId = this.plugin.id

    if (!this._database) {
      this._database = {
        createCollection: (...args) =>
          this.resources.database.createCollection({ pluginId }, ...args),
        dropCollection: (...args) =>
          this.resources.database.dropCollection({ pluginId }, ...args),
        getCollection: (...args) =>
          this.resources.database.getCollection({ pluginId }, ...args),
        listCollections: () =>
          this.resources.database.listCollections({ pluginId }),
        withTransaction: (...args) =>
          this.resources.database.withTransaction({ pluginId }, ...args) as any,
      }
    }

    return this._database
  }

  get jobScheduler() {
    const pluginId = this.plugin.id

    if (!this._jobScheduler) {
      const transformJob = (job: any) => {
        return {
          id: job.id,
          name: job.name,
          retries: job.retries || 0,
          schedule: job.schedule,
          status: job.status,
          createdAt: job.createdAt,
          error: job.error,
          every: job.every,
          lastFinishedAt: job.lastFinishedAt,
          lastRunAt: job.lastRunAt,
          nextRunAt: job.nextRunAt,
          payload: job.payload,
          retryOptions: job.retryOptions,
          scope: job.scope,
        }
      }

      this._jobScheduler = {
        get: (jobId) =>
          this.resources.jobScheduler
            .get({ pluginId }, { jobId })
            .then((job) => {
              if (!job) throw new Error('Job not found')

              return transformJob(job)
            }),
        cancel: (jobId) =>
          this.resources.jobScheduler.cancel({ pluginId }, { jobId }),
        cancelAll: (scope) => {
          const sourceId = this.config['source']?.['id']
          return this.resources.jobScheduler.cancelAll(
            { pluginId, sourceId: scope === 'source' ? sourceId : undefined },
            { scope },
          )
        },
        list: (options) => {
          const sourceId = this.config['source']?.['id']
          return this.resources.jobScheduler
            .list(
              {
                pluginId,
                sourceId: options?.scope === 'source' ? sourceId : undefined,
              },
              { ...(options || {}) },
            )
            .then((res) => ({
              cursor: res.cursor,
              jobs: res.jobs.map(transformJob),
            }))
        },
        schedule: (job) => {
          const sourceId = this.config['source']?.['id']
          return this.resources.jobScheduler
            .schedule(
              {
                pluginId,
                sourceId: job.scope === 'source' ? sourceId : undefined,
              },
              {
                job,
              },
            )
            .then(transformJob)
        },
      }
    }

    return this._jobScheduler
  }

  get webhookRegistry() {
    if (!this._webhookRegistry) {
      const pluginId = this.plugin.id

      const transform = (webhook: any) => {
        if (!webhook) throw new Error('Webhook not found')

        return {
          id: webhook.id,
          key: webhook.key,
          url: webhook.url,
          scope: webhook.scope,
          metadata: webhook.metadata,
          createdAt: webhook.createdAt,
          description: webhook.description,
        }
      }

      this._webhookRegistry = {
        create: (webhook) => {
          const sourceId = this.config['source']?.['id']
          return this.resources.webhookRegistry
            .create(
              {
                pluginId,
                sourceId: webhook.scope === 'source' ? sourceId : undefined,
              },
              { webhook },
            )
            .then(transform)
        },
        delete: (key, scope) => {
          const sourceId = this.config['source']?.['id']
          return this.resources.webhookRegistry.delete(
            { pluginId, sourceId: scope === 'source' ? sourceId : undefined },
            { key, scope: scope || 'global' },
          )
        },
        deleteAll: (scope) => {
          const sourceId = this.config['source']?.['id']
          return this.resources.webhookRegistry.deleteAll(
            { pluginId, sourceId: scope === 'source' ? sourceId : undefined },
            {
              scope: scope,
            },
          )
        },
        deleteById: (id) =>
          this.resources.webhookRegistry.deleteById({ pluginId }, { id }),
        get: (key, scope) => {
          const sourceId = this.config['source']?.['id']
          return this.resources.webhookRegistry
            .get(
              { pluginId, sourceId: scope === 'source' ? sourceId : undefined },
              { key, scope: scope || 'global' },
            )
            .then(transform)
        },
        getById: (id) =>
          this.resources.webhookRegistry
            .getById({ pluginId }, { id })
            .then((res) => transform(res)),
        getSecret: (webhook) => {
          const sourceId = this.config['source']?.['id']
          return this.resources.webhookRegistry
            .getSecret({ pluginId, sourceId }, { webhook })
            .then((res) => ({
              secret: res,
            }))
        },
        update: (key, payload, scope) => {
          const sourceId = this.config['source']?.['id']

          return this.resources.webhookRegistry
            .update(
              {
                pluginId,
                sourceId: sourceId,
              },
              { key: key, payload, scope: scope || 'global' },
            )
            .then((res) => transform(res))
        },
        updateById: (id, payload) => {
          return this.resources.webhookRegistry
            .updateById({ pluginId }, { id, payload })
            .then((res) => transform(res))
        },
        list: (options) => {
          const sourceId = this.config['source']?.['id']
          return this.resources.webhookRegistry
            .list(
              {
                pluginId,
                sourceId: options?.scope === 'source' ? sourceId : undefined,
              },
              {
                options: {
                  ...(options || {}),
                },
              },
            )
            .then((res) => ({
              cursor: res.cursor,
              webhooks: res.webhooks.map(transform),
            }))
        },
      }
    }

    return this._webhookRegistry
  }

  get cacheStore() {
    if (!this._cacheStore) {
      const pluginId = this.plugin.id

      this._cacheStore = {
        clear: () => this.resources.cacheStore.clear({ pluginId }),
        delete: (key) =>
          this.resources.cacheStore
            .delete({ pluginId }, key)
            .then((res) => undefined),
        get: (key, options) =>
          this.resources.cacheStore.get({ pluginId }, key, options),
        has: (key) => this.resources.cacheStore.has({ pluginId }, key),
        keys: () => this.resources.cacheStore.keys({ pluginId }),
        set: (key, value, options) =>
          this.resources.cacheStore
            .set({ pluginId }, key, value, options)
            .then((res) => undefined),
      }
    }

    return this._cacheStore
  }

  protected _getResource = async (resource: string) => {
    if (resource === 'database') return this.database
    else if (resource === 'fileStorage') return this.fileStorage
    else if (resource === 'jobScheduler') return this.jobScheduler
    else if (resource === 'webhookRegistry') return this.webhookRegistry
    else if (resource === 'cacheStore') return this.cacheStore

    throw new Error(`Unknown resource: ${resource}`)
  }

  protected _runTask = async <
    T extends Record<string, any> = Record<string, any>,
    R extends Record<string, any> = Record<string, any>,
  >(
    task: string,
    context: any,
    params: T,
  ) => {
    return this.plugin.runner.runTask<T, R>(task, context, params)
  }

  runTask = <
    T extends Record<string, any> = Record<string, any>,
    R extends Record<string, any> = Record<string, any>,
  >(
    task: string,
  ) => {
    return async (params: T): Promise<R> => {
      const tmpDir = await this.plugin.runner.createTempDir()

      const [res, err] = await settle(() =>
        this._runTask<T, R>(
          task,
          {
            id: this.plugin.id,
            tempDir: tmpDir.path,
            logger: this.config.logger || console,
            getResource: this._getResource,
            dispatchEvent: (event: PluginEvent<any, any>) =>
              this.resources.eventEmitter.emit(
                'event',
                event,
                this.plugin.id,
                this.plugin.alias,
                this.plugin.manifest.type,
              ),
          },
          params,
        ),
      )

      await tmpDir.cleanup()

      if (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        throw error
      }

      return res
    }
  }
}
