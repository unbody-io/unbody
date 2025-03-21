import { PluginManifest } from 'src/lib/plugins-common'

export const manifest: PluginManifest = {
  displayName: 'Weaviate Database Adapter',
  description: '',

  name: 'database-weaviate',
  runtime: 'function',
  type: 'database',
  version: '0.1.0',
}
