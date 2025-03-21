import { Module } from '@nestjs/common'
import { CoreModule } from '../core/Core.module'
import { EmbeddingsController } from './controllers/Embeddings.controller'
import { EmbeddingsService } from './services/Embeddings.service'

@Module({
  imports: [CoreModule],
  providers: [EmbeddingsService],
  controllers: [EmbeddingsController],
  exports: [],
})
export class InferenceModule {}
