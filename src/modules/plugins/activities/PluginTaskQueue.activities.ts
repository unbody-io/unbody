import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import {
  ApplicationFailure,
  Client as TemporalClient,
  WorkflowExecutionAlreadyStartedError,
} from '@temporalio/client'
import { Model } from 'mongoose'
import type { Job } from 'src/lib/plugins-common/resources/job-scheduler'
import { PluginRegistry } from 'src/lib/plugins/registry/PluginRegistry'
import { PluginEventEmitter } from 'src/lib/plugins/resources/event-emitter'
import { JobSchedulerJobConfig } from 'src/lib/plugins/resources/job-scheduler/JobSchedulerEngine'
import {
  PluginJobCollectionDocument,
  PluginJobCollectionSchema,
} from 'src/lib/plugins/resources/job-scheduler/schemas'
import { PluginResources } from 'src/lib/plugins/resources/PluginResources'
import { IndexingQueues } from 'src/modules/indexing/constants/IndexingQueues'
import { IndexSourceWorkflowParams } from 'src/modules/indexing/workflows/indexing.workflows'
import { TEMPORAL_CLIENT } from 'src/modules/shared/tokens'
import * as uuid from 'uuid'
import { PluginTaskQueues } from '../constants/PluginTaskQueues'

@Injectable()
export class PluginTaskQueueActivities implements OnApplicationBootstrap {
  constructor(
    private readonly pluginEventEmitter: PluginEventEmitter,
    @Inject(TEMPORAL_CLIENT)
    private readonly temporalClient: TemporalClient,
    @InjectModel(PluginJobCollectionSchema.name)
    private readonly pluginJobModel: Model<PluginJobCollectionDocument>,
    private pluginRegistry: PluginRegistry,
    private pluginResources: PluginResources,
  ) {}

  async scheduleSourceUpdate(params: {
    sourceId: string
    idempotencyKey?: string
  }) {
    const jobId = uuid.v4()
    await this.temporalClient.workflow.start('indexSourceWorkflow', {
      workflowId: uuid.v4(),
      args: [
        {
          jobId: jobId,
          sourceId: params.sourceId,
          type: 'update',
        } as IndexSourceWorkflowParams,
      ],
      taskQueue: IndexingQueues.Indexing,
    })
  }

  async runPluginJob(params: { job: JobSchedulerJobConfig }) {
    const job = await this.pluginJobModel.findOne({
      jobId: params.job.id,
    })

    if (!job) {
      throw new ApplicationFailure('Job not found', 'job_not_found')
    }

    const plugin = await this.pluginRegistry.getPluginById(job.pluginId)
    if (!plugin) {
      throw new ApplicationFailure('Plugin not found', 'plugin_not_found')
    }

    const info = await this.pluginResources.jobScheduler.get(
      { pluginId: job.pluginId },
      {
        jobId: job.jobId,
      },
    )

    const instance = await this.pluginRegistry.getInstance(plugin)
    try {
      await instance.runTask('onExecuteJob')({
        id: job.jobId,
        name: job.name,
        retries: info?.retries || 0,
        schedule: job.schedule,
        every: job.every,
        scope: job.scope,
        payload: job.payload,
        status: info?.status || 'running',
        createdAt: job.createdAt,
        lastRunAt: info?.lastRunAt,
        lastFinishedAt: info?.lastFinishedAt,
        nextRunAt: info?.nextRunAt,
        error: info?.error,
        retryOptions: job.retryOptions,
      } satisfies Job)
    } catch (error) {
      throw new ApplicationFailure(
        `Error running job ${job.jobId}: ${error.message}`,
        'job_execution_error',
      )
    }
  }

  async onApplicationBootstrap() {
    this.pluginEventEmitter.on(
      'event',
      async (event, pluginId, pluginAlias, pluginType) => {
        const workflowId = event.idempotencyKey
          ? uuid.v5(event.idempotencyKey, uuid.v5.URL)
          : uuid.v4()
        try {
          await this.temporalClient.workflow.start(
            'processPluginEventWorkflow',
            {
              taskQueue: PluginTaskQueues.JobHandler,
              workflowId: workflowId,
              args: [
                {
                  pluginId,
                  pluginAlias,
                  pluginType,
                  event,
                },
              ],
              workflowIdConflictPolicy: 'FAIL',
            },
          )
        } catch (error) {
          if (error instanceof WorkflowExecutionAlreadyStartedError) {
            return
          }

          throw error
        }
      },
    )
  }
}
