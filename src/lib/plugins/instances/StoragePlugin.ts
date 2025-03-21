import { StoragePlugin } from 'src/lib/plugins-common/storage'
import { PluginResources } from '../resources/PluginResources'
import { LoadedPlugin } from '../shared.types'
import {
  PluginInstance,
  PluginInstanceBaseConfig,
  PluginInstanceMethods,
} from './PluginInstance'

export type StoragePluginInstanceConfig = PluginInstanceBaseConfig & {}

export class StoragePluginInstance extends PluginInstance<StoragePluginInstanceConfig> {
  static methods: Array<keyof StoragePlugin> = [
    'storeFile',
    'deleteFile',
    'getRecordFiles',
    'changeFileVisibility',
    'deleteRecordFiles',
    'deleteSourceFiles',
  ]

  constructor(
    protected plugin: LoadedPlugin,
    protected config: StoragePluginInstanceConfig,
    protected resources: PluginResources,
  ) {
    super(config, plugin, resources, StoragePluginInstance.methods)
  }
}

export interface StoragePluginInstance
  extends PluginInstanceMethods<StoragePlugin> {}
