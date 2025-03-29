import { RerankParams } from 'src/lib/plugins-common/reranker'
import { RerankerPluginInstance } from 'src/lib/plugins/instances/RerankerPlugin'
import { Plugins } from '../../plugins/Plugins'
import { ProjectContext } from '../../project-context'

export class Reranker {
  constructor(
    private _ctx: ProjectContext,
    private plugins: Plugins,
  ) {}

  async rerank(params: { reranker?: string; params: RerankParams }) {
    const reranker = await this.getReranker(params.reranker)
    if (!reranker) throw new Error('Reranker not found or not configured')

    const result = await reranker.rerank({
      ...params.params,
      options:
        (params.params.options
          ? params.params.options
          : this._ctx.settings.reranker?.options) || {},
    })

    return result
  }

  async getReranker(alias?: string) {
    if (alias) {
      const plugin = await this.plugins.registry.getReranker(alias)
      if (!plugin) return null

      return new RerankerPluginInstance(plugin, {}, this.plugins.resources)
    }

    const conf = this._ctx.settings.reranker
    if (!conf) return null

    const plugin = await this.plugins.registry.getReranker(conf.name)
    if (!plugin) return null

    return new RerankerPluginInstance(plugin, {}, this.plugins.resources)
  }
}
