export const PluginTypes = {
  Storage: 'storage' as 'storage',
  Provider: 'provider' as 'provider',
  Database: 'database' as 'database',
  Enhancer: 'enhancer' as 'enhancer',
  FileParser: 'file_parser' as 'file_parser',
  Reranker: 'reranker' as 'reranker',
  Generative: 'generative' as 'generative',
  TextVectorizer: 'text_vectorizer' as 'text_vectorizer',
  ImageVectorizer: 'image_vectorizer' as 'image_vectorizer',
  MultimodalVectorizer: 'multimodal_vectorizer' as 'multimodal_vectorizer',
} as const

export type PluginType = (typeof PluginTypes)[keyof typeof PluginTypes]
