import { Inject, Injectable } from '@nestjs/common'
import {
  UnbodyProjectSettings,
  UnbodyProjectSettingsDoc,
} from 'src/lib/core-types'
import { ConfigService } from 'src/lib/nestjs-utils'
import { PluginManifest } from 'src/lib/plugins-common'
import { UNBODY_SETTINGS } from 'src/modules/shared/tokens'

@Injectable()
export class PluginConfigService {
  constructor(
    private configService: ConfigService,
    @Inject(UNBODY_SETTINGS) private settings: UnbodyProjectSettingsDoc,
  ) {}

  async loadPluginConfig(
    plugin: UnbodyProjectSettings.PluginRegistration,
    manifest: PluginManifest,
    _config: Record<string, any> | undefined,
  ) {
    const config = {
      ...(_config || {}),
    }

    if (manifest.name === 'database-weaviate') {
      let baseUrl =
        this.configService.get('server.baseUrl') || 'http://localhost:3000'
      if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

      if (!config.connection) {
        config.connection = {
          httpHost: '127.0.0.1',
          httpPort: 8080,
          grpcHost: '127.0.0.1',
        }
      }

      if (!config.modules?.textVectorizer) {
        const endpointURL = `${baseUrl}/inference/embeddings/text/${this.settings.modules.textVectorizer.name}`

        config.modules = {
          ...config.modules,
          textVectorizer: {
            name: this.settings.modules.textVectorizer.name,
            config: {
              endpointURL,
            },
          },
        }
      }

      if (!config.modules?.generative) {
        const endpointURL = `${baseUrl}/generative/`

        config.modules = {
          ...config.modules,
          generative: {
            name: 'generative-unbody',
            config: {
              endpointURL,
            },
          },
        }
      }

      if (
        !config.modules?.imageVectorizer &&
        !!this.settings.modules.imageVectorizer
      ) {
        config.modules = {
          ...config.modules,
          imageVectorizer: {
            name: 'img2vec-custom',
            config: {
              imageFields: ['blob'],
              endpointURL: `${baseUrl}/inference/embeddings/image/${this.settings.modules.imageVectorizer.name}`,
            },
          },
        }
      }
    }

    return config
  }
}
