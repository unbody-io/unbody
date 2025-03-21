import { PluginType } from './plugin.types'
import { PluginResources } from './resources.types'
import { PluginRuntimeMode } from './runtime.types'

export type PluginManifest = {
  name: string
  version: string
  type: PluginType

  displayName: string
  description: string

  runtime: PluginRuntimeMode
  resources?: PluginResources
}
