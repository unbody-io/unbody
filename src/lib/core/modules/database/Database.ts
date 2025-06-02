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

    if (!plugin)
      throw new Database.Exceptions.DatabaseNotConfigured(
        'Database is not configured. Please set up a database plugin.',
      )

    const database = new DatabasePluginInstance(
      plugin,
      { collections: this._ctx.collections.collections },
      this.plugins.resources,
    )

    return database
  }
}

export namespace Database {
  export namespace Exceptions {
    export class DatabaseNotConfigured extends Error {
      constructor(message: string) {
        super(message)
        this.name = 'DatabaseNotConfigured'
      }
    }
  }
}
