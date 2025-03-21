import {
  ProviderPlugin,
  ProviderPluginContext,
} from 'src/lib/plugins-common/provider'
import { PluginResources } from '../resources/PluginResources'
import { LoadedPlugin } from '../shared.types'
import {
  PluginInstance,
  PluginInstanceBaseConfig,
  PluginInstanceMethods,
} from './PluginInstance'

export type ProviderPluginInstanceConfig = PluginInstanceBaseConfig & {
  source?: ProviderPluginContext['source']
}

export class ProviderPluginInstance extends PluginInstance<ProviderPluginInstanceConfig> {
  static methods: Array<keyof ProviderPlugin> = [
    'listEntrypointOptions',
    'handleEntrypointUpdate',
    'validateEntrypoint',
    'connect',
    'verifyConnection',
    'initSource',
    'handleSourceUpdate',
    'getRecordMetadata',
    'getRecord',
    'processRecord',
    'registerObserver',
    'unregisterObserver',
  ]

  constructor(
    protected plugin: LoadedPlugin,
    protected config: ProviderPluginInstanceConfig,
    protected resources: PluginResources,
  ) {
    super(config, plugin, resources, ProviderPluginInstance.methods)
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
      { ...context, source: this.config.source },
      params,
    )
  }
}

export interface ProviderPluginInstance
  extends PluginInstanceMethods<ProviderPlugin> {}
