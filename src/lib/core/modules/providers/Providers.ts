import { UnbodySourceDoc } from 'src/lib/core-types'
import { ProviderPluginInstance } from 'src/lib/plugins/instances/ProviderPlugin'
import { Plugins } from '../../plugins'
import { ProjectContext } from '../../project-context'
import { ProviderPlugin } from 'src/lib/plugins-common/provider'

export class Providers {
  constructor(
    private _ctx: ProjectContext,
    private plugins: Plugins,
  ) {}

  async getProvider(params: { provider: string; source?: UnbodySourceDoc }) {
    const plugin = await this.plugins.registry.getProvider(params.provider)
    if (!plugin) {
      throw new Providers.Exceptions.ProviderNotFound(
        `Provider ${params.provider} not found`,
      )
    }

    const source = params.source

    const provider = new ProviderPluginInstance(
      plugin,
      {
        ...(source
          ? {
              source: {
                id: source.id,
                state: source.providerState || {},
                entrypoint: source.entrypoint || {},
                credentials: source.credentials || {},
              },
            }
          : {}),
      },
      this.plugins.resources,
    )

    return provider
  }
}

export namespace Providers {
  export namespace Exceptions {
    export class ProviderNotFound extends Error {
      constructor(message: string) {
        super(message)
        this.name = 'ProviderNotFound'
      }
    }

    export import InvalidEntrypoint = ProviderPlugin.Exceptions.InvalidEntrypoint
    export import EntrypointAccessDenied = ProviderPlugin.Exceptions.EntrypointAccessDenied
    export import InvalidConnection = ProviderPlugin.Exceptions.InvalidConnection
    export import NotConnected = ProviderPlugin.Exceptions.NotConnected
    export import FileNotFound = ProviderPlugin.Exceptions.FileNotFound
    export import ProviderRequest = ProviderPlugin.Exceptions.ProviderRequest
  }
}
