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
    if (!storagePlugin)
      throw new Storage.Exceptions.StorageNotConfigured(
        'Storage is not configured. Please set up a storage plugin.',
      )

    const storage = new StoragePluginInstance(
      storagePlugin,
      {},
      this.plugins.resources,
    )

    return storage
  }
}

export namespace Storage {
  export namespace Exceptions {
    export class StorageNotConfigured extends Error {
      constructor(message: string) {
        super(message)
        this.name = 'StorageNotConfigured'
      }
    }
  }
}
