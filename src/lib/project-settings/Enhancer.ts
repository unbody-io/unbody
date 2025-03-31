import { EnhancerArgs, GraphQLRecordType } from './Enhancement.types'
import { serializeComputedArg } from './utils'

export class Enhancer<
  T extends Record<string, any> = Record<string, any>,
  R extends Record<string, any> = Record<string, any>,
  H extends Record<string, any> = Record<string, any>,
> {
  public name: string = 'enh-actions/name'
  public args: EnhancerArgs<T, GraphQLRecordType, H>

  public __result: R = {} as R

  constructor(args: EnhancerArgs<T, GraphQLRecordType, H>) {
    this.args = args
  }

  toJSON = () => {
    return {
      name: this.name,
      args: Object.fromEntries(
        Object.entries(this.args || {}).map(([key, value]) => {
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
  }

  static fromJSON = <E extends Enhancer<any, any, any>>(
    json: any,
    EnhancerClass?: new (args: EnhancerArgs<any, any, any>) => E,
  ) => {
    const enhancer = new (EnhancerClass || Enhancer)(
      Object.fromEntries(
        Object.entries(json.args).map((entry) => {
          const [key, value] = entry as [string, any]

          return [
            key,
            value.type === 'computed' ? eval(value.value) : value.value,
          ]
        }),
      ),
    )
    if (!EnhancerClass) enhancer.name = json.name

    return enhancer
  }
}
