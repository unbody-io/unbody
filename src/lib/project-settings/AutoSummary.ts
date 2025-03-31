export class AutoSummary {
  static OpenAI = {
    GPT3_5Turbo: 'openai-gpt-3.5-turbo',
    GPT4o: 'openai-gpt-4o',
    GPT4oMini: 'openai-gpt-4o-mini',
  }

  static Cohere = {
    CommandR: 'cohere-command-r',
  }

  private static defaultOptions = {
    model: AutoSummary.OpenAI.GPT4o,
  }

  constructor(public options: { model: string } = AutoSummary.defaultOptions) {}

  toJSON = () => {
    return {
      name: 'enhancer-summarizer',
      options: {
        model: this.options.model,
      },
    }
  }

  static fromJSON = (data: any) => {
    if (!data?.options?.model) {
      return new AutoSummary()
    }

    return new AutoSummary({ model: data.options.model })
  }
}
