import { PluginManifest } from 'src/lib/plugins-common'

export const manifest: PluginManifest = {
  name: 'provider-github-issues',
  version: '0.1.0',

  displayName: 'GitHub Issues',
  description: 'GitHub Issues provider for Unbody',

  type: 'provider',
  runtime: 'function',
  resources: ['database', 'webhook_registry'],
}
