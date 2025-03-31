export class AutoEntities {
  static OpenAI = {
    GPT3_5Turbo: 'openai-gpt-3.5-turbo',
    GPT4o: 'openai-gpt-4o',
    GPT4oMini: 'openai-gpt-4o-mini',
  }

  private static defaultOptions = {
    model: AutoEntities.OpenAI.GPT4oMini,
  }

  constructor(public options: { model: string } = AutoEntities.defaultOptions) {}

  toJSON = () => {
    return {
      name: 'enhancer-entity-extractor',
      options: {
        model: this.options.model,
      },
    }
  }

  static fromJSON = (data: any) => {
    if (!data?.options?.model) {
      throw new Error('Invalid AutoEntities: model is required')
    }

    return new AutoEntities({ model: data.options.model })
  }
}
