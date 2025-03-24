import { Module } from '@nestjs/common'
import { CoreModule } from '../core/Core.module'
import { GenerativeController } from './controllers/Generative.controller'
import { GenerativeService } from './services/Generative.service'

@Module({
  imports: [CoreModule],
  providers: [GenerativeService],
  controllers: [GenerativeController],
  exports: [],
})
export class GenerativeModule {}
