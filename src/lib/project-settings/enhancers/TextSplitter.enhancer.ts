import { EnhancerArgs, GraphQLRecordType } from '../Enhancement.types'
import { Enhancer } from '../Enhancer'

export type TextSplitterEnhancerArgs = {
  text: string
  size?: number
  overlap?: number
  separator?: string[]
  strategy?: 'fixed' | 'character' | 'recursive' | 'markdown'
}

export type TextSplitterEnhancerResult = {
  blocks: {
    __typename: 'TextBlock'

    tagName: 'p'
    text: string
    html: string
    order: number
  }[]
}

export type TextSplitterEnhancerHelpers = {}

export class TextSplitterEnhancer extends Enhancer<
  TextSplitterEnhancerArgs,
  TextSplitterEnhancerResult,
  TextSplitterEnhancerHelpers
> {
  name = 'enh-actions/text-splitter'

  constructor(
    args: EnhancerArgs<
      TextSplitterEnhancerArgs,
      GraphQLRecordType,
      TextSplitterEnhancerHelpers
    >,
  ) {
    super(args)
  }
}
