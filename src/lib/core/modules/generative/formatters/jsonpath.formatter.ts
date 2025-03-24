import { Formatter } from './Formattter'
import * as jsonpath from 'jsonpath'

export class JsonPathFormatter extends Formatter<{}> {
  public name: string = 'jsonpath'

  public format = async (
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

  public validateOptions = async (options: { expression: string }) => ({})
}
