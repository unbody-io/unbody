import { Injectable } from '@nestjs/common'
import { Unbody } from 'src/lib/core/Unbody'

@Injectable()
export class EmbeddingsService {
  constructor(private unbody: Unbody) {}

  async vectorizeText(params: { model: string; text: string[] }) {
    const res = await this.unbody.modules.vectorizer.vectorizeText({
      text: params.text,
    })

    return res
  }

  async vectorizeImage(params: { model: string; image: string[] }) {
    const res = await this.unbody.modules.vectorizer.vectorizeImage({
      image: params.image,
    })

    return res
  }
}
