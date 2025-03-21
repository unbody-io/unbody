import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import {
  ApplicationFailure,
  Client,
  WorkflowNotFoundError,
} from '@temporalio/client'
import { Model } from 'mongoose'
import { UnbodySourceDoc, UnbodySourceStates } from 'src/lib/core-types'
import { settle } from 'src/lib/core-utils'
import { Unbody } from 'src/lib/core/Unbody'
import { HandleSourceUpdateParams } from 'src/lib/plugins-common/provider'
import { SourceSchemaClass } from 'src/modules/admin/schemas/Source.schema'
import { TEMPORAL_CLIENT } from 'src/modules/shared/tokens'
import * as uuid from 'uuid'
import { IndexingService } from '../services/Indexing.service'
import type { IndexSourceWorkflowParams } from '../workflows/indexing.workflows'

@Injectable()
export class IndexingActivities {
  constructor(
    @InjectModel(SourceSchemaClass.name)
    private sourceModel: Model<SourceSchemaClass>,
    @Inject(TEMPORAL_CLIENT)
    private temporal: Client,
    private indexingService: IndexingService,
    private unbody: Unbody,
  ) {}

  async getSchedulerLock({
    jobId,
    sourceId,
  }: {
    jobId: string
    sourceId: string
  }) {
    const workflowId = uuid.v5(`${sourceId}:scheduler:lock`, uuid.v5.URL)

    const workflow = await this.temporal.workflow.start(
      'schedulerLockWorkflow',
      {
        workflowId,
        taskQueue: 'indexing-queue',
        workflowIdConflictPolicy: 'USE_EXISTING',
      },
    )

    await workflow.signal('requestSchedulerLock', {
      requestId: jobId,
    })

    while (true) {
      const { current } = await workflow.query<{ current: string | null }>(
        'schedulerLockQuery',
      )

      if (current === jobId) return

      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  async getSourceOpenJobs({ sourceId }: { sourceId: string }) {
    const { executions: executionInfos } =
      await this.temporal.workflowService.listWorkflowExecutions({
        namespace: 'default',
        query: `WorkflowType IN ('initSourceWorkflow', 'updateSourceWorkflow') AND ExecutionStatus = 'Running' AND sourceId = '${sourceId}'`,
      })

    const jobs = executionInfos.map((execInfo) => ({
      workflowType: execInfo.type!.name!,
      workflowId: execInfo.execution!.workflowId!,
      jobType:
        execInfo.type!.name! === 'initSourceWorkflow' ? 'init' : 'update',
    }))

    return jobs
  }

  async getJobStatus({ jobId, sourceId }: { jobId: string; sourceId: string }) {
    const handle = this.temporal.workflow.getHandle(jobId)
    const [res, err] = await settle(() => handle.describe())
    if (err && !(err instanceof WorkflowNotFoundError)) throw err

    return {
      status: res!.closeTime ? 'completed' : 'running',
    }
  }

  async releaseSchedulerLock({
    jobId,
    sourceId,
  }: {
    jobId: string
    sourceId: string
  }) {
    const workflowId = uuid.v5(`${sourceId}:scheduler:lock`, uuid.v5.URL)

    const workflow = await this.temporal.workflow.start(
      'schedulerLockWorkflow',
      {
        workflowId,
        taskQueue: 'indexing-queue',
        workflowIdConflictPolicy: 'USE_EXISTING',
        workflowIdReusePolicy: 'ALLOW_DUPLICATE_FAILED_ONLY',
      },
    )

    await workflow.signal('releaseSchedulerLock', {
      requestId: jobId,
    })
  }

  async cancelIndexingJob(params: { jobId: string }) {
    const handle = this.temporal.workflow.getHandle(params.jobId)
    await handle.cancel()
  }

  async startIndexingJobWorkflow(params: IndexSourceWorkflowParams) {
    const workflow =
      params.type === 'init' ? 'initSourceWorkflow' : 'updateSourceWorkflow'

    const { workflowId } = await this.temporal.workflow.start(workflow, {
      taskQueue: 'indexing-queue',
      workflowId: params.jobId,
      args: [params],
      searchAttributes: {
        sourceId: [params.sourceId],
      },
    })

    return {
      workflowId,
    }
  }

  async initSource(params: { sourceId: string; taskId?: string }) {
    const source = await this.indexingService.getSource({
      sourceId: params.sourceId,
    })

    await this.sourceModel.updateOne(
      { _id: source.id },
      {
        $set: {
          state: UnbodySourceStates.Initializing,
        },
      },
    )

    const res = await this.unbody.services.indexing.initSource({
      source,
      provider: source.provider,
      ...(params.taskId ? { taskId: params.taskId } : {}),
    })

    return res
  }

  async handleSourceUpdate(
    params: {
      sourceId: string
    } & HandleSourceUpdateParams,
  ) {
    const source = await this.indexingService.getSource({
      sourceId: params.sourceId,
    })

    await this.sourceModel.updateOne(
      { _id: source.id },
      {
        $set: {
          state: UnbodySourceStates.Updating,
        },
      },
    )

    const res = await this.unbody.services.indexing.handleSourceUpdate({
      source,
      provider: source.provider,
      ...params,
    })

    return res
  }

  async onSourceInitFinished({
    sourceId,
    sourceState,
  }: {
    sourceId: string
    sourceState?: Record<string, any>
  }) {
    const source = await this.sourceModel.findById(sourceId)
    if (!source)
      throw new ApplicationFailure('Source not found', 'source_not_found')

    const provider = await this.indexingService.getProvider({ sourceId })

    if (typeof provider.registerObserver === 'function') {
      try {
        await provider.registerObserver!({})
      } catch (err) {
        throw new ApplicationFailure(
          err.message,
          'observer_registration_failed',
          false,
          null,
          err,
        )
      }
    }

    await source.updateOne({
      $set: {
        initialized: true,
        state: UnbodySourceStates.Idle,
        ...(sourceState ? { providerState: sourceState } : {}),
      },
    })
  }

  async onSourceUpdateFinished({
    sourceId,
    sourceState,
  }: {
    sourceId: string
    sourceState?: Record<string, any>
  }) {
    const source = await this.sourceModel.findById(sourceId)
    if (!source)
      throw new ApplicationFailure('Source not found', 'source_not_found')

    await source.updateOne({
      $set: {
        ...(sourceState ? { providerState: sourceState } : {}),
        state: UnbodySourceStates.Idle,
      },
    })
  }

  async getRemoteRecord({
    sourceId,
    taskId,
    recordId,
    metadata,
  }: {
    sourceId: string
    taskId?: string
    recordId: string
    metadata?: Record<string, any>
  }) {
    const provider = await this._getProvider({ sourceId })

    return provider.getRecord({ recordId, metadata, taskId })
  }

  async deleteSourceResources({
    sourceId,
    jobId,
    source,
  }: {
    sourceId: string
    jobId?: string
    source?: UnbodySourceDoc
  }) {
    await this.indexingService.deleteSourceResources({
      sourceId,
      jobId,
      source,
    })
  }

  private _getProvider = async ({ sourceId }: { sourceId: string }) => {
    return this.indexingService.getProvider({ sourceId })
  }
}
