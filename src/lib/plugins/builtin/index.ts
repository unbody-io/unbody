import * as ModelProviders from 'src/lib/core-types/model-providers'

export namespace Database {
  export const weaviate = 'database-weaviate' as const
  export const all = [weaviate] as const
  export type Alias = (typeof all)[number]
}

export namespace DataSourceProvider {
  export const localFolder = 'provider-local-folder' as const

  export const all = [localFolder] as const
  export type Alias = (typeof all)[number]
}

export namespace TextVectorizer {
  export const OpenAI = {
    embeddingAda002: 'text2vec-openai-ada-002',
    embedding3Large: 'text2vec-openai-3-large',
    embedding3Small: 'text2vec-openai-3-small',
  } as const

  export const all = [...Object.values(OpenAI)] as const
  export type Alias = (typeof all)[number]
}

export namespace MultimodalVectorizer {
  export const Cohere = {
    englishV3: 'multi2vec-cohere-embed-english-v3.0',
    englishLightV3: 'multi2vec-cohere-embed-english-light-v3.0',
    multilingualV3: 'multi2vec-cohere-embed-multilingual-v3.0',
    multilingualLightV3: 'multi2vec-cohere-embed-multilingual-light-v3.0',
  } as const

  export const all = [...Object.values(Cohere)] as const
  export type Alias = (typeof all)[number]
}

export namespace ImageVectorizer {
  export const Img2Vec = {
    neural: 'img2vec-neural',
  } as const

  export const all = [...Object.values(Img2Vec)] as const
  export type Alias = (typeof all)[number]
}

export namespace FileParser {
  export const image = 'file-parser-image' as const
  export const googleDoc = 'file-parser-google-doc' as const
  export const markdown = 'file-parser-markdown' as const

  export const all = [image, googleDoc, markdown] as const
  export type Alias = (typeof all)[number]
}

export namespace Storage {
  export const local = 'local-storage' as const
  export const all = [local] as const
  export type Alias = (typeof all)[number]
}

export namespace Enhancer {
  export const summarizer = 'enhancer-summarizer' as const
  export const structuredOutputGenerator =
    'enhancer-structured-output-generator' as const
  export const all = [summarizer, structuredOutputGenerator] as const
  export type Alias = (typeof all)[number]

  export namespace Summarizer {
    export const OpenAI = {
      gpt3_5Turbo: ModelProviders.OpenAI.Models.gpt3_5Turbo,
      gpt4o: ModelProviders.OpenAI.Models.gpt4o,
      gpt4oMini: ModelProviders.OpenAI.Models.gpt4oMini,
    } as const
    const supportedModels = [...Object.values(OpenAI)] as const
    export type Model = (typeof supportedModels)[number]
  }

  export namespace StructuredOutputGenerator {
    export const OpenAI = {
      gpt4o: ModelProviders.OpenAI.Models.gpt4o,
      gpt4oMini: ModelProviders.OpenAI.Models.gpt4oMini,
    } as const
    const supportedModels = [...Object.values(OpenAI)] as const
    export type Model = (typeof supportedModels)[number]
  }
}

export namespace Defaults {
  export const database = Database.weaviate
  export const textVectorizer = TextVectorizer.OpenAI.embeddingAda002
  export const storage = Storage.local
}

export namespace Reranker {
  export const Cohere = {
    englishV3: 'reranker-cohere-rerank-english-v3.0',
  } as const

  export const all = [...Object.values(Cohere)] as const
  export type Alias = (typeof all)[number]
}

export namespace Generative {
  export const openAI = 'generative-openai' as const
  export const all = [openAI] as const
  export type Alias = (typeof all)[number]
  export type Model = ModelProviders.OpenAI.Model
  export const OpenAI = ModelProviders.OpenAI.Models
}

export const aliases = [
  ...Database.all,
  ...TextVectorizer.all,
  ...MultimodalVectorizer.all,
  ...ImageVectorizer.all,
  ...FileParser.all,
  ...Storage.all,
  ...Enhancer.all,
  ...DataSourceProvider.all,
  ...Reranker.all,
  ...Generative.all,
] as const

export type Alias = (typeof aliases)[number]
