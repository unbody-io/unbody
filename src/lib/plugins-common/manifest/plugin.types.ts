export const PluginTypes = {
  Storage: 'storage' as 'storage',
  Provider: 'provider' as 'provider',
  Database: 'database' as 'database',
  Enhancer: 'enhancer' as 'enhancer',
  FileParser: 'file_parser' as 'file_parser',
  Generative: 'generative' as 'generative',
  TextVectorizer: 'text_vectorizer' as 'text_vectorizer',
} as const

export type PluginType = (typeof PluginTypes)[keyof typeof PluginTypes]
