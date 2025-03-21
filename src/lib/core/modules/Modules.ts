import { Plugins } from '../plugins/Plugins'
import { ProjectContext } from '../project-context'
import { Database } from './database'
import { Enhancer } from './enhancer'
import { FileParsers } from './file-parsers'
import { Providers } from './providers'
import { Storage } from './storage'
import { Vectorizer } from './vectorizer'

export class Modules {
  public enhancer: Enhancer
  public vectorizer: Vectorizer
  public fileParsers: FileParsers
  public providers: Providers
  public database: Database
  public storage: Storage

  constructor(
    private readonly _ctx: ProjectContext,
    private readonly _plugins: Plugins,
  ) {
    this.enhancer = new Enhancer(this._ctx, this._plugins)
    this.vectorizer = new Vectorizer(this._ctx, this._plugins)
    this.fileParsers = new FileParsers(this._ctx, this._plugins)
    this.providers = new Providers(this._ctx, this._plugins)
    this.database = new Database(this._ctx, this._plugins)
    this.storage = new Storage(this._ctx, this._plugins)
  }
}
