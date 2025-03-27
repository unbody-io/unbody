import { EventEmitter } from 'events'
import { PluginEventMap } from 'src/lib/plugins-common/runtime/events/PluginEventMap'

export class PluginEventEmitter extends EventEmitter<PluginEventMap> {}
