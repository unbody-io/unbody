export namespace Database {
  export const weaviate = 'database-weaviate' as const
}

export namespace Provider {
  export const localFolder = 'provider-local-folder' as const
}

export namespace TextVectorizer {
  export namespace OpenAI {
    export const embeddingAda002 = 'text2vec-openai-ada-002' as const
    export const embedding3Large = 'text2vec-openai-3-large' as const
    export const embedding3Small = 'text2vec-openai-3-small' as const
  }
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
}

export namespace ImageVectorizer {
  export const neural = 'img2vec-neural' as const
}

export namespace FileParser {
  export const image = 'file-parser-image' as const
  export const googleDoc = 'file-parser-google-doc' as const
  export const markdown = 'file-parser-markdown' as const
}

export namespace Storage {
  export const local = 'local-storage' as const
}

export namespace Enhancer {
  export const summarizer = 'enhancer-summarizer' as const
  export const structuredOutputGenerator =
    'enhancer-structured-output-generator' as const
}

export namespace DataProvider {
  export const localFolder = 'local_folder' as const
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
}

export namespace Generative {
  export namespace OpenAI {
    export const gpt4o = 'generative-openai-gpt-4o' as const
  }
}

export const aliases = [
  Database.weaviate,
  TextVectorizer.OpenAI.embeddingAda002,
  TextVectorizer.OpenAI.embedding3Large,
  TextVectorizer.OpenAI.embedding3Small,
  MultimodalVectorizer.Cohere.EnglishV3,
  MultimodalVectorizer.Cohere.EnglishLightV3,
  MultimodalVectorizer.Cohere.MultilingualV3,
  MultimodalVectorizer.Cohere.MultilingualLightV3,
  FileParser.image,
  FileParser.googleDoc,
  FileParser.markdown,
  Storage.local,
  Enhancer.summarizer,
  Enhancer.structuredOutputGenerator,
  DataProvider.localFolder,
  ImageVectorizer.neural,
  Reranker.Cohere.englishV3,
] as const

export type Alias = (typeof aliases)[number]
