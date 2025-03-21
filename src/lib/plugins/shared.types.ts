import { PluginManifest } from '../plugins-common'
import { PluginRunner } from './runner/LocalPluginRunner'

export type LoadedPlugin = {
  id: string
  alias: string
  runner: PluginRunner
  manifest: PluginManifest
}
