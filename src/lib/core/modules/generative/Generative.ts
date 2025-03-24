import * as jsonpath from 'jsonpath'
import * as _ from 'lodash'
import { settle, settleSync } from 'src/lib/core-utils'
import { ModelSpec } from 'src/lib/plugins-common/generative'
import { GenerativePluginInstance } from 'src/lib/plugins/instances/GenerativePlugin'
import { Plugins } from '../../plugins'
import { ProjectContext } from '../../project-context'
import { Formatters } from './formatters/Formatters'
import { GenerateTextParams } from './types'
import { validateParams } from './utils'

export class Generative {
  formatters: Formatters

  private _models: Record<
    string,
    {
      provider: string
      model: ModelSpec
    }[]
  > = {}

  constructor(
    private _ctx: ProjectContext,
    private _plugins: Plugins,
  ) {
    this.formatters = new Formatters()

    this.init()
  }

  async init() {
    const plugins = Object.values(this._plugins.registry.generative)

    for (const plugin of plugins) {
      const instance = new GenerativePluginInstance(
        plugin,
        {},
        this._plugins.resources,
      )

      const { models } = await instance.getSupportedModels({})

      for (const model of models) {
        if (!this._models[model.name]) this._models[model.name] = []

        this._models[model.name].push({
          provider: plugin.alias,
          model,
        })
      }
    }
  }

  private _getPlugin = async (alias: string) => {
    const plugin = await this._plugins.registry.getGenerative(alias)
    if (!plugin) throw new Error(`unknown generative plugin: ${alias}`)

    return new GenerativePluginInstance(plugin, {}, this._plugins.resources)
  }

  async getGenerative(params: { alias?: string; model?: string }) {
    const config = this._ctx.settings.modules.generative
    if (!config) throw new Error('generative module not configured')

    if (params.alias) return this._getPlugin(params.alias)
    if (!params.model) return this._getPlugin(config.name)

    const models = this._models[params.model]
    if (!models || models.length === 0)
      throw new Error(`unknown model: ${params.model}`)

    const defaultProviderModel = models.find((m) => m.provider === config.name)
    if (defaultProviderModel) return this._getPlugin(config.name)

    const model = models[0]
    return this._getPlugin(model.provider)
  }

  async validateParams(params: GenerateTextParams) {
    try {
      const validated = validateParams(params)

      if (validated.model && !this._models[validated.model])
        throw new Error(`unknown model: ${validated.model}`)

      return params
    } catch (error) {
      const message = error.errors ? error.errors.join('\n') : error.message
      throw new Error(`validation error: ${message}`)
    }
  }

  async processVars(params: GenerateTextParams) {
    const formatters = new Formatters()

    const vars = params.vars || []
    const allVars: Record<string, any> = {}

    for (const variable of vars) {
      const formatter = formatters.getFormatter(variable.formatter)
      if (!formatter)
        throw new Error(`unknown formatter: "${variable.formatter}"`)

      const [options, validationError] = await settle(() =>
        formatter.validateOptions({
          ..._.omit(variable, 'name', 'expression', 'formatter'),
        }),
      )

      if (validationError) {
        throw new Error(
          `formatter validation error: ${validationError.message}`,
        )
      }

      const [value, err] = await settle(() =>
        formatter.format(variable.expression, params.data, allVars, options),
      )

      if (err)
        throw new Error(
          `${variable.formatter}(${variable.expression}): ${err.message}`,
        )

      allVars[variable.name] = value
    }

    return {
      ...allVars,
      data: params.data,
    }
  }

  async processMessages(
    params: GenerateTextParams,
    vars: Record<string, any>,
  ): Promise<GenerateTextParams['messages']> {
    const prompt = params.prompt
    const properties =
      params.properties && params.properties.length > 0 && params.properties

    if (!prompt) {
      return Promise.all(
        params.messages.map((msg) =>
          this.formatMessage(params.data, vars, msg),
        ),
      ).then((res) => res.flat())
    }

    if (!properties) {
      return await this.formatMessage(params.data, vars, {
        role: 'user',
        type: 'text',
        content: prompt,
      }).then((val) => val.flat())
    }

    let data: Record<string, any> | null = null

    if (params.data) {
      if (Array.isArray(data)) {
        data = params.data.map((obj: any) =>
          Object.fromEntries(
            properties.map((p) => [p, this.resolveExpr(obj || {}, p)]),
          ),
        )
      } else {
        data = Object.fromEntries(
          properties.map((p) => [p, this.resolveExpr(params.data || {}, p)]),
        )
      }
    }

    return [
      {
        role: 'user',
        type: 'text',
        content: `${data ? JSON.stringify(data) + '\n\n' : ''}${prompt}`,
      } as GenerateTextParams['messages'][0],
    ]
  }

  private formatMessage = async (
    data: any,
    vars: Record<string, any>,
    message: GenerateTextParams['messages'][0],
  ): Promise<GenerateTextParams['messages'][0][]> => {
    const text =
      !message.type || message.type === 'text'
        ? message.content
        : typeof message.content === 'string'
          ? message.content
          : message.content['url']

    const regex = /(?<!\\)\{([a-zA-Z0-9_\.\$@]+\[?[^\{\}]*\]?)\}/g

    const matches = text.match(regex)
    if (!matches) return [message]

    const expressions = matches.map((match) => {
      const type =
        match.includes('@') || match.includes('$') || /\[[^\]]+\]/.test(match)
          ? 'jsonpath'
          : 'variable'

      return {
        type,
        expression: match.slice(1, -1),
      }
    })

    if (message.type === 'text') {
      let formatted = text

      for (const expr of expressions) {
        const value = this.resolveVar(data, vars, expr.expression)

        if (value)
          formatted = formatted.replace(
            `{${expr.expression}}`,
            typeof value === 'object' ? JSON.stringify(value) : value,
          )
      }

      return [
        {
          ...message,
          content: formatted,
        },
      ]
    } else {
      const expr = expressions[0]

      let values = this.resolveVar(data, vars, expr.expression)
      if (!values) return [message]

      if (!Array.isArray(values)) values = [values]

      return Promise.all(
        values.map((val: unknown) => {
          if (!val || typeof val !== 'string') return null

          const [_url, err] = settleSync(() => new URL(val))
          if (err) throw new Error(`Invalid URL: ${val}`)

          return {
            ...message,
            content: {
              url: val,
            },
          }
        }),
      ).then((messages) => messages.filter((msg) => !!msg))
    }
  }

  resolveExpr = (object: any, expression: string) => {
    const isJsonPath = expression.includes('@') || expression.includes('$')

    return isJsonPath
      ? jsonpath.query(object, expression)
      : _.get(object, expression)
  }

  resolveVar = (
    data: Record<string, any> | Record<string, any>[],
    vars: Record<string, any>,
    expression: string,
  ) => {
    let value = this.resolveExpr(vars, expression)
    if (!value) value = this.resolveExpr(data, expression)

    return value
  }
}
