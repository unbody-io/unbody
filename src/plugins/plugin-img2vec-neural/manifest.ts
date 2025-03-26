import { PluginManifest } from 'src/lib/plugins-common'

export const manifest: PluginManifest = {
  name: 'img2vec-neural',
  description: 'Img2Vec Neural',
  displayName: 'Img2Vec OpenAI',
  runtime: 'function',
  type: 'image_vectorizer',
  version: '0.1.0',
}
