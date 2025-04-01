import { TextVectorizerPlugin } from 'src/lib/plugins-common/text-vectorizer'
import { PluginResources } from '../resources/PluginResources'
import { LoadedPlugin } from '../shared.types'
import {
  PluginInstance,
  PluginInstanceBaseConfig,
  PluginInstanceMethods,
} from './PluginInstance'
import { PluginTypes } from 'src/lib/plugins-common'

export type TextVectorizerPluginInstanceConfig = PluginInstanceBaseConfig & {}

export class TextVectorizerPluginInstance extends PluginInstance<TextVectorizerPluginInstanceConfig> {
  static methods: Array<keyof TextVectorizerPlugin> = ['vectorize']

  constructor(
    protected plugin: LoadedPlugin,
    protected config: TextVectorizerPluginInstanceConfig,
    protected resources: PluginResources,
  ) {
    super(config, plugin, resources, TextVectorizerPluginInstance.methods)
  }

  get type() {
    return this.plugin.manifest.type as typeof PluginTypes.TextVectorizer
  }
}

export interface TextVectorizerPluginInstance
  extends PluginInstanceMethods<TextVectorizerPlugin> {}
