import { ApplicationFailure, proxyActivities } from '@temporalio/workflow'
import { PluginEvent, PluginType } from 'src/lib/plugins-common'
import { ProviderPlugin } from 'src/lib/plugins-common/provider'
import { PluginEventHandlerActivities } from '../activities/PluginEventHandler.activities'

export type ProcessPluginEventWorkflowParams = {
  pluginId: string
  pluginAlias: string
  pluginType: PluginType
  event: PluginEvent<any, any>
}

export const processPluginEventWorkflow = async (
  params: ProcessPluginEventWorkflowParams,
) => {
  const { scheduleSourceUpdate } =
    proxyActivities<PluginEventHandlerActivities>({
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
          await scheduleSourceUpdate({ sourceId: event.payload.sourceId })
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
