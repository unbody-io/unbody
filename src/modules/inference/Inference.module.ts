import { Module } from '@nestjs/common'
import { CoreModule } from '../core/Core.module'
import { EmbeddingsController } from './controllers/Embeddings.controller'
import { RerankerController } from './controllers/Reranker.controller'
import { EmbeddingsService } from './services/Embeddings.service'
import { RerankerService } from './services/Reranker.service'

@Module({
  imports: [CoreModule],
  providers: [EmbeddingsService, RerankerService],
  controllers: [EmbeddingsController, RerankerController],
  exports: [],
})
export class InferenceModule {}
