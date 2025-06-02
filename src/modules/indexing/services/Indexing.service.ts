import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import {
  ApplicationFailure,
  Client as TemporalClient,
  WorkflowFailedError,
} from '@temporalio/client'
import { Model } from 'mongoose'
import { UnbodySourceDoc } from 'src/lib/core-types'
import { Result } from 'src/lib/core-utils/result'
import { Unbody } from 'src/lib/core/Unbody'
import { SourceSchemaClass } from 'src/modules/admin/schemas/Source.schema'
import { TEMPORAL_CLIENT } from 'src/modules/shared/tokens'
import * as uuid from 'uuid'
import { IndexingFailure, IndexingFailures } from '../types/index'
import type {
  DeleteSourceResourcesWorkflowParams,
  IndexSourceWorkflowParams,
} from '../workflows/indexing.workflows'

@Injectable()
export class IndexingService {
  constructor(
    private unbody: Unbody,
    @Inject(TEMPORAL_CLIENT)
    private temporal: TemporalClient,
    @InjectModel(SourceSchemaClass.name)
    private sourceModel: Model<SourceSchemaClass>,
  ) {}

  async scheduleIndexingJob(
    params: IndexSourceWorkflowParams,
  ): Promise<Result<any, IndexingFailure>> {
    const { executions } =
      await this.temporal.workflowService.listWorkflowExecutions({
        namespace: 'default',
        query: `WorkflowType = 'indexSourceWorkflow' AND ExecutionStatus = 'Running' AND sourceId = '${params.sourceId}'`,
      })

    if (executions[0]) {
      const execution = executions[0]
      const handle = this.temporal.workflow.getHandle(
        execution.execution!.workflowId!,
      )
      return handle.result()
    }

    const handle = await this.temporal.workflow.start('indexSourceWorkflow', {
      workflowId: uuid.v4(),
      taskQueue: 'indexing-queue',
      args: [params],
      searchAttributes: {
        sourceId: [params.sourceId],
      },
    })

    try {
      const result = await handle.result()
      return Result.ok(result)
    } catch (error) {
      if (
        error instanceof WorkflowFailedError &&
        error.cause instanceof ApplicationFailure &&
        error.cause.type === IndexingFailures.SOURCE_BUSY
      ) {
        return Result.err(IndexingFailures.SOURCE_BUSY)
      }

      throw error
    }
  }

  async scheduleDeleteSourceJob({ sourceId }: { sourceId: string }) {
    const source = await this.getSource({ sourceId })
    await this.temporal.workflow.start('deleteSourceResourcesWorkflow', {
      taskQueue: 'indexing-queue',
      workflowId: uuid.v4(),
      searchAttributes: {
        sourceId: [sourceId],
      },
      args: [
        {
          source,
          sourceId,
        } as DeleteSourceResourcesWorkflowParams,
      ],
    })

    return
  }

  async deleteSourceResources({
    sourceId,
    source: sourceInfo,
    jobId,
  }: {
    sourceId: string
    jobId?: string
    source?: UnbodySourceDoc
  }) {
    const { executions: executionInfos } =
      await this.temporal.workflowService.listWorkflowExecutions({
        namespace: 'default',
        query: `ExecutionStatus = 'Running' AND sourceId = '${sourceId}'`,
      })

    for (const execInfo of executionInfos) {
      if (
        jobId &&
        execInfo.execution?.workflowId &&
        execInfo.execution.workflowId === jobId
      )
        continue

      const handle = this.temporal.workflow.getHandle(
        execInfo.execution!.workflowId!,
      )
      await handle.cancel()
    }

    const source = sourceInfo || (await this.getSource({ sourceId }))

    await this.unbody.services.indexing.deleteSourceResources({
      provider: source.provider,
      source,
    })
  }

  getSource = async ({
    sourceId,
  }: {
    sourceId: string
  }): Promise<UnbodySourceDoc> => {
    const doc = await this.sourceModel.findById(sourceId)
    if (!doc)
      throw new ApplicationFailure('Source not found', 'source_not_found')

    const source = doc.toJSON({ virtuals: true })

    return {
      id: source._id,
      name: source.name,

      state: source.state,
      provider: source.provider,
      connected: source.connected,
      initialized: source.initialized,

      entrypoint: source.entrypoint || undefined,
      credentials: source.credentials,
      providerState: source.providerState,
      entrypointOptions: source.entrypointOptions || undefined,

      createdAt: source.createdAt.toJSON(),
      updatedAt: source.updatedAt.toJSON(),
    }
  }

  getProvider = async ({ sourceId }: { sourceId: string }) => {
    const source = await this.getSource({ sourceId })

    return this.unbody.modules.providers.getProvider({
      source: source,
      provider: source.provider,
    })
  }

  getDatabase = async ({}: {}) => {
    return this.unbody.modules.database.getDatabase({})
  }
}
