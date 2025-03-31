import { EnhancerArgs } from '../Enhancement.types'
import { Enhancer } from '../Enhancer'

export type TopicExtractorEnhancerArgs = {
  model: 'openai-gpt-4o' | 'openai-gpt-4o-mini' | 'openai-gpt-3.5-turbo'

  text: string
  metadata?: string
}

export type TopicExtractorEnhancerResult = {
  topics: string[]
}

export class TopicExtractorEnhancer extends Enhancer<
  TopicExtractorEnhancerArgs,
  TopicExtractorEnhancerResult,
  {}
> {
  name = 'enh-actions/topic-extractor'

  constructor(args: EnhancerArgs<TopicExtractorEnhancerArgs>) {
    super(args)
  }
}
