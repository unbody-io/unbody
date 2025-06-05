import { PluginTypes } from 'src/lib/plugins-common'
import { ImageVectorizerPlugin } from 'src/lib/plugins-common/image-vectorizer'
import { PluginResources } from '../resources/PluginResources'
import { LoadedPlugin } from '../shared.types'
import {
  PluginInstance,
  PluginInstanceBaseConfig,
  PluginInstanceMethods,
} from './PluginInstance'

export type ImageVectorizerPluginInstanceConfig = PluginInstanceBaseConfig & {}

export class ImageVectorizerPluginInstance extends PluginInstance<ImageVectorizerPluginInstanceConfig> {
  static methods: Array<keyof ImageVectorizerPlugin> = ['vectorize']

  constructor(
    protected override plugin: LoadedPlugin,
    protected override config: ImageVectorizerPluginInstanceConfig,
    protected override resources: PluginResources,
  ) {
    super(config, plugin, resources, ImageVectorizerPluginInstance.methods)
  }

  override get type() {
    return this.plugin.manifest.type as typeof PluginTypes.ImageVectorizer
  }
}

export interface ImageVectorizerPluginInstance
  extends PluginInstanceMethods<ImageVectorizerPlugin> {}
