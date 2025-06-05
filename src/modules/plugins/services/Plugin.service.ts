import { Injectable } from '@nestjs/common'
import { UnbodyPlugins } from 'src/lib/core-types'
import { ConfigService } from 'src/lib/nestjs-utils'
import * as BuiltinPlugins from '../builtin'

@Injectable()
export class PluginService {
  constructor(configService: ConfigService) {}

  getPlugins(): UnbodyPlugins.Registration[] {
    return Object.values(BuiltinPlugins.plugins)
  }

  getRegistrationErrorSuggestion(alias: string): string | undefined {
    if (BuiltinPlugins.isBuiltInPlugin(alias)) {
      return BuiltinPlugins.plugins[alias].errorResolutionSuggestion
    }

    return undefined
  }
}
