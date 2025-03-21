import {
  EnhancerPlugin,
  EnhancerPluginContext,
} from 'src/lib/plugins-common/enhancer'
import { PluginResources } from '../resources/PluginResources'
import { LoadedPlugin } from '../shared.types'
import {
  PluginInstance,
  PluginInstanceBaseConfig,
  PluginInstanceMethods,
} from './PluginInstance'

export type EnhancerPluginInstanceConfig = PluginInstanceBaseConfig & {}

export class EnhancerPluginInstance extends PluginInstance<EnhancerPluginInstanceConfig> {
  static methods: Array<keyof EnhancerPlugin> = ['enhance']

  constructor(
    protected plugin: LoadedPlugin,
    protected config: EnhancerPluginInstanceConfig,
    protected resources: PluginResources,
  ) {
    super(config, plugin, resources, EnhancerPluginInstance.methods)
  }

  protected override _runTask = <
    T extends Record<string, any> = Record<string, any>,
    R extends Record<string, any> = Record<string, any>,
  >(
    task: string,
    context: any,
    params: T,
  ) => {
    return this.plugin.runner.runTask<T, R>(
      task,
      {
        ...context,
      } as EnhancerPluginContext,
      params,
    )
  }
}

export interface EnhancerPluginInstance
  extends PluginInstanceMethods<EnhancerPlugin> {}
