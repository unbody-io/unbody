import { PluginManifest } from 'src/lib/plugins-common'

export const manifest: PluginManifest = {
  name: 'reranker-cohere',
  displayName: 'Reranker Cohere',
  description: 'Rerank search results using Cohere Rerankers',
  runtime: 'function',
  type: 'reranker',
  version: '0.1.0',
}
