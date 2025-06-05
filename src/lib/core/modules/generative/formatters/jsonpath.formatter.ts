import * as jsonpath from 'jsonpath'
import { Formatter } from './Formattter'

export class JsonPathFormatter extends Formatter<{
  expression: string
}> {
  public override name: string = 'jsonpath'

  public override format = async (
    expression: string,
    data: Record<string, any> | Record<string, any>[],
    args: Record<string, any>,
    options: {},
  ) => {
    const res = jsonpath.query(
      {
        ...args,
        data,
      },
      expression,
    )

    return res
  }

  public override validateOptions = async (options: { expression: string }) =>
    options
}
