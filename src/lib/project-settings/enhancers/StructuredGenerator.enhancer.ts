import { infer as ZodInfer, z, ZodObject } from 'zod'
import { EnhancerArgs, GraphQLRecordType } from '../Enhancement.types'
import { Enhancer } from '../Enhancer'

export type StructuredGeneratorEnhancerArgs<T extends ZodObject<any>> = {
  model: 'openai-gpt-4o' | 'openai-gpt-4o-mini'

  prompt: string
  schema: T
  withContext?: boolean
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  images?: {
    url: string
  }[]
}

export type StructuredGeneratorEnhancerResult<T> = {
  json: T
}

export class StructuredGeneratorEnhancer<
  T extends ZodObject<any>,
> extends Enhancer<
  StructuredGeneratorEnhancerArgs<T>,
  StructuredGeneratorEnhancerResult<ZodInfer<T>>,
  {
    z: typeof z
  }
> {
  name = 'enh-actions/structured-generator'

  readonly __result: StructuredGeneratorEnhancerResult<ZodInfer<T>> = {} as any

  constructor(
    args: EnhancerArgs<
      StructuredGeneratorEnhancerArgs<T>,
      GraphQLRecordType,
      {
        z: typeof z
      }
    >,
  ) {
    super(args)
  }
}
