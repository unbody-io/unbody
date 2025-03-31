import { EnhancerArgs } from '../Enhancement.types'
import { Enhancer } from '../Enhancer'

export type KeywordExtractorEnhancerArgs = {
  model: 'openai-gpt-4o' | 'openai-gpt-4o-mini' | 'openai-gpt-3.5-turbo'

  text: string
  metadata?: string
}

export type KeywordExtractorEnhancerResult = {
  keywords: string[]
}

export class KeywordExtractorEnhancer extends Enhancer<
  KeywordExtractorEnhancerArgs,
  KeywordExtractorEnhancerResult,
  {}
> {
  name = 'enh-actions/keyword-extractor'

  constructor(args: EnhancerArgs<KeywordExtractorEnhancerArgs>) {
    super(args)
  }
}
