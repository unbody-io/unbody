import { PluginEventEmitter } from './event-emitter'
import { PluginCacheStore } from './cache-store/PluginCacheStore'
import { PluginDatabase } from './database/PluginDatabase'
import { PluginFileStorage } from './file-store/PluginFileStorage'
import { PluginJobScheduler } from './job-scheduler/PluginJobScheduler'
import { PluginWebhookRegistry } from './webhook-registry/PluginWebhookRegistry'

export class PluginResources {
  constructor(
    public eventEmitter: PluginEventEmitter,
    public cacheStore: PluginCacheStore,
    public fileStorage: PluginFileStorage,
    public jobScheduler: PluginJobScheduler,
    public webhookRegistry: PluginWebhookRegistry,
    public database: PluginDatabase,
  ) {}
}
