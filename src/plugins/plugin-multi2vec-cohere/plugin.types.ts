import { PluginContext } from 'src/lib/plugins-common'

export type Config = {
  baseURL?: string

  clientSecret: {
    apiKey?: string
  }

  options?: {
    model?: Model
    autoTrim?: boolean
  }
}

export type Model =
  | 'embed-english-v3.0'
  | 'embed-english-light-v3.0'
  | 'embed-multilingual-v3.0'
  | 'embed-multilingual-light-v3.0'

export type Context = PluginContext
