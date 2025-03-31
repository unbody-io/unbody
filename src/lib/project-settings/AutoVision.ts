export class AutoVision {
  static OpenAI = {
    GPT4o: 'openai-gpt-4o',
    GPT4oMini: 'openai-gpt-4o-mini',
    GPT4Turbo: 'openai-gpt-4-turbo',
  }

  private static defaultOptions = {
    model: AutoVision.OpenAI.GPT4o,
  }

  constructor(public options: { model: string } = AutoVision.defaultOptions) {}

  toJSON = () => {
    return {
      name: 'enhancer-structured-output-generator',
      options: {
        model: this.options.model,
      },
    }
  }

  static fromJSON = (data: any) => {
    if (!data?.options?.model) {
      throw new Error('Invalid AutoVision: model is required')
    }

    return new AutoVision({ model: data.options.model })
  }
}
