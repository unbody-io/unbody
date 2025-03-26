import { Body, Controller, Param, Post, SetMetadata } from '@nestjs/common'
import { SkipFormatResponseInterceptor } from 'src/lib/nestjs-utils'
import { RerankDto } from '../dto/Rerank.dto'
import { RerankerService } from '../services/Reranker.service'

@Controller('/inference/')
export class RerankerController {
  constructor(private readonly rerankerService: RerankerService) {}

  @Post('/rerank/:reranker')
  @SetMetadata(SkipFormatResponseInterceptor, true)
  async rerank(@Param('reranker') reranker: string, @Body() body: RerankDto) {
    const res = await this.rerankerService.rerank({
      reranker,
      params: body,
    })
    return res
  }
}
