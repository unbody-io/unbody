import { PluginTypes } from 'src/lib/plugins-common'
import { MultimodalVectorizerPlugin } from 'src/lib/plugins-common/multimodal-vectorizer'
import { PluginResources } from '../resources/PluginResources'
import { LoadedPlugin } from '../shared.types'
import {
  PluginInstance,
  PluginInstanceBaseConfig,
  PluginInstanceMethods,
} from './PluginInstance'

export type MultimodalVectorizerPluginInstanceConfig =
  PluginInstanceBaseConfig & {}

export class MultimodalVectorizerPluginInstance extends PluginInstance<MultimodalVectorizerPluginInstanceConfig> {
  static methods: Array<keyof MultimodalVectorizerPlugin> = ['vectorize']

  constructor(
    protected plugin: LoadedPlugin,
    protected config: MultimodalVectorizerPluginInstanceConfig,
    protected resources: PluginResources,
  ) {
    super(config, plugin, resources, MultimodalVectorizerPluginInstance.methods)
  }

  get type() {
    return this.plugin.manifest.type as typeof PluginTypes.MultimodalVectorizer
  }
}

export interface MultimodalVectorizerPluginInstance
  extends PluginInstanceMethods<MultimodalVectorizerPlugin> {}
