import { PluginType, PluginTypes } from '../../manifest'
import { ProviderPlugin } from '../../provider'
import { PluginEvent } from './PluginEvent'

export type PluginEventMap = {
  event:
    | [
        ProviderPlugin.Events.Event,
        pluginId: string,
        pluginAlias: string,
        pluginType: typeof PluginTypes.Provider,
      ]
    | [
        PluginEvent<any, any>,
        pluginId: string,
        pluginAlias: string,
        pluginType: Exclude<PluginType, typeof PluginTypes.Provider>,
      ]
}
