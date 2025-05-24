import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  SetMetadata,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Request } from 'express'
import { SkipFormatResponseInterceptor } from 'src/lib/nestjs-utils'
import { ExecGraphQLQueryDto } from '../dto/ExecGraphQLQuery.dto'
import { GraphQLService } from '../services/GraphQL.service'

@ApiTags('Content API')
@Controller('/content/graphql')
export class GraphQLController {
  constructor(private graphQLService: GraphQLService) {}

  @Post('/')
  @HttpCode(200)
  @SetMetadata(SkipFormatResponseInterceptor, true)
  async post(@Body() body: ExecGraphQLQueryDto, @Req() req: Request) {
    const headers = req.rawHeaders.reduce(
      (acc, curr, i) => {
        if (i % 2 === 0) {
          acc[curr] = req.rawHeaders[i + 1]
        }
        return acc
      },
      {} as Record<string, string>,
    )

    return this.graphQLService.execGraphQLQuery({
      query: body.query,
      headers: headers,
      variables: body.variables,
    })
  }
}
