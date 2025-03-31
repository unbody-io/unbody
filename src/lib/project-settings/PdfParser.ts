export class PdfParser {
  static Solution = {}

  static NlmSherpa = {
    Default: 'pdfparser-nlmsherpa',
  }

  static Pdf2Image = {
    Default: 'pdfparser-pdf2image',
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

    return new PdfParser(data.name)
  }
}
