export class AutoSummary {
  static OpenAI = {
    GPT3_5Turbo: 'autosum-openai-gpt-3.5-turbo',
    GPT4o: 'autosum-openai-gpt-4o',
    GPT4oMini: 'autosum-openai-gpt-4o-mini',
  }

  static Cohere = {
    CommandR: 'autosum-cohere-command-r',
  }

  constructor(public name: string) {}

  toJSON = () => {
    return {
      name: this.name,
    }
  }

  static fromJSON = (data: any) => {
    if (!data?.name) {
      throw new Error('Invalid AutoSummary model')
    }

    return new AutoSummary(data.name)
  }
}
