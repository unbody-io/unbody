import { Inject, Injectable } from '@nestjs/common'
import { UnbodyPlugins, UnbodyProjectSettingsDoc } from 'src/lib/core-types'
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
    plugin: UnbodyPlugins.Registration,
    manifest: PluginManifest,
    getPluginManifest: (alias: string) => Promise<PluginManifest | null>,
    _config: Record<string, any> | undefined,
  ) {
    const config = {
      ...(_config || {}),
    }

    if (manifest.name === 'database-weaviate') {
      let baseUrl =
        this.configService.get('server.baseUrl') || 'http://localhost:3000'
      if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

      if (!config['connection']) {
        config['connection'] = {
          httpHost: '127.0.0.1',
          httpPort: 8080,
          grpcHost: '127.0.0.1',
        }
      }

      if (!config['modules']) config['modules'] = {}
      const modules = config['modules']

      if (!modules['textVectorizer']) {
        const vectorizerName = this.settings.textVectorizer.name
        const vectorizerManifest = await getPluginManifest(vectorizerName)
        const isMultimodal =
          vectorizerManifest &&
          vectorizerManifest.type === 'multimodal_vectorizer'
        const endpointURL = `${baseUrl}/inference/embeddings/${isMultimodal ? 'multimodal' : 'text'}/${vectorizerName}`
        const name = isMultimodal ? 'multi2vec-custom' : 'text2vec-huggingface'

        modules['textVectorizer'] = {
          name: name,
          multimodal: isMultimodal,
          config: {
            endpointURL,
          },
        }
      }

      if (!config['modules']?.['generative']) {
        const endpointURL = `${baseUrl}/generative/`

        modules['generative'] = {
          name: 'generative-unbody',
          config: {
            endpointURL,
          },
        }
      }

      if (!modules['imageVectorizer'] && !!this.settings.imageVectorizer) {
        const vectorizerName = this.settings.imageVectorizer.name
        const vectorizerManifest = await getPluginManifest(vectorizerName)
        const isMultimodal =
          vectorizerManifest &&
          vectorizerManifest.type === 'multimodal_vectorizer'
        const endpointURL = `${baseUrl}/inference/embeddings/${isMultimodal ? 'multimodal' : 'image'}/${vectorizerName}`
        const name = isMultimodal ? 'multi2vec-custom' : 'img2vec-custom'
        modules['imageVectorizer'] = {
          name: name,
          multimodal: isMultimodal,
          config: {
            endpointURL: endpointURL,
          },
        }
      }

      if (!modules['reranker'] && !!this.settings.reranker) {
        modules['reranker'] = {
          name: 'reranker-custom',
          config: {
            endpointURL: `${baseUrl}/inference/rerank/${this.settings.reranker.name}`,
          },
        }
      }
    }

    return config
  }
}
