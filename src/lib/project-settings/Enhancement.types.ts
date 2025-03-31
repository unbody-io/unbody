import { JsonSerializable } from '../common.types'

export type GraphQLRecordType = {
  __typename: string
  [key: string]: any
}

export type EnhancementStepContext<
  O = Record<string, any>,
  R = Record<string, any>,
> = {
  output: O
  result: R

  skipped?: boolean
  failedAt?: Date
  startedAt?: Date
  finishedAt?: Date
}

export type EnhancementContext<
  T extends GraphQLRecordType = GraphQLRecordType,
  R = Record<string, any>,
> = {
  source: {
    id: string
    type: string
    name: string
    createdAt: Date
    updatedAt: Date
  }

  project: {
    id: string
    name: string
    createdAt: Date
    updatedAt: Date
    settings: Record<string, any>
  }

  vars: Record<string, any>

  record: T
  steps: Record<string, EnhancementStepContext>
  result: R
}

export type EnhancerArg<
  T,
  Re extends GraphQLRecordType = GraphQLRecordType,
  H extends Record<string, any> = Record<string, any>,
> =
  | T
  | ((context: Omit<EnhancementContext<Re, null>, 'result'>, helpers: H) => T)

export type EnhancerCondition<
  Re extends GraphQLRecordType = GraphQLRecordType,
> = (context: EnhancementContext<Re, null>) => boolean

export type EnhancerVar<Re extends GraphQLRecordType = GraphQLRecordType> =
  | JsonSerializable
  | ((
      context: Omit<EnhancementContext<Re, null>, 'steps' | 'result'>,
    ) => JsonSerializable)

export type EnhancerOutput<
  Re extends GraphQLRecordType = GraphQLRecordType,
  R extends Record<string, any> = Record<string, any>,
> = (context: EnhancementContext<Re, R>) => any

export type EnhancerArgs<
  T extends Record<string, any> = Record<string, any>,
  Re extends GraphQLRecordType = GraphQLRecordType,
  H extends Record<string, any> = Record<string, any>,
> = {
  [K in keyof T]: EnhancerArg<T[K], Re, H>
}
