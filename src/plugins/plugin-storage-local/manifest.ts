import { PluginManifest } from 'src/lib/plugins-common'

export const manifest: PluginManifest = {
  displayName: 'Local Storage Plugin',
  description: 'Local storage plugin for testing and development purposes.',

  name: 'storage-local',
  runtime: 'function',
  type: 'storage',
  version: '0.1.0',
}
