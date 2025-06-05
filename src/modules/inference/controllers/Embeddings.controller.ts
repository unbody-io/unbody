import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
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
    const result = await this.embeddingsService.vectorizeImage({
      model,
      image: [body.image],
    })

    if (!result.vectors || !result.vectors[0]) {
      throw new InternalServerErrorException(
        'Failed to vectorize image. No vectors returned from the model.',
      )
    }

    return {
      id: body.id,
      vector: result.vectors[0].vector,
      dim: result.vectors[0].vector.length,
    }
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
