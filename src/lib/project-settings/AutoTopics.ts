export class AutoTopics {
  static OpenAI = {
    GPT3_5Turbo: 'autotopics-openai-gpt-3.5-turbo',
    GPT4o: 'autotopics-openai-gpt-4o',
    GPT4oMini: 'autotopics-openai-gpt-4o-mini',
  }

  constructor(public name: string) {}

  toJSON = () => {
    return {
      name: this.name,
    }
  }

  static fromJSON = (data: any) => {
    if (!data?.name) {
      throw new Error('Invalid AutoTopics model')
    }

    return new AutoTopics(data.name)
  }
}
