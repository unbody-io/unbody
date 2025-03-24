import { GenerativePlugin } from 'src/lib/plugins-common/generative'
import { PluginResources } from '../resources/PluginResources'
import { LoadedPlugin } from '../shared.types'
import {
  PluginInstance,
  PluginInstanceBaseConfig,
  PluginInstanceMethods,
} from './PluginInstance'

export type GenerativePluginInstanceConfig = PluginInstanceBaseConfig & {}

export class GenerativePluginInstance extends PluginInstance<GenerativePluginInstanceConfig> {
  static methods: Array<keyof GenerativePlugin> = [
    'generateText',
    'getSupportedModels',
  ]

  constructor(
    protected plugin: LoadedPlugin,
    protected config: GenerativePluginInstanceConfig,
    protected resources: PluginResources,
  ) {
    super(config, plugin, resources, GenerativePluginInstance.methods)
  }

  async getDefaultOptions() {
    return this.plugin.runner.config.pluginConfig.options || {}
  }
}

export interface GenerativePluginInstance
  extends PluginInstanceMethods<GenerativePlugin> {}
