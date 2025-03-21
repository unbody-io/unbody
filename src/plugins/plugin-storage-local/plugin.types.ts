import { PluginContext } from 'src/lib/plugins-common'

export type Config = {
  publicRootDir: string
  publicBaseUrl: string

  privateRootDir: string
  privateBaseUrl: string
}

export type Context = PluginContext
