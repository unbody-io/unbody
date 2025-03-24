import { Modules } from '../../modules'
import { Plugins } from '../../plugins'
import { ProjectContext } from '../../project-context'

export class ContentService {
  constructor(
    private _ctx: ProjectContext,
    private _plugins: Plugins,
    private _modules: Modules,
  ) {}

  async execGraphQLQuery(params: {
    query: string
    variables?: Record<string, any>
    headers?: Record<string, string>
  }) {
    const database = await this._modules.database.getDatabase({})

    const res = await database.executeQuery({
      query: params.query,
      headers: params.headers || {},
      variables: params.variables || {},
    })

    return res.result
  }
}
