import { Formatter } from './Formattter'
import { JqFormatter } from './jq.formatter'

export class Formatters {
  private formatters: Record<string, Formatter> = {}

  constructor() {
    this.registerFormatter(new JqFormatter())
  }

  public registerFormatter = (formatter: Formatter<any>) => {
    this.formatters[formatter.name] = formatter
  }

  public getFormatter = (name: string) => {
    return this.formatters[name]
  }
}
