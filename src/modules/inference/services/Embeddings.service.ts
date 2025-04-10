import { Injectable } from '@nestjs/common'
import { Unbody } from 'src/lib/core/Unbody'
import { VectorizeMultimodalDto } from '../dto/VectorizeMultimodal.dto'
import { VectorizeTextDto } from '../dto/VectorizeText.dto'

@Injectable()
export class EmbeddingsService {
  constructor(private unbody: Unbody) {}

  async vectorizeText({
    model,
    params,
  }: {
    model: string
    params: VectorizeTextDto
  }) {
    const res = await this.unbody.modules.vectorizer.vectorizeText({
      alias: model,
      text: params.inputs,
      type: params.type,
    })

    return res
  }

  async vectorizeImage(params: { model: string; image: string[] }) {
    const res = await this.unbody.modules.vectorizer.vectorizeImage({
      image: params.image,
      alias: params.model,
    })

    return res
  }

  async vectorizeMultimodal({
    model,
    params,
  }: {
    model: string
    params: VectorizeMultimodalDto
  }) {
    const res = await this.unbody.modules.vectorizer.vectorizeMultimodal({
      alias: model,
      params,
    })

    return res
  }
}
