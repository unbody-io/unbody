import { PluginManifest } from 'src/lib/plugins-common'

export const manifest: PluginManifest = {
  name: 'multi2vec-cohere',
  description: 'Cohere Multimodal Embedding Plugin',
  displayName: 'Cohere Multimodal Embedding Plugin',
  runtime: 'function',
  type: 'multimodal_vectorizer',
  version: '0.1.0',
}
