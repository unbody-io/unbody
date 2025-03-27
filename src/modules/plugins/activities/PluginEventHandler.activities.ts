import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { Client as TemporalClient } from '@temporalio/client'
import { PluginEventEmitter } from 'src/lib/plugins/resources/event-emitter'
import { IndexingQueues } from 'src/modules/indexing/constants/IndexingQueues'
import { IndexSourceWorkflowParams } from 'src/modules/indexing/workflows/indexing.workflows'
import { TEMPORAL_CLIENT } from 'src/modules/shared/tokens'
import * as uuid from 'uuid'
import { PluginEventQueues } from '../constants/PluginEventQueues'

@Injectable()
export class PluginEventHandlerActivities implements OnApplicationBootstrap {
  constructor(
    private readonly pluginEventEmitter: PluginEventEmitter,
    @Inject(TEMPORAL_CLIENT)
    private readonly temporalClient: TemporalClient,
  ) {}

  async scheduleSourceUpdate(params: { sourceId: string }) {
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

  async onApplicationBootstrap() {
    this.pluginEventEmitter.on(
      'event',
      async (event, pluginId, pluginAlias, pluginType) => {
        await this.temporalClient.workflow.start('processPluginEventWorkflow', {
          taskQueue: PluginEventQueues.EventHandler,
          workflowId: uuid.v4(), // @TODO: replace with event's idempotency key
          args: [
            {
              pluginId,
              pluginAlias,
              pluginType,
              event,
            },
          ],
        })
      },
    )
  }
}
