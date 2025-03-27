import { Injectable, UnprocessableEntityException } from '@nestjs/common'
import { settle } from 'src/lib/core-utils'
import { Unbody } from 'src/lib/core/Unbody'
import { ConfigService } from 'src/lib/nestjs-utils'

@Injectable()
export class GraphQLService {
  constructor(
    private configService: ConfigService,
    private unbody: Unbody,
  ) {}

  async execGraphQLQuery(params: {
    query: string
    variables?: Record<string, any>
    headers?: Record<string, string>
  }) {
    let baseUrl =
      this.configService.get('server.baseUrl') || 'http://localhost:3000'
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

    const [res, err] = await settle(() =>
      this.unbody.services.content.execGraphQLQuery({
        query: params.query,
        variables: params.variables,
        headers: {
          ...params.headers,
          'X-Unbody-Project-ID': 'default',
          'X-Unbody-Api-Key': 'default',
          'X-Unbody-Generative-Base-Url': `${baseUrl}/generative/`,
        },
      }),
    )

    if (err) {
      throw new UnprocessableEntityException(err.message)
    }

    return res
  }
}
