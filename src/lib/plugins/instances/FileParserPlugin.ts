import { PluginTypes } from 'src/lib/plugins-common'
import { FileParserPlugin } from 'src/lib/plugins-common/file-parser'
import { PluginResources } from '../resources/PluginResources'
import { LoadedPlugin } from '../shared.types'
import {
  PluginInstance,
  PluginInstanceBaseConfig,
  PluginInstanceMethods,
} from './PluginInstance'

export type FileParserPluginInstanceConfig = PluginInstanceBaseConfig & {}

export class FileParserPluginInstance extends PluginInstance<FileParserPluginInstanceConfig> {
  static methods: Array<keyof FileParserPlugin> = [
    'parseFile',
    'processFileRecord',
  ]

  constructor(
    protected plugin: LoadedPlugin,
    protected config: FileParserPluginInstanceConfig,
    protected resources: PluginResources,
  ) {
    super(config, plugin, resources, FileParserPluginInstance.methods)
  }

  get type() {
    return this.plugin.manifest.type as typeof PluginTypes.FileParser
  }
}

export interface FileParserPluginInstance
  extends PluginInstanceMethods<FileParserPlugin> {}
