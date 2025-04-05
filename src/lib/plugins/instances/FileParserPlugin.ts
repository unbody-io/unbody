import { PluginTypes } from 'src/lib/plugins-common'
import {
  FileParserPlugin,
  ParseFileParams,
} from 'src/lib/plugins-common/file-parser'
import { fromZodIssue } from 'zod-validation-error'
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

  protected override _runTask = async <
    T extends Record<string, any> = Record<string, any>,
    R extends Record<string, any> = Record<string, any>,
  >(
    task: string,
    context: any,
    params: T,
  ) => {
    if (task === 'parseFile') {
      const _params = params as any as ParseFileParams
      if (_params.options) {
        const options = _params.options || {}
        const schema = await this.plugin.runner.getSchema(task)
        if (schema) {
          const validation = schema.safeParse(options)
          if (validation.success) {
            _params.options = validation.data
          } else
            throw new FileParserPlugin.Exceptions.InvalidParserOptions(
              validation.error.message,
              validation.error.issues.map((issue) => ({
                path: issue.path,
                message: fromZodIssue(issue).message,
              })),
            )
        }
      }
    }

    return this.plugin.runner.runTask<T, R>(task, { ...context }, params)
  }
}

export interface FileParserPluginInstance
  extends PluginInstanceMethods<FileParserPlugin> {}
