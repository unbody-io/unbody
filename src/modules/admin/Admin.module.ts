import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ConfigService } from 'src/lib/nestjs-utils'
import { CoreModule } from '../core/Core.module'
import { IndexingModule } from '../indexing/Indexing.module'
import { PluginModule } from '../plugins/Plugin.module'
import { ProjectController } from './controllers/Project.controller'
import { SourceController } from './controllers/Source.controller'
import { SourceSchema, SourceSchemaClass } from './schemas/Source.schema'
import { ProjectService } from './services/Project.service'
import { SourceService } from './services/Source.service'

@Module({
  imports: [
    CoreModule,
    PluginModule,
    IndexingModule,
    MongooseModule.forFeature([
      {
        name: SourceSchemaClass.name,
        schema: SourceSchema,
      },
    ]),
  ],
  providers: [ProjectService, SourceService],
  controllers: [ProjectController, SourceController],
})
export class AdminModule {
  constructor(private readonly configService: ConfigService) {}
}
