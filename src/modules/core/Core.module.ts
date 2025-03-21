import { Module } from '@nestjs/common'
import { Unbody } from 'src/lib/core/Unbody'
import { PluginRegistry } from 'src/lib/plugins/registry/PluginRegistry'
import { PluginResources } from 'src/lib/plugins/resources/PluginResources'
import { PluginModule } from '../plugins/Plugin.module'
import { UNBODY_SETTINGS } from '../shared/tokens'

@Module({
  imports: [PluginModule],
  controllers: [],
  providers: [
    {
      provide: Unbody,
      inject: [UNBODY_SETTINGS, PluginRegistry, PluginResources],
      useFactory(settings, registry, resources) {
        return new Unbody(settings, registry, resources)
      },
    },
  ],
  exports: [Unbody],
})
export class CoreModule {}
