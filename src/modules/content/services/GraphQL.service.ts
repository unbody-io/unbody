import { Injectable, UnprocessableEntityException } from '@nestjs/common'
import { settle } from 'src/lib/core-utils'
import { Unbody } from 'src/lib/core/Unbody'

@Injectable()
export class GraphQLService {
  constructor(private unbody: Unbody) {}

  async execGraphQLQuery(params: {
    query: string
    variables?: Record<string, any>
    headers?: Record<string, string>
  }) {
    const [res, err] = await settle(() =>
      this.unbody.services.content.execGraphQLQuery({
        query: params.query,
        variables: params.variables,
        headers: params.headers,
      }),
    )

    if (err) {
      throw new UnprocessableEntityException(err.message)
    }

    return res
  }
}
