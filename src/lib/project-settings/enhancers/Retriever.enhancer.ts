import { EnhancerArgs, GraphQLRecordType } from '../Enhancement.types'
import { Enhancer } from '../Enhancer'
// import { Unbody } from '@unbody-io/ts-client'

export type RetrieverEnhancerArgs = {
  query: string
}

export type RetrieverEnhancerResult = {
  payload: any[]
}

export type RetrieverEnhancerHelpers = {
  // unbody: Unbody
}

export class RetrieverEnhancer extends Enhancer<
  RetrieverEnhancerArgs,
  RetrieverEnhancerResult,
  RetrieverEnhancerHelpers
> {
  name = 'enh-actions/retriever'

  constructor(
    args: EnhancerArgs<
      RetrieverEnhancerArgs,
      GraphQLRecordType,
      RetrieverEnhancerHelpers
    >,
  ) {
    super(args)
  }
}
