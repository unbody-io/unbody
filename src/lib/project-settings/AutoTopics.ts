export class AutoTopics {
  static OpenAI = {
    GPT3_5Turbo: 'openai-gpt-3.5-turbo',
    GPT4o: 'openai-gpt-4o',
    GPT4oMini: 'openai-gpt-4o-mini',
  }

  private static defaultOptions = {
    model: AutoTopics.OpenAI.GPT4oMini,
  }

  constructor(public options: { model: string } = AutoTopics.defaultOptions) {}

  toJSON = () => {
    return {
      name: 'enhancer-topic-extractor',
      options: {
        model: this.options.model,
      },
    }
  }

  static fromJSON = (data: any) => {
    if (!data?.options?.model) {
      throw new Error('Invalid AutoTopics: model is required')
    }

    return new AutoTopics({ model: data.options.model })
  }
}
