import { Module, Provider } from '@nestjs/common'
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose'
import { Client as TemporalClient } from '@temporalio/client'
import { Model, Connection as MongooseConnection } from 'mongoose'
import { UnbodyProjectSettingsDoc } from 'src/lib/core-types'
import { ConfigService } from 'src/lib/nestjs-utils'
import { PluginRegistry } from 'src/lib/plugins/registry/PluginRegistry'
import {
  PluginStateCollectionDocument,
  PluginStateCollectionSchema,
  pluginStateCollectionSchema,
} from 'src/lib/plugins/registry/schemas'
import { PluginResources } from 'src/lib/plugins/resources/PluginResources'
import { PluginCacheStore } from 'src/lib/plugins/resources/cache-store/PluginCacheStore'
import { PluginDatabase } from 'src/lib/plugins/resources/database/PluginDatabase'
import { PluginFileStorage } from 'src/lib/plugins/resources/file-store/PluginFileStorage'
import {
  PluginFileCollectionSchema,
  pluginFileCollectionSchema,
} from 'src/lib/plugins/resources/file-store/schemas'
import { PluginJobScheduler } from 'src/lib/plugins/resources/job-scheduler/PluginJobScheduler'
import {
  pluginJobCollectionSchema,
  PluginJobCollectionSchema,
} from 'src/lib/plugins/resources/job-scheduler/schemas'
import { PluginWebhookRegistry } from 'src/lib/plugins/resources/webhook-registry/PluginWebhookRegistry'
import {
  pluginWebhookCollectionSchema,
  PluginWebhookCollectionSchema,
} from 'src/lib/plugins/resources/webhook-registry/schemas'
import {
  IOREDIS_CLIENT,
  TEMPORAL_CLIENT,
  UNBODY_SETTINGS,
} from '../shared/tokens'
import { PluginController } from './controllers/Plugin.controller'
import { WebhooksController } from './controllers/Webhooks.controller'
import { TemporalJobSchedulerEngine } from './lib/TemporalJobSchedulerEngine'
import { PluginService } from './services/Plugin.service'
import { PluginConfigService } from './services/PluginConfig.service'

const providers: Provider[] = [
  PluginService,
  PluginConfigService,
  {
    provide: PluginRegistry,
    inject: [
      PluginConfigService,
      UNBODY_SETTINGS,
      getModelToken(PluginStateCollectionSchema.name),
      PluginResources,
    ],
    useFactory: async (
      pluginConfigService: PluginConfigService,
      settings: UnbodyProjectSettingsDoc,
      pluginStateModel: Model<PluginStateCollectionDocument>,
      pluginResources: PluginResources,
    ) => {
      const registry = new PluginRegistry(
        {
          async configLoader(plugin, manifest, defaultLoader) {
            return pluginConfigService.loadPluginConfig(
              plugin,
              manifest,
              await defaultLoader(plugin, manifest),
            )
          },
        },
        {
          pluginState: pluginStateModel,
        },
        pluginResources,
      )
      await registry.register(settings.plugins)
      return registry
    },
  },
  {
    provide: PluginFileStorage,
    inject: [ConfigService, getModelToken(PluginFileCollectionSchema.name)],
    useFactory(configService: ConfigService, PluginFileModel) {
      const config = configService.get<{
        rootPath: string
      }>('plugins.resources.fileStorage')

      return new PluginFileStorage(
        {
          rootPath: config?.rootPath || '/',
        },
        {
          PluginFile: PluginFileModel,
        },
      )
    },
  },
  {
    provide: PluginJobScheduler,
    inject: [getModelToken(PluginJobCollectionSchema.name), TEMPORAL_CLIENT],
    useFactory(PluginJobModel, temporal: TemporalClient) {
      return new PluginJobScheduler(
        {},
        new TemporalJobSchedulerEngine(temporal),
        {
          PluginJob: PluginJobModel,
        },
      )
    },
  },
  {
    provide: PluginWebhookRegistry,
    inject: [ConfigService, getModelToken(PluginWebhookCollectionSchema.name)],
    useFactory(configService: ConfigService, PluginWebhookModel) {
      const config = configService.get<{
        baseUrl: string
      }>('plugins.resources.webhookRegistry')

      return new PluginWebhookRegistry(
        {
          baseUrl: config?.baseUrl || '',
        },
        {
          PluginWebhook: PluginWebhookModel,
        },
      )
    },
  },
  {
    provide: PluginDatabase,
    inject: [getConnectionToken()],
    useFactory(connection: MongooseConnection) {
      return new PluginDatabase(
        { database: 'unbody-plugins' },
        connection.getClient(),
      )
    },
  },
  {
    provide: PluginCacheStore,
    inject: [IOREDIS_CLIENT],
    useFactory(redis) {
      return new PluginCacheStore({}, redis)
    },
  },
  {
    provide: PluginResources,
    inject: [
      PluginFileStorage,
      PluginJobScheduler,
      PluginWebhookRegistry,
      PluginDatabase,
      PluginCacheStore,
    ],
    useFactory(
      pluginFileStorage: PluginFileStorage,
      pluginJobScheduler: PluginJobScheduler,
      pluginWebhookRegistry: PluginWebhookRegistry,
      pluginDatabase: PluginDatabase,
      pluginCacheStore: PluginCacheStore,
    ) {
      return new PluginResources(
        pluginCacheStore,
        pluginFileStorage,
        pluginJobScheduler,
        pluginWebhookRegistry,
        pluginDatabase,
      )
    },
  },
]

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: PluginStateCollectionSchema.name,
        schema: pluginStateCollectionSchema,
      },
      {
        name: PluginFileCollectionSchema.name,
        schema: pluginFileCollectionSchema,
      },
      {
        name: PluginJobCollectionSchema.name,
        schema: pluginJobCollectionSchema,
      },
      {
        name: PluginWebhookCollectionSchema.name,
        schema: pluginWebhookCollectionSchema,
      },
    ]),
  ],
  controllers: [PluginController, WebhooksController],
  providers: [...providers],
  exports: [...providers],
})
export class PluginModule {
  constructor() {}
}
