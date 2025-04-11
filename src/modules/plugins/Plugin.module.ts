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
import * as path from 'path'
import { UnbodyProjectSettingsDoc } from 'src/lib/core-types'
import { settleSync } from 'src/lib/core-utils'
import { ConfigService, LoggerService, UserMessage } from 'src/lib/nestjs-utils'
import { PluginTypes } from 'src/lib/plugins-common'
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
  PLUGIN_TASK_QUEUE_WORKER,
  TEMPORAL_CLIENT,
  UNBODY_SETTINGS,
} from '../shared/tokens'
import { PluginTaskQueueActivities } from './activities/PluginTaskQueue.activities'
import { PluginTaskQueues } from './constants/PluginTaskQueues'
import { PluginController } from './controllers/Plugin.controller'
import { WebhooksController } from './controllers/Webhooks.controller'
import { TemporalJobSchedulerEngine } from './lib/TemporalJobSchedulerEngine'
import { PluginService } from './services/Plugin.service'
import { PluginConfigService } from './services/PluginConfig.service'

const providers: Provider[] = [
  PluginService,
  PluginConfigService,
  PluginTaskQueueActivities,
  {
    provide: PluginRegistry,
    inject: [
      PluginService,
      PluginConfigService,
      getModelToken(PluginStateCollectionSchema.name),
      PluginResources,
      LoggerService,
      UNBODY_SETTINGS,
    ],
    useFactory: async (
      pluginService: PluginService,
      pluginConfigService: PluginConfigService,
      pluginStateModel: Model<PluginStateCollectionDocument>,
      pluginResources: PluginResources,
      loggerService: LoggerService,
      projectSettings: UnbodyProjectSettingsDoc,
    ) => {
      const registry = new PluginRegistry(
        {
          async configLoader(
            plugin,
            manifest,
            getPluginManifest,
            defaultLoader,
          ) {
            return pluginConfigService.loadPluginConfig(
              plugin,
              manifest,
              getPluginManifest,
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
        pluginService.getPlugins(),
      )
      for (const error of registrationErrors) {
        loggerService.userMessage(
          UserMessage.error({
            error,
            suggestion: pluginService.getRegistrationErrorSuggestion(
              error.pluginDetails.alias,
            ),
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
                projectSettings.textVectorizer.name ===
                error.pluginDetails.alias
              )
            case PluginTypes.ImageVectorizer:
              return (
                projectSettings.imageVectorizer?.name ===
                error.pluginDetails.alias
              )
            case PluginTypes.MultimodalVectorizer:
              return (
                projectSettings.imageVectorizer?.name ===
                  error.pluginDetails.alias ||
                projectSettings.textVectorizer.name ===
                  error.pluginDetails.alias
              )
            case PluginTypes.Reranker:
              return (
                projectSettings.reranker?.name === error.pluginDetails.alias
              )
            case PluginTypes.Generative:
              return (
                !!projectSettings.generative &&
                projectSettings.generative.name === error.pluginDetails.alias
              )
            case PluginTypes.FileParser:
              return true
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
    inject: [
      ConfigService,
      LoggerService,
      getModelToken(PluginFileCollectionSchema.name),
    ],
    useFactory(
      configService: ConfigService,
      loggerService: LoggerService,
      PluginFileModel,
    ) {
      const config = configService.get<{
        rootPath: string
      }>('plugins.resources.fileStorage')

      const [rootPath, err] = settleSync(() => {
        const rootPath = config?.rootPath
        if (!rootPath) throw new Error('Missing rootPath')

        if (path.isAbsolute(rootPath)) return rootPath
        const resolvedPath = path.resolve(process.cwd(), rootPath)

        return resolvedPath
      })

      if (err) {
        loggerService.userMessage(
          UserMessage.error({
            error: err,
            suggestion: [
              'Please ensure that the following environment variable is set correctly and points to an absolute path:',
              '- PLUGINS_FILE_STORAGE_ROOT_PATH',
            ].join('\n'),
          }),
        )

        process.exit(1)
      }

      return new PluginFileStorage(
        {
          rootPath: rootPath,
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
    provide: PLUGIN_TASK_QUEUE_WORKER,
    ActivityService: PluginTaskQueueActivities,
    useFactory: (configService: ConfigService) => ({
      debugMode: configService.isDev,
      taskQueue: PluginTaskQueues.JobHandler,
      workflowsPath: require.resolve('./workflows/PluginTask.workflows'),
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
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  workers: Worker[] = []

  constructor(
    private pluginRegistry: PluginRegistry,
    @Inject(PLUGIN_TASK_QUEUE_WORKER)
    private pluginEventHandlerWorker: Worker,
  ) {
    this.workers = [this.pluginEventHandlerWorker]
  }

  async onApplicationBootstrap() {
    for (const worker of this.workers) worker.run()

    await this.pluginRegistry.startServices()
  }

  async onApplicationShutdown(signal?: string) {
    for (const worker of this.workers)
      if (worker.getState() === 'RUNNING') worker.shutdown()

    await this.pluginRegistry.stopServices()
  }
}
