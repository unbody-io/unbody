import { PluginManifest } from 'src/lib/plugins-common'

export const manifest: PluginManifest = {
  name: 'text2vec-cohere',
  description: 'Cohere Embedding Plugin',
  displayName: 'Cohere Embedding Plugin',
  runtime: 'function',
  type: 'text_vectorizer',
  version: '0.1.0',
}
