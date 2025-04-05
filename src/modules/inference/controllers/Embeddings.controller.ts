import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  SetMetadata,
} from '@nestjs/common'
import { SkipFormatResponseInterceptor } from 'src/lib/nestjs-utils'
import { VectorizeMultimodalDto } from '../dto/VectorizeMultimodal.dto'
import { VectorizeTextDto } from '../dto/VectorizeText.dto'
import { EmbeddingsService } from '../services/Embeddings.service'

@Controller('/inference/embeddings')
export class EmbeddingsController {
  constructor(private embeddingsService: EmbeddingsService) {}

  @Post('/text/:model')
  @SetMetadata(SkipFormatResponseInterceptor, true)
  async vectorizeText(
    @Param('model') model: string,
    @Body() body: VectorizeTextDto,
  ) {
    return {
      embeddings: await this.embeddingsService
        .vectorizeText({
          model,
          params: body,
        })
        .then((res) => res.embeddings.map((item) => item.embedding)),
    }
  }

  @Post('/image/:model')
  @SetMetadata(SkipFormatResponseInterceptor, true)
  async vectorizeImage(@Param('model') model: string, @Body() body: any) {
    return this.embeddingsService
      .vectorizeImage({ model, image: [body.image] })
      .then((res) => ({
        id: body.id,
        vector: res.vectors[0].vector,
        dim: res.vectors[0].vector.length,
      }))
  }

  @Post('/multimodal/:model')
  @HttpCode(HttpStatus.OK)
  @SetMetadata(SkipFormatResponseInterceptor, true)
  async multimodal(
    @Param('model') model: string,
    @Body() body: VectorizeMultimodalDto,
  ) {
    return this.embeddingsService
      .vectorizeMultimodal({
        model,
        params: body,
      })
      .then((res) => ({
        textVectors: res.vectors.text,
        imageVectors: res.vectors.image,
        combinedVectors: res.vectors.combined,
      }))
  }
}
