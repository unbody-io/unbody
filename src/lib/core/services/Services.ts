import { Modules } from '../modules'
import { Plugins } from '../plugins'
import { ProjectContext } from '../project-context'
import { ContentService } from './content'
import { IndexingService } from './indexing'

export class Services {
  public indexing: IndexingService
  public content: ContentService

  constructor(
    private _ctx: ProjectContext,
    private _plugins: Plugins,
    private _modules: Modules,
  ) {
    this.indexing = new IndexingService(this._ctx, this._plugins, this._modules)
    this.content = new ContentService(this._ctx, this._plugins, this._modules)
  }
}
