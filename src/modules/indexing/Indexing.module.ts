import {
  Inject,
  Module,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Worker } from '@temporalio/worker'
import { ConfigService } from 'src/lib/nestjs-utils'
import { SourceSchema, SourceSchemaClass } from '../admin/schemas/Source.schema'
import { CoreModule } from '../core/Core.module'
import { PluginModule } from '../plugins/Plugin.module'
import { TemporalWorker } from '../shared/lib/temporal/TemporalWorker'
import {
  ENHANCEMENT_WORKER,
  FILE_PARSER_WORKER,
  INDEXING_WORKER,
  RECORD_PROCESSOR_WORKER,
} from '../shared/tokens'
import { EnhancementActivities } from './activities/Enhancement.activities'
import { FileParserActivities } from './activities/FileParser.activities'
import { IndexingActivities } from './activities/Indexing.activities'
import { RecordProcessorActivities } from './activities/RecordProcessor.activities'
import { IndexingQueues } from './constants/IndexingQueues'
import { IndexingService } from './services/Indexing.service'

@Module({
  imports: [
    CoreModule,
    PluginModule,
    MongooseModule.forFeature([
      {
        name: SourceSchemaClass.name,
        schema: SourceSchema,
      },
    ]),
  ],
  controllers: [],
  providers: [
    IndexingService,
    IndexingActivities,
    FileParserActivities,
    EnhancementActivities,
    RecordProcessorActivities,
    TemporalWorker.forFeature({
      provide: INDEXING_WORKER,
      ActivityService: IndexingActivities,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        debugMode: configService.isDev,
        taskQueue: IndexingQueues.Indexing,
        workflowsPath: require.resolve('./workflows/indexing.workflows'),
        maxConcurrentWorkflowTaskExecutions: 10,
      }),
    }),
    TemporalWorker.forFeature({
      provide: FILE_PARSER_WORKER,
      ActivityService: FileParserActivities,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        debugMode: configService.isDev,
        taskQueue: IndexingQueues.FileParser,
        workflowsPath: require.resolve('./workflows/FileParser.workflows'),
        maxConcurrentWorkflowTaskExecutions: 10,
      }),
    }),
    TemporalWorker.forFeature({
      provide: RECORD_PROCESSOR_WORKER,
      ActivityService: RecordProcessorActivities,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        debugMode: configService.isDev,
        taskQueue: IndexingQueues.RecordProcessor,
        workflowsPath: require.resolve('./workflows/ProcessRecord.workflows'),
        maxConcurrentWorkflowTaskExecutions: 10,
      }),
    }),
    TemporalWorker.forFeature({
      provide: ENHANCEMENT_WORKER,
      ActivityService: EnhancementActivities,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        debugMode: configService.isDev,
        taskQueue: IndexingQueues.Enhancement,
        workflowsPath: require.resolve('./workflows/Enhancement.workflows'),
        maxConcurrentWorkflowTaskExecutions: 20,
      }),
    }),
  ],
  exports: [IndexingService],
})
export class IndexingModule
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  workers: Worker[] = []

  constructor(
    private readonly configService: ConfigService,
    @Inject(INDEXING_WORKER) private readonly indexingWorker: Worker,
    @Inject(FILE_PARSER_WORKER) private readonly fileParserWorker: Worker,
    @Inject(RECORD_PROCESSOR_WORKER)
    private readonly recordProcessorWorker: Worker,
    @Inject(ENHANCEMENT_WORKER)
    private readonly enhancementWorker: Worker,
  ) {
    this.workers = [
      this.indexingWorker,
      this.fileParserWorker,
      this.recordProcessorWorker,
      this.enhancementWorker,
    ]
  }

  async onApplicationBootstrap() {
    for (const worker of this.workers) worker.run()
  }

  async onApplicationShutdown(signal?: string | undefined) {
    for (const worker of this.workers)
      if (worker.getState() === 'RUNNING') worker.shutdown()
  }
}
