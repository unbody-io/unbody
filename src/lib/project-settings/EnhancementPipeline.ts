import { EnhancerCondition, EnhancerVar } from './Enhancement.types'
import { EnhancementPipelineStep } from './EnhancementPipelineStep'
import { serializeComputedArg } from './utils'

type EnhancementPipelineOptions = {
  if?: EnhancerCondition
  vars?: Record<string, EnhancerVar>
}

export class EnhancementPipeline {
  public name: string = 'enhancement-pipeline'
  public collection: string = ''
  public steps: EnhancementPipelineStep<any>[] = []
  public options: EnhancementPipelineOptions = {}

  constructor(
    name: string,
    collection: string,
    options: EnhancementPipelineOptions = {},
  ) {
    this.name = name
    this.collection = collection
    this.options = options

    this.steps = []
  }

  add = (step: EnhancementPipelineStep<any>) => {
    this.steps.push(step)

    return this
  }

  toJSON = () => {
    return {
      name: this.name,
      collection: this.collection,
      steps: this.steps.map((step) => step.toJSON()),
      ...(this.options?.if
        ? { if: serializeComputedArg(this.options.if) }
        : {}),
      ...(this.options?.vars
        ? {
            vars: Object.fromEntries(
              Object.entries(this.options.vars).map(([key, value]) => {
                return [
                  key,
                  typeof value === 'function'
                    ? {
                        type: 'computed',
                        value: serializeComputedArg(value),
                      }
                    : {
                        type: 'literal',
                        value: value,
                      },
                ]
              }),
            ),
          }
        : {}),
    }
  }

  static fromJSON = (data: any) => {
    if (!data?.name || !data?.collection || !Array.isArray(data.steps)) {
      throw new Error('Invalid EnhancementPipeline configuration')
    }

    const pipeline = new EnhancementPipeline(data.name, data.collection, {
      if: typeof data.if === 'string' ? eval(data.if) : undefined,
      vars: Object.fromEntries(
        Object.entries(data.vars || {}).map((entry) => {
          const [key, value] = entry as [string, any]
          return [
            key,
            value.type === 'computed' ? eval(value.value) : value.value,
          ]
        }),
      ),
    })
    for (const step of data.steps) {
      pipeline.add(EnhancementPipelineStep.fromJSON(step))
    }

    return pipeline
  }
}
