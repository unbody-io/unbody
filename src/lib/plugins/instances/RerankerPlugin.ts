import { PluginTypes } from 'src/lib/plugins-common'
import { RerankerPlugin } from 'src/lib/plugins-common/reranker/Reranker.interface'
import { PluginResources } from '../resources/PluginResources'
import { LoadedPlugin } from '../shared.types'
import {
  PluginInstance,
  PluginInstanceBaseConfig,
  PluginInstanceMethods,
} from './PluginInstance'

export type RerankerPluginInstanceConfig = PluginInstanceBaseConfig & {}

export class RerankerPluginInstance extends PluginInstance<RerankerPluginInstanceConfig> {
  static methods: Array<keyof RerankerPlugin> = ['rerank']

  constructor(
    protected plugin: LoadedPlugin,
    protected config: RerankerPluginInstanceConfig,
    protected resources: PluginResources,
  ) {
    super(config, plugin, resources, RerankerPluginInstance.methods)
  }

  get type() {
    return this.plugin.manifest.type as typeof PluginTypes.Reranker
  }
}

export interface RerankerPluginInstance
  extends PluginInstanceMethods<RerankerPlugin> {}
