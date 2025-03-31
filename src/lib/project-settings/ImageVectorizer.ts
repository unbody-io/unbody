export class ImageVectorizer {
  static Img2VecNeural = {
    Default: 'img2vec-neural',
  }

  constructor(public name: string) {}

  toJSON = () => {
    return {
      name: this.name,
    }
  }

  static fromJSON = (data: any) => {
    if (!data?.name) {
      throw new Error('Invalid ImageVectorizer')
    }

    return new ImageVectorizer(data.name)
  }
}
