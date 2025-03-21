import { UnbodySourceDoc } from 'src/lib/core-types'
import { ProviderPluginInstance } from 'src/lib/plugins/instances/ProviderPlugin'
import { Plugins } from '../../plugins'
import { ProjectContext } from '../../project-context'

export class Providers {
  constructor(
    private _ctx: ProjectContext,
    private plugins: Plugins,
  ) {}

  async getProvider(params: { provider: string; source?: UnbodySourceDoc }) {
    const plugin = await this.plugins.registry.getProvider(params.provider)

    const source = params.source

    const provider = new ProviderPluginInstance(
      plugin,
      {
        ...(source
          ? {
              source: {
                id: source.id,
                dispatchEvent: null as any,
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
