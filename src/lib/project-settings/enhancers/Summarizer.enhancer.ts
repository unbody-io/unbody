import { EnhancerArgs } from '../Enhancement.types'
import { Enhancer } from '../Enhancer'

export type SummarizerEnhancerArgs = {
  model:
    | 'cohere-command-r'
    | 'openai-gpt-4o'
    | 'openai-gpt-4o-mini'
    | 'openai-gpt-3.5-turbo'

  text: string
  metadata?: string

  prompt?: string
}

export type SummarizerEnhancerResult = {
  summary: string
}

export class SummarizerEnhancer extends Enhancer<
  SummarizerEnhancerArgs,
  SummarizerEnhancerResult,
  {}
> {
  name = 'enh-actions/summarizer'

  constructor(args: EnhancerArgs<SummarizerEnhancerArgs>) {
    super(args)
  }
}
