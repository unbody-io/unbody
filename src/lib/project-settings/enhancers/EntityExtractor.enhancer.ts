import { EnhancerArgs } from '../Enhancement.types'
import { Enhancer } from '../Enhancer'

export type EntityExtractorEnhancerArgs = {
  model: 'openai-gpt-4o' | 'openai-gpt-4o-mini' | 'openai-gpt-3.5-turbo'

  text: string
  metadata?: string
}

export type EntityExtractorEnhancerResult = {
  entities: string[]
}

export class EntityExtractorEnhancer extends Enhancer<
  EntityExtractorEnhancerArgs,
  EntityExtractorEnhancerResult,
  {}
> {
  name = 'enh-actions/entity-extractor'

  constructor(args: EnhancerArgs<EntityExtractorEnhancerArgs>) {
    super(args)
  }
}
