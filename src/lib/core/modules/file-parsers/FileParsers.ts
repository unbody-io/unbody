import { FileParserPluginInstance } from 'src/lib/plugins/instances/FileParserPlugin'
import { Plugins } from '../../plugins'
import { ProjectContext } from '../../project-context'

export class FileParsers {
  constructor(
    private _ctx: ProjectContext,
    private plugins: Plugins,
  ) {}

  async getParsersByMimeType({ mimeType }: { mimeType: string }) {
    const { settings } = this._ctx

    const configs = Object.entries(settings.fileParsers || {})
    const map = configs.find(([pattern]) =>
      new RegExp(pattern).test(mimeType),
    )?.[1]

    if (!map) return []

    const config = Array.isArray(map) ? map : [map]
    return config.map(({ name, options }) => ({
      alias: name,
      options,
    }))
  }

  async getParser(alias: string) {
    const plugin = this.plugins.registry.fileParsers[alias]
    if (!plugin) return null

    return new FileParserPluginInstance(plugin, {}, this.plugins.resources)
  }
}
