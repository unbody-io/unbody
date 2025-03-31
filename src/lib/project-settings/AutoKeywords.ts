export class AutoKeywords {
  static OpenAI = {
    GPT3_5Turbo: 'openai-gpt-3.5-turbo',
    GPT4o: 'openai-gpt-4o',
    GPT4oMini: 'openai-gpt-4o-mini',
  }

  private static defaultOptions = {
    model: AutoKeywords.OpenAI.GPT4oMini,
  }

  constructor(public options: { model: string } = AutoKeywords.defaultOptions) {}

  toJSON = () => {
    return {
      name: 'enhancer-keyword-extractor',
      options: {
        model: this.options.model,
      },
    }
  }

  static fromJSON = (data: any) => {
    if (!data?.options?.model) {
      throw new Error('Invalid AutoKeywords: model is required')
    }

    return new AutoKeywords({ model: data.options.model })
  }
}
