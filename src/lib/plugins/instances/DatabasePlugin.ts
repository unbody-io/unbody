import { CollectionConfig } from 'src/lib/core-types'
import { PluginTypes } from 'src/lib/plugins-common'
import {
  DatabasePlugin,
  DatabasePluginContext,
} from 'src/lib/plugins-common/database'
import { PluginResources } from '../resources/PluginResources'
import { LoadedPlugin } from '../shared.types'
import {
  PluginInstance,
  PluginInstanceBaseConfig,
  PluginInstanceMethods,
} from './PluginInstance'

export type DatabasePluginInstanceConfig = PluginInstanceBaseConfig & {
  collections: CollectionConfig[]
}

export class DatabasePluginInstance extends PluginInstance<DatabasePluginInstanceConfig> {
  static methods: Array<keyof DatabasePlugin> = [
    'configureDatabase',
    'countSourceRecords',
    'deleteRecord',
    'eraseDatabase',
    'eraseSourceRecords',
    'executeQuery',
    'getObject',
    'getObjectId',
    'getRecord',
    'insertRecord',
    'patchObject',
    'patchRecord',
  ]

  constructor(
    protected override plugin: LoadedPlugin,
    protected override config: DatabasePluginInstanceConfig,
    protected override resources: PluginResources,
  ) {
    super(config, plugin, resources, DatabasePluginInstance.methods)
  }

  override get type() {
    return this.plugin.manifest.type as typeof PluginTypes.Database
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
        collections: this.config.collections,
      } as DatabasePluginContext,
      params,
    )
  }
}

export interface DatabasePluginInstance
  extends PluginInstanceMethods<DatabasePlugin> {}
