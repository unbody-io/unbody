import { DatabasePluginInstance } from 'src/lib/plugins/instances/DatabasePlugin'
import { Plugins } from '../../plugins'
import { ProjectContext } from '../../project-context'

export class Database {
  constructor(
    private _ctx: ProjectContext,
    private plugins: Plugins,
  ) {}

  async getDatabase(params: {}) {
    const plugin = await this.plugins.registry.getDatabase()

    const database = new DatabasePluginInstance(
      plugin,
      { collections: this._ctx.collections.collections },
      this.plugins.resources,
    )

    return database
  }
}
