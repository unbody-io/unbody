export class Generative {
  static OpenAI = {
    GPT3_5Turbo: 'gpt-3.5-turbo',
    GPT4: 'gpt-4',
    GPT4Turbo: 'gpt-4-turbo',
    GPT4o: 'gpt-4o',
    GPT4oMini: 'gpt-4o-mini',
  }

  static Cohere = {
    Command: 'command',
    CommandLight: 'command-light',
    CommandR: 'command-r',
    CommandRPlus: 'command-r-plus',
  }

  static Mistral = {
    OpenMistral7b: 'open-mistral-7b',
    OpenMixtral8x7b: 'open-mixtral-8x7b',
  }

  public name = 'generative-unbody'
  public options: {
    model: string
  } = {} as any

  constructor(model: string) {
    this.options.model = model as any
  }

  toJSON = () => {
    return {
      name: this.name,
      options: {
        model: this.options.model,
      },
    }
  }

  static fromJSON = (data: any) => {
    if (!data?.options?.model) {
      throw new Error('Invalid Generative model')
    }

    return new Generative(data.options.model)
  }
}
