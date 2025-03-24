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
  }
}

export const Models = {
  'gpt-4o-mini': 'gpt-4o-mini' as 'gpt-4o-mini',
  'gpt-4o': 'gpt-4o' as 'gpt-4o',
  'o1-mini': 'o1-mini' as 'o1-mini',
  o1: 'o1' as 'o1',
  'o3-mini': 'o3-mini' as 'o3-mini',
  'gpt-3.5-turbo': 'gpt-3.5-turbo' as 'gpt-3.5-turbo',
  'gpt-4': 'gpt-4' as 'gpt-4',
  'gpt-4-turbo': 'gpt-4-turbo' as 'gpt-4-turbo',
}

export type Model = keyof typeof Models

export type Context = PluginContext
