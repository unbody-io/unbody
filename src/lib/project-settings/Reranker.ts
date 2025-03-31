export class Reranker {
  static Cohere = {
    MultilingualV3: 'reranker-cohere-multilingual-v3.0',
    MultilingualV2: 'reranker-cohere-multilingual-v2.0',
    EnglishV3: 'reranker-cohere-english-v3.0',
    EnglishV2: 'reranker-cohere-english-v2.0',
  }

  static Transformers = {
    Default: 'reranker-transformers',
  }

  constructor(public name: string) {}

  toJSON = () => {
    return {
      name: this.name,
    }
  }

  static fromJSON = (data: any) => {
    if (!data?.name) {
      throw new Error('Invalid Reranker model')
    }

    return new Reranker(data)
  }
}
