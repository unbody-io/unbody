import { UnbodyProjectSettingsDoc } from '../core-types'
import { PluginRegistry } from '../plugins/registry/PluginRegistry'
import { PluginResources } from '../plugins/resources/PluginResources'
import { Modules } from './modules/Modules'
import { Plugins } from './plugins/Plugins'
import { ProjectContext } from './project-context'
import { Services } from './services'

export class Unbody {
  public ctx: ProjectContext

  public modules: Modules
  public plugins: Plugins
  public services: Services

  constructor(
    private readonly _settings: UnbodyProjectSettingsDoc,
    private readonly _pluginRegistry: PluginRegistry,
    private readonly _pluginResources: PluginResources,
  ) {
    this.ctx = new ProjectContext(this._settings)

    this.plugins = new Plugins(
      this.ctx,
      this._pluginRegistry,
      this._pluginResources,
    )
    this.modules = new Modules(this.ctx, this.plugins)
    this.services = new Services(this.ctx, this.plugins, this.modules)
  }
}
