export class Spellcheck {
  static TextSpellcheck = {
    Default: 'text-spellcheck',
  }

  constructor(public name: string) {}

  toJSON = () => {
    return {
      name: this.name,
    }
  }

  static fromJSON = (data: any) => {
    if (!data?.name) {
      throw new Error('Invalid Spellcheck')
    }

    return new Spellcheck(data.name)
  }
}
