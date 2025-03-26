import { PluginManifest } from 'src/lib/plugins-common'

export const manifest: PluginManifest = {
  name: 'reranker-transformers',
  displayName: 'Reranker Transformers',
  description: 'Rerank search results using transformer models',
  runtime: 'function',
  type: 'reranker',
  version: '0.1.0',
}
