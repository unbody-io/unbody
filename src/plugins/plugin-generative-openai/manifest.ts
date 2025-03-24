import { PluginManifest } from 'src/lib/plugins-common'

export const manifest: PluginManifest = {
  name: 'generative-openai',
  description: 'OpenAI Generative Plugin',
  displayName: 'Generative OpenAI',
  runtime: 'function',
  type: 'generative',
  version: '0.1.0',
}
