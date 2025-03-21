import { CacheStoreAPI } from '../resources/cache-store'
import { DatabaseAPI } from '../resources/database'
import { FileStorageAPI } from '../resources/file-store'
import { JobSchedulerAPI } from '../resources/job-scheduler'
import { LoggerAPI } from '../resources/logger'
import { WebhookRegistryAPI } from '../resources/webhook-registry'

type Resources = {
  database: DatabaseAPI
  cacheStore: CacheStoreAPI
  fileStorage: FileStorageAPI
  jobScheduler: JobSchedulerAPI
  webhookRegistry: WebhookRegistryAPI
}

export interface PluginContext {
  id: string

  logger: LoggerAPI

  getResource: <T extends keyof Resources>(name: T) => Promise<Resources[T]>
}
