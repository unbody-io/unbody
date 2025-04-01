import { ImageVectorizerPlugin } from 'src/lib/plugins-common/image-vectorizer'
import { PluginResources } from '../resources/PluginResources'
import { LoadedPlugin } from '../shared.types'
import {
  PluginInstance,
  PluginInstanceBaseConfig,
  PluginInstanceMethods,
} from './PluginInstance'
import { PluginTypes } from 'src/lib/plugins-common'

export type ImageVectorizerPluginInstanceConfig = PluginInstanceBaseConfig & {}

export class ImageVectorizerPluginInstance extends PluginInstance<ImageVectorizerPluginInstanceConfig> {
  static methods: Array<keyof ImageVectorizerPlugin> = ['vectorize']

  constructor(
    protected plugin: LoadedPlugin,
    protected config: ImageVectorizerPluginInstanceConfig,
    protected resources: PluginResources,
  ) {
    super(config, plugin, resources, ImageVectorizerPluginInstance.methods)
  }

  get type() {
    return this.plugin.manifest.type as typeof PluginTypes.ImageVectorizer
  }
}

export interface ImageVectorizerPluginInstance
  extends PluginInstanceMethods<ImageVectorizerPlugin> {}
