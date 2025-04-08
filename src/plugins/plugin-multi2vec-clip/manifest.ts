import { PluginManifest } from 'src/lib/plugins-common'

export const manifest: PluginManifest = {
  name: 'multi2vec-clip',
  description: 'Multimodal vectorizer using CLIP model',
  displayName: 'Multi2Vec CLIP',
  runtime: 'function',
  type: 'multimodal_vectorizer',
  version: '0.1.0',
}
