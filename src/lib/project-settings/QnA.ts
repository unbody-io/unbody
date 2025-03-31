export class QnA {
  static Transformers = {
    Default: 'qna-transformers',
  }

  static OpenAI = {
    GPT3_5TurboInstruct: 'qna-openai-gpt-3.5-turbo-instruct',
  }

  constructor(public name: string) {}

  toJSON = () => {
    return {
      name: this.name,
    }
  }

  static fromJSON = (data: any) => {
    if (!data?.name) {
      throw new Error('Invalid QnA model')
    }

    return new QnA(data.name)
  }
}
