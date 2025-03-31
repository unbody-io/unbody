export class AutoVision {
  static OpenAI = {
    GPT4o: 'autovision-openai-gpt-4o',
    GPT4oMini: 'autovision-openai-gpt-4o-mini',
    GPT4Turbo: 'autovision-openai-gpt-4-turbo',
  }

  constructor(public name: string) {}

  toJSON = () => {
    return {
      name: this.name,
    }
  }

  static fromJSON = (data: any) => {
    if (!data?.name) {
      throw new Error('Invalid AutoVision model')
    }

    return new AutoVision(data.name)
  }
}
