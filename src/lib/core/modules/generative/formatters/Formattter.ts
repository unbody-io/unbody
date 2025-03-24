export class Formatter<O = Record<string, any>> {
  public name: string = 'formatter'

  public format = async (
    expression: string,
    data: Record<string, any> | Record<string, any>[],
    args: Record<string, any>,
    options: O,
  ): Promise<any> => {
    return data
  }

  public validateOptions = async (options: O) => {
    return options
  }
}
