import { Module } from '@nestjs/common'
import { UnbodyProjectSettingsDoc } from 'src/lib/core-types'
import { settle } from 'src/lib/core-utils'
import { Unbody } from 'src/lib/core/Unbody'
import { PluginRegistry } from 'src/lib/plugins/registry/PluginRegistry'
import { PluginResources } from 'src/lib/plugins/resources/PluginResources'
import { z } from 'zod'
import { fromZodIssue } from 'zod-validation-error'
import { PluginModule } from '../plugins/Plugin.module'
import { UNBODY_SETTINGS } from '../shared/tokens'

@Module({
  imports: [PluginModule],
  controllers: [],
  providers: [
    {
      provide: Unbody,
      inject: [UNBODY_SETTINGS, PluginRegistry, PluginResources],
      async useFactory(settings, registry, resources) {
        const [parsed, err] = await settle(() =>
          Unbody.validateSettings(settings, registry),
        )

        if (err) {
          if (err instanceof z.ZodError) {
            const messages = err.issues.map(
              (issue) =>
                `\t - "${issue.path}": ${fromZodIssue(issue).message}`,
            )

            throw new Error(
              `Invalid project settings:\n\n${messages.join('\n')}\n`,
            )
          }
          throw err
        }

        return new Unbody(
          parsed as UnbodyProjectSettingsDoc,
          registry,
          resources,
        )
      },
    },
  ],
  exports: [Unbody],
})
export class CoreModule {}
