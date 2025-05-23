import { PluginTypes } from 'src/lib/plugins-common'
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
    protected override plugin: LoadedPlugin,
    protected override config: StoragePluginInstanceConfig,
    protected override resources: PluginResources,
  ) {
    super(config, plugin, resources, StoragePluginInstance.methods)
  }

  override get type() {
    return this.plugin.manifest.type as typeof PluginTypes.Storage
  }
}

export interface StoragePluginInstance
  extends PluginInstanceMethods<StoragePlugin> {}
