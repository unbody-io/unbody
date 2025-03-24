import { Module } from '@nestjs/common'
import { AdminModule } from './modules/admin/Admin.module'
import { ContentModule } from './modules/content/Content.module'
import { CoreModule } from './modules/core/Core.module'
import { GenerativeModule } from './modules/generative/Generative.module'
import { IndexingModule } from './modules/indexing/Indexing.module'
import { InferenceModule } from './modules/inference/Inference.module'
import { PluginModule } from './modules/plugins/Plugin.module'
import { SharedModule } from './modules/shared/Shared.module'

@Module({
  imports: [
    SharedModule,
    CoreModule,
    PluginModule,
    AdminModule,
    IndexingModule,
    ContentModule,
    InferenceModule,
    GenerativeModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
