import { PluginManifest } from 'src/lib/plugins-common'

export const manifest: PluginManifest = {
  name: 'provider-local-folder',
  version: '0.1.0',

  displayName: 'Local Folder (dev)',
  description: 'Local folder data provider for development',

  type: 'provider',
  runtime: 'service',
  resources: ['database', 'file_storage'],
}
