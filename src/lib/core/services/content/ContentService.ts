import { HttpException } from '@nestjs/common'
import { settle } from 'src/lib/core-utils'
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

    const [res, err] = await settle(() =>
      database.executeQuery({
        query: params.query,
        headers: params.headers || {},
        variables: params.variables || {},
      }),
    )

    if (err) {
      if (err['response']) {
        throw new HttpException(
          err['response'].data || err['response']['error'],
          err['response'].status,
        )
      }

      throw err
    }

    return res.result
  }
}
