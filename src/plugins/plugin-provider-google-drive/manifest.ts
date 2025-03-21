import { PluginManifest } from 'src/lib/plugins-common'

export const manifest: PluginManifest = {
  name: 'provider-google-drive',
  version: '0.1.0',

  displayName: 'Google Drive',
  description: 'Google Drive provider for Unbody',

  type: 'provider',
  runtime: 'function',
  resources: ['webhook_registry', 'job_scheduler', 'file_storage'],
}
