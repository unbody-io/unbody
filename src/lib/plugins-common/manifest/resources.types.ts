export const PluginResourceNames = {
  CacheStore: 'cache_store' as 'cache_store',
  Database: 'database' as 'database',
  FileStorage: 'file_storage' as 'file_storage',
  WebhookRegistry: 'webhook_registry' as 'webhook_registry',
  JobScheduler: 'job_scheduler' as 'job_scheduler',
} as const

export type PluginResourceName =
  (typeof PluginResourceNames)[keyof typeof PluginResourceNames]

export type PluginCacheStoreOptions = {}

export type PluginDatabaseOptions = {}

export type PluginFileStorageOptions = {}

export type PluginWebhookRegistryOptions = {}

export type PluginJobSchedulerOptions = {}

export type PluginResources = Array<
  | PluginResourceName
  | [typeof PluginResourceNames.CacheStore, PluginCacheStoreOptions]
  | [typeof PluginResourceNames.Database, PluginDatabaseOptions]
  | [typeof PluginResourceNames.FileStorage, PluginFileStorageOptions]
  | [typeof PluginResourceNames.WebhookRegistry, PluginWebhookRegistryOptions]
  | [typeof PluginResourceNames.JobScheduler, PluginJobSchedulerOptions]
>
