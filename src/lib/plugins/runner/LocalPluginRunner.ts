import {
  PluginContext,
  PluginLifecycle,
  PluginManifest,
  PluginRuntimeModes,
} from 'src/lib/plugins-common'
import * as temp from 'tmp-promise'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type * as z from 'zod'

type PluginModule = {
  default: any
  manifest: PluginManifest
}

export type PluginRunnerConfig = {
  pluginId: string
  pluginPath: string
  pluginConfig: any
}

export class PluginRunner {
  config: PluginRunnerConfig

  private manifest!: PluginManifest
  private pluginModule!: PluginModule
  private plugin!: any

  constructor(config: PluginRunnerConfig) {
    this.config = config
  }

  async load() {
    this.pluginModule = (await import(this.config.pluginPath)) as PluginModule
    this.manifest = this.pluginModule.manifest

    this.plugin = new this.pluginModule.default()
  }

  async bootstrap(ctx: PluginContext) {
    const plugin = this.plugin as PluginLifecycle

    if (typeof plugin.bootstrap === 'function') await plugin.bootstrap(ctx)
  }

  async initialize() {
    const plugin = this.plugin as PluginLifecycle

    if (typeof plugin.initialize === 'function')
      await plugin.initialize(this.config.pluginConfig)
  }

  async startService(ctx: PluginContext) {
    const plugin = this.plugin as PluginLifecycle

    if (this.manifest.runtime !== PluginRuntimeModes.Service)
      throw new Error('Plugin is not a service')

    if (typeof plugin.startService === 'function')
      await plugin.startService(ctx)
  }

  async stopService(ctx: PluginContext) {
    const plugin = this.plugin as PluginLifecycle

    if (this.manifest.runtime !== PluginRuntimeModes.Service)
      throw new Error('Plugin is not a service')

    if (typeof plugin.stopService === 'function') await plugin.stopService(ctx)
  }

  async getManifest() {
    if (!this.manifest) await this.load()

    return this.manifest
  }

  getSchema = async (key: string): Promise<z.AnyZodObject | undefined> => {
    const schema = this.plugin.schemas?.[key]
    if (!schema) return undefined

    return schema
  }

  getJsonSchema = async (key: string) => {
    const schema = await this.getSchema(key)
    if (!schema) return undefined

    return zodToJsonSchema(schema)
  }

  async runTask<
    T extends Record<string, any> = Record<string, any>,
    R extends Record<string, any> = Record<string, any>,
  >(task: string, ctx: PluginContext, params: T) {
    const plugin = this.plugin

    if (typeof plugin[task] === 'function')
      return plugin[task](ctx, params) as R
    else throw new Error(`Task ${task} not implemented`)
  }

  async createTempDir() {
    const dir = await temp.dir({ unsafeCleanup: true })

    return dir
  }
}
