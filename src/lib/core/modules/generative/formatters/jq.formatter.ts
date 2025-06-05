import * as jq from 'node-jq'
import { Formatter } from './Formattter'

export class JqFormatter extends Formatter<{ expression: string }> {
  public override name: string = 'jq'

  public override format = async (
    expression: string,
    data: Record<string, any> | Record<string, any>[],
    args: Record<string, any>,
    options: {},
  ) => {
    const res = await jq.run(expression, data, {
      input: 'json',
      output: 'json',
      args: args,
    })

    return res
  }

  public override validateOptions = async (options: { expression: string }) =>
    options
}
