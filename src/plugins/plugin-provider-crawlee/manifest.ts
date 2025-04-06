import { PluginManifest } from 'src/lib/plugins-common'

export const manifest: PluginManifest = {
  name: 'provider-crawlee-crawler',
  version: '0.1.0',

  displayName: 'Crawlee Web Crawler',
  description: '',

  type: 'provider',
  runtime: 'service',
  resources: ['database', 'job_scheduler'],
}
