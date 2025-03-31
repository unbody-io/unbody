import {
  EnhancerCondition,
  EnhancerOutput,
  GraphQLRecordType,
} from './Enhancement.types'
import { Enhancer } from './Enhancer'
import { serializeComputedArg } from './utils'

export class EnhancementPipelineStep<E extends Enhancer = Enhancer> {
  public name: string = 'step'

  constructor(
    name: string,
    public enhancer: E,
    public config: {
      if?: EnhancerCondition
      onFailure?: 'continue' | 'stop'
      output: Record<string, EnhancerOutput<GraphQLRecordType, E['__result']>>
    },
  ) {
    this.name = name
  }

  toJSON = () => {
    const enhancer = this.enhancer.toJSON()

    return {
      name: this.name,
      action: {
        name: enhancer.name,
        args: enhancer.args,
      },
      output: Object.fromEntries(
        Object.entries(this.config.output || {}).map(([key, value]) => {
          return [
            key,
            {
              type: 'computed',
              value: serializeComputedArg(value),
            },
          ]
        }),
      ),
      ...(this.config.if ? { if: serializeComputedArg(this.config.if) } : {}),
      ...(this.config.onFailure ? { onFailure: this.config.onFailure } : {}),
    }
  }

  static fromJSON = (data: any) => {
    if (!data?.name || !data?.action || !data?.output) {
      throw new Error('Invalid EnhancementPipelineStep configuration')
    }

    const enhancer = Enhancer.fromJSON(data.action)

    return new EnhancementPipelineStep(data.name, enhancer, {
      output: Object.fromEntries(
        Object.entries(data.output || {}).map(([key, value]) => [
          key,
          eval((value as any).value as string),
        ]),
      ),
      if: typeof data.if === 'string' ? eval(data.if) : undefined,
      onFailure: data.onFailure,
    })
  }
}
