import { Injectable } from '@nestjs/common'
import { Unbody } from 'src/lib/core/Unbody'

@Injectable()
export class GraphQLService {
  constructor(private unbody: Unbody) {}

  async execGraphQLQuery(params: {
    query: string
    variables?: Record<string, any>
    headers?: Record<string, string>
  }) {
    return this.unbody.services.content.execGraphQLQuery({
      query: params.query,
      variables: params.variables,
      headers: params.headers,
    })
  }
}
