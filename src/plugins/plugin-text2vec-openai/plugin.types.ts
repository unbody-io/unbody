import { PluginContext } from 'src/lib/plugins-common'

export type Config = {
  baseURL?: string

  clientSecret: {
    apiKey?: string
    project?: string
    organization?: string
  }

  options?: {
    model?: Model
    autoTrim?: boolean
  }
}

export type Model =
  'text-embedding-ada-002'
  | 'text-embedding-3-large'
  | 'text-embedding-3-small'

export type Context = PluginContext
