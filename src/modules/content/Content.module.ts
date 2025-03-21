import { Module } from '@nestjs/common'
import { CoreModule } from '../core/Core.module'
import { GraphQLController } from './controllers/GraphQL.controller'
import { GraphQLService } from './services/GraphQL.service'

@Module({
  imports: [CoreModule],
  providers: [GraphQLService],
  controllers: [GraphQLController],
})
export class ContentModule {
  constructor() {}
}
