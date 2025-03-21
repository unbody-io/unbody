import { PluginManifest } from 'src/lib/plugins-common'

export const manifest: PluginManifest = {
  name: 'text2vec-openai',
  description: "Text vectorization using OpenAI's embeddings API",
  displayName: 'Text2Vec OpenAI',
  runtime: 'function',
  type: 'text_vectorizer',
  version: '0.1.0',
}
