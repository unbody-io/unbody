import { ApplicationFailure, proxyActivities } from '@temporalio/workflow'
import type { PluginEvent, PluginType } from 'src/lib/plugins-common'
import type { ProviderPlugin } from 'src/lib/plugins-common/provider'
import type { JobSchedulerJobConfig } from 'src/lib/plugins/resources/job-scheduler/JobSchedulerEngine'
import type { PluginTaskQueueActivities } from '../activities/PluginTaskQueue.activities'

export type ProcessPluginEventWorkflowParams = {
  pluginId: string
  pluginAlias: string
  pluginType: PluginType
  event: PluginEvent<any, any>
}

export const processPluginEventWorkflow = async (
  params: ProcessPluginEventWorkflowParams,
) => {
  const { scheduleSourceUpdate } = proxyActivities<PluginTaskQueueActivities>({
    startToCloseTimeout: '10m',
    retry: {
      nonRetryableErrorTypes: ['unknown_event_type'],
    },
  })

  switch (params.pluginType) {
    case 'provider': {
      const event = params.event as ProviderPlugin.Events.Event

      switch (event.name) {
        case 'source_updated': {
          await scheduleSourceUpdate({
            sourceId: event.payload.sourceId,
            idempotencyKey: event.payload.idempotencyKey,
          })
          break
        }

        default: {
          throw new ApplicationFailure(
            `Unknown event type: ${event.name}`,
            'unknown_event_type',
          )
        }
      }

      break
    }

    default: {
      throw new ApplicationFailure(
        `Unknown event type: ${params.event.name}`,
        'unknown_event_type',
      )
    }
  }
  return {}
}

export type HandlePluginJobParams = {
  job: JobSchedulerJobConfig
}

export const handlePluginJobWorkflow = async (
  params: HandlePluginJobParams,
): Promise<void> => {
  const { runPluginJob } = proxyActivities<PluginTaskQueueActivities>({
    startToCloseTimeout: '10m',
    retry: {
      maximumAttempts: 1,
      nonRetryableErrorTypes: ['job_not_found', 'plugin_not_found'],
    },
  })

  await runPluginJob({
    job: params.job,
  })
}
