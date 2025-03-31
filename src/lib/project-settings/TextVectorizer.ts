export class TextVectorizer {
  static OpenAI = {
    Ada002: 'text2vec-openai-ada-002',
    TextEmbedding3Large: 'text2vec-openai-text-embedding-3-large',
    TextEmbedding3Small: 'text2vec-openai-text-embedding-3-small',
  }

  static Cohere = {
    MultilingualV3: 'text2vec-cohere-multilingual-v3.0',
    MultilingualLightV3: 'text2vec-cohere-multilingual-light-v3.0',
    EnglishV3: 'text2vec-cohere-english-v3.0',
    EnglishLightV3: 'text2vec-cohere-english-light-v3.0',
    EnglishV2: 'text2vec-cohere-english-v2.0',
    EnglishLightV2: 'text2vec-cohere-english-light-v2.0',
  }

  static Contextionary = {
    Default: 'text2vec-contextionary',
  }

  static Transformers = {
    Default: 'text2vec-transformers',
  }

  constructor(public name: string) {}

  toJSON = () => {
    return {
      name: this.name,
    }
  }

  static fromJSON = (data: any) => {
    if (!data?.name) {
      throw new Error('Invalid TextVectorizer')
    }

    return new TextVectorizer(data.name)
  }
}
