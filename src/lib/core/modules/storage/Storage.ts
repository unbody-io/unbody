import { StoragePluginInstance } from 'src/lib/plugins/instances/StoragePlugin'
import { Plugins } from '../../plugins'
import { ProjectContext } from '../../project-context'

export class Storage {
  constructor(
    private _ctx: ProjectContext,
    private plugins: Plugins,
  ) {}

  async getStorage(params: {}) {
    const storagePlugin = await this.plugins.registry.getStorage()
    const storage = new StoragePluginInstance(
      storagePlugin,
      {},
      this.plugins.resources,
    )

    return storage
  }
}
