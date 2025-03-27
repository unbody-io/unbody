import { CacheStoreAPI } from '../resources/cache-store'
import { DatabaseAPI } from '../resources/database'
import { FileStorageAPI } from '../resources/file-store'
import { JobSchedulerAPI } from '../resources/job-scheduler'
import { LoggerAPI } from '../resources/logger'
import { WebhookRegistryAPI } from '../resources/webhook-registry'
import { PluginEvent } from './events/PluginEvent'

type Resources = {
  database: DatabaseAPI
  cacheStore: CacheStoreAPI
  fileStorage: FileStorageAPI
  jobScheduler: JobSchedulerAPI
  webhookRegistry: WebhookRegistryAPI
}

export namespace PluginContext {
  export type EventDispatcher<T extends PluginEvent<any, any>> = (
    event: T,
  ) => Promise<void>
}

export interface PluginContext {
  id: string

  logger: LoggerAPI

  getResource: <T extends keyof Resources>(name: T) => Promise<Resources[T]>
  dispatchEvent: PluginContext.EventDispatcher<PluginEvent<any, any>>
}
