import { Injectable } from '@nestjs/common'
import { Unbody } from 'src/lib/core/Unbody'
import { RerankDto } from '../dto/Rerank.dto'

@Injectable()
export class RerankerService {
  constructor(private unbody: Unbody) {}

  async rerank(params: { reranker: string; params: RerankDto }) {
    const res = await this.unbody.modules.reranker.rerank(params)

    return res
  }
}
