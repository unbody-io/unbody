export namespace Database {
  export const weaviate = 'database-weaviate' as const
  export const all = [Database.weaviate] as const
  export type Alias = (typeof Database.all)[number]
}

export namespace DataProvider {
  export const localFolder = 'provider-local-folder' as const
  export const all = [DataProvider.localFolder] as const
  export type Alias = (typeof DataProvider.all)[number]
}

export namespace TextVectorizer {
  export namespace OpenAI {
    export const embeddingAda002 = 'text2vec-openai-ada-002' as const
    export const embedding3Large = 'text2vec-openai-3-large' as const
    export const embedding3Small = 'text2vec-openai-3-small' as const
  }

  export const all = [
    TextVectorizer.OpenAI.embeddingAda002,
    TextVectorizer.OpenAI.embedding3Large,
    TextVectorizer.OpenAI.embedding3Small,
  ] as const

  export type Alias = (typeof TextVectorizer.all)[number]
}

export namespace MultimodalVectorizer {
  export namespace Cohere {
    export const EnglishV3 = 'multi2vec-cohere-embed-english-v3.0' as const
    export const EnglishLightV3 =
      'multi2vec-cohere-embed-english-light-v3.0' as const
    export const MultilingualV3 =
      'multi2vec-cohere-embed-multilingual-v3.0' as const
    export const MultilingualLightV3 =
      'multi2vec-cohere-embed-multilingual-light-v3.0' as const
  }

  export const all = [
    MultimodalVectorizer.Cohere.EnglishV3,
    MultimodalVectorizer.Cohere.EnglishLightV3,
    MultimodalVectorizer.Cohere.MultilingualV3,
    MultimodalVectorizer.Cohere.MultilingualLightV3,
  ] as const

  export type Alias = (typeof MultimodalVectorizer.all)[number]
}

export namespace ImageVectorizer {
  export namespace Img2Vec {
    export const neural = 'img2vec-neural' as const
  }

  export const all = [ImageVectorizer.Img2Vec.neural] as const
  export type Alias = (typeof ImageVectorizer.all)[number]
}

export namespace FileParser {
  export const image = 'file-parser-image' as const
  export const googleDoc = 'file-parser-google-doc' as const
  export const markdown = 'file-parser-markdown' as const
  export const all = [
    FileParser.image,
    FileParser.googleDoc,
    FileParser.markdown,
  ] as const
  export type Alias = (typeof FileParser.all)[number]
}

export namespace Storage {
  export const local = 'local-storage' as const
  export const all = [Storage.local] as const
  export type Alias = (typeof Storage.all)[number]
}

export namespace Enhancer {
  export const summarizer = 'enhancer-summarizer' as const
  export const structuredOutputGenerator =
    'enhancer-structured-output-generator' as const
  export const all = [
    Enhancer.summarizer,
    Enhancer.structuredOutputGenerator,
  ] as const
  export type Alias = (typeof Enhancer.all)[number]
}

export namespace Defaults {
  export const database = Database.weaviate
  export const textVectorizer = TextVectorizer.OpenAI.embeddingAda002
  export const storage = Storage.local
}

export namespace Reranker {
  export namespace Cohere {
    export const englishV3 = 'reranker-cohere-rerank-english-v3.0' as const
  }

  export const all = [Reranker.Cohere.englishV3] as const
  export type Alias = (typeof Reranker.all)[number]
}

export namespace Generative {
  export namespace OpenAI {
    export const gpt4o = 'generative-openai-gpt-4o' as const
    export const gpt4oMini = 'generative-openai-gpt-4o-mini' as const
  }

  export const all = [
    Generative.OpenAI.gpt4o,
    Generative.OpenAI.gpt4oMini,
  ] as const
  export type Alias = (typeof Generative.all)[number]
}

export const aliases = [
  ...Database.all,
  ...TextVectorizer.all,
  ...MultimodalVectorizer.all,
  ...ImageVectorizer.all,
  ...FileParser.all,
  ...Storage.all,
  ...Enhancer.all,
  ...DataProvider.all,
  ...Reranker.all,
  ...Generative.all,
]

export type Alias =
  | Database.Alias
  | TextVectorizer.Alias
  | MultimodalVectorizer.Alias
  | ImageVectorizer.Alias
  | FileParser.Alias
  | Storage.Alias
  | Enhancer.Alias
  | DataProvider.Alias
  | Reranker.Alias
  | Generative.Alias
