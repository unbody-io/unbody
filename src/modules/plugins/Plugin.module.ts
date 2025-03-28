import {
  Inject,
  Module,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Provider,
} from '@nestjs/common'
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose'
import { Client as TemporalClient } from '@temporalio/client'
import { Worker } from '@temporalio/worker'
import { Model, Connection as MongooseConnection } from 'mongoose'
import { ConfigService, LoggerService } from 'src/lib/nestjs-utils'
import { PluginRegistry } from 'src/lib/plugins/registry/PluginRegistry'
import {
  PluginStateCollectionDocument,
  PluginStateCollectionSchema,
  pluginStateCollectionSchema,
} from 'src/lib/plugins/registry/schemas'
import { PluginResources } from 'src/lib/plugins/resources/PluginResources'
import { PluginCacheStore } from 'src/lib/plugins/resources/cache-store/PluginCacheStore'
import { PluginDatabase } from 'src/lib/plugins/resources/database/PluginDatabase'
import { PluginEventEmitter } from 'src/lib/plugins/resources/event-emitter'
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
import { TemporalWorker } from '../shared/lib/temporal/TemporalWorker'
import {
  IOREDIS_CLIENT,
  PLUGIN_EVENT_HANDLER_WORKER,
  TEMPORAL_CLIENT,
  UNBODY_SETTINGS,
} from '../shared/tokens'
import { PluginEventHandlerActivities } from './activities/PluginEventHandler.activities'
import { PluginEventQueues } from './constants/PluginEventQueues'
import { PluginController } from './controllers/Plugin.controller'
import { WebhooksController } from './controllers/Webhooks.controller'
import { TemporalJobSchedulerEngine } from './lib/TemporalJobSchedulerEngine'
import { PluginService } from './services/Plugin.service'
import { PluginConfigService } from './services/PluginConfig.service'
import { PluginTypes } from 'src/lib/plugins-common'
import { UnbodyProjectSettingsDoc } from 'src/lib/core-types'
import { UserMessage } from 'src/lib/nestjs-utils'

const providers: Provider[] = [
  PluginService,
  PluginConfigService,
  PluginEventHandlerActivities,
  {
    provide: PluginRegistry,
    inject: [
      PluginConfigService,
      UNBODY_SETTINGS,
      getModelToken(PluginStateCollectionSchema.name),
      PluginResources,
      LoggerService,
    ],
    useFactory: async (
      pluginConfigService: PluginConfigService,
      settings: UnbodyProjectSettingsDoc,
      pluginStateModel: Model<PluginStateCollectionDocument>,
      pluginResources: PluginResources,
      loggerService: LoggerService,
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

      const { registrationErrors } = await registry.register(
        settings.plugins,
      )
      for (const error of registrationErrors) {
        loggerService.userMessage(
          UserMessage.error({
            error,
          }),
        )

        const isFatal = (() => {
          switch (error.pluginDetails.manifest.type) {
            // only one database is supported currently and it's required
            case PluginTypes.Database:
              return true
            // only the local storage is supported currently and it's required
            case PluginTypes.Storage:
              return true
            // fail if the configured text vectorizer failed to load
            case PluginTypes.TextVectorizer:
              return (
                settings.modules.textVectorizer.name === error.pluginDetails.alias
              )
            default:
              return false
          }
        })()

        if (isFatal) {
          loggerService.userMessage(
            UserMessage.warning(
              `Can't start server without '${error.pluginDetails.alias}' because it's an essential plugin.`,
            ),
          )
          process.exit(1)
        }
      }
      return registry
    },
  },
  {
    provide: PluginEventEmitter,
    inject: [],
    useFactory() {
      return new PluginEventEmitter({})
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
      PluginEventEmitter,
      PluginFileStorage,
      PluginJobScheduler,
      PluginWebhookRegistry,
      PluginDatabase,
      PluginCacheStore,
    ],
    useFactory(
      pluginEventEmitter: PluginEventEmitter,
      pluginFileStorage: PluginFileStorage,
      pluginJobScheduler: PluginJobScheduler,
      pluginWebhookRegistry: PluginWebhookRegistry,
      pluginDatabase: PluginDatabase,
      pluginCacheStore: PluginCacheStore,
    ) {
      return new PluginResources(
        pluginEventEmitter,
        pluginCacheStore,
        pluginFileStorage,
        pluginJobScheduler,
        pluginWebhookRegistry,
        pluginDatabase,
      )
    },
  },
  TemporalWorker.forFeature({
    inject: [ConfigService],
    provide: PLUGIN_EVENT_HANDLER_WORKER,
    ActivityService: PluginEventHandlerActivities,
    useFactory: (configService: ConfigService) => ({
      debugMode: configService.isDev,
      taskQueue: PluginEventQueues.EventHandler,
      workflowsPath: require.resolve('./workflows/PluginEvent.workflows'),
      maxConcurrentWorkflowTaskExecutions: 10,
    }),
  }),
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
export class PluginModule
  implements OnApplicationBootstrap, OnApplicationShutdown {
  workers: Worker[] = []

  constructor(
    private pluginRegistry: PluginRegistry,
    @Inject(PLUGIN_EVENT_HANDLER_WORKER)
    private pluginEventHandlerWorker: Worker,
  ) {
    this.workers = [this.pluginEventHandlerWorker]
  }

  async onApplicationBootstrap() {
    for (const worker of this.workers) worker.run()

    this.pluginRegistry.startServices()
  }

  async onApplicationShutdown(signal?: string) {
    for (const worker of this.workers)
      if (worker.getState() === 'RUNNING') worker.shutdown()

    await this.pluginRegistry.stopServices()
  }
}
