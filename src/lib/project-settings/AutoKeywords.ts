export class AutoKeywords {
  static OpenAI = {
    GPT3_5Turbo: 'autokeywords-openai-gpt-3.5-turbo',
    GPT4o: 'autokeywords-openai-gpt-4o',
    GPT4oMini: 'autokeywords-openai-gpt-4o-mini',
  }

  constructor(public name: string) {}

  toJSON = () => {
    return {
      name: this.name,
    }
  }

  static fromJSON = (data: any) => {
    if (!data?.name) {
      throw new Error('Invalid AutoKeywords model')
    }

    return new AutoKeywords(data.name)
  }
}
