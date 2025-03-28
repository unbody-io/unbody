import { Model } from 'mongoose'
import { UnbodyProjectSettings } from 'src/lib/core-types'
import { PluginManifest, PluginType } from 'src/lib/plugins-common'
import * as uuid from 'uuid'
import { DatabasePluginInstance } from '../instances/DatabasePlugin'
import { EnhancerPluginInstance } from '../instances/EnhancerPlugin'
import { FileParserPluginInstance } from '../instances/FileParserPlugin'
import { GenerativePluginInstance } from '../instances/GenerativePlugin'
import { ImageVectorizerPluginInstance } from '../instances/ImageVectorizerPlugin'
import { PluginInstance } from '../instances/PluginInstance'
import { ProviderPluginInstance } from '../instances/ProviderPlugin'
import { RerankerPluginInstance } from '../instances/RerankerPlugin'
import { StoragePluginInstance } from '../instances/StoragePlugin'
import { TextVectorizerPluginInstance } from '../instances/TextVectorizerPlugin'
import { PluginResources } from '../resources/PluginResources'
import { PluginRunner } from '../runner/LocalPluginRunner'
import { LoadedPlugin } from '../shared.types'
import { PluginStateCollectionDocument } from './schemas'

export type PluginRegistryConfig = {
  configLoader?: (
    plugin: UnbodyProjectSettings.PluginRegistration,
    manifest: PluginManifest,
    defaultLoader: (
      plugin: UnbodyProjectSettings.PluginRegistration,
      manifest: PluginManifest,
    ) => Promise<Record<string, any>>,
  ) =>
    | Promise<Record<string, any> | undefined | void>
    | Record<string, any>
    | undefined
    | void
}

const defaultConfigLoader = async (
  plugin: UnbodyProjectSettings.PluginRegistration,
  manifest: PluginManifest,
) => {
  return typeof plugin.config === 'function'
    ? (await plugin.config()) || {}
    : plugin.config || {}
}

export class PluginRegistry {
  plugins: Record<string, LoadedPlugin> = {}
  providers: Record<string, LoadedPlugin> = {}
  fileParsers: Record<string, LoadedPlugin> = {}
  storage: Record<string, LoadedPlugin> = {}
  database: Record<string, LoadedPlugin> = {}
  enhancers: Record<string, LoadedPlugin> = {}
  generative: Record<string, LoadedPlugin> = {}
  rerankers: Record<string, LoadedPlugin> = {}
  textVectorizers: Record<string, LoadedPlugin> = {}
  imageVectorizers: Record<string, LoadedPlugin> = {}

  constructor(
    private config: PluginRegistryConfig,
    private models: {
      pluginState: Model<PluginStateCollectionDocument>
    },
    private resources: PluginResources,
  ) { }

  async register(plugins: UnbodyProjectSettings.PluginRegistration[]) {
    for (const plugin of plugins) {
      await this.registerPlugin(plugin)
    }
  }

  async registerPlugin(plugin: UnbodyProjectSettings.PluginRegistration) {
    const id = uuid.v5(plugin.alias, uuid.v5.URL)

    const manifest = await new PluginRunner({
      pluginId: id,
      pluginPath: plugin.path,
      pluginConfig: {},
    }).getManifest()

    const config = this.config.configLoader
      ? (await this.config.configLoader(
        plugin,
        manifest,
        defaultConfigLoader,
      )) || (await defaultConfigLoader(plugin, manifest))
      : await defaultConfigLoader(plugin, manifest)

    const runner = new PluginRunner({
      pluginId: id,
      pluginPath: plugin.path,
      pluginConfig: config,
    })

    await runner.load()

    const alias = plugin.alias || manifest.name

    const loaded = {
      id,
      alias,
      runner,
      manifest,
    }

    await runner.initialize()
    try {
      await runner.initialize()
    } catch (e) {
      throw new PluginRegistry.Error(
        `Failed to initialize plugin '${manifest.name}'`,
        {
          alias,
          path: plugin.path,
          manifest,
        },
        e,
      )
    }

    const instance = await this.getInstance(loaded)

    const session = await this.models.pluginState.startSession()
    session.withTransaction(async () => {
      let state = await this.models.pluginState.findOne({ alias })

      if (!state) {
        state = new this.models.pluginState({
          _id: id,
          manifest,
          alias: loaded.alias,
        })
        await state.save({ session })

        await instance.runTask('bootstrap')({})
      }
    })

    this.plugins[alias] = loaded
    if (manifest.type === 'provider') this.providers[alias] = loaded
    else if (manifest.type === 'file_parser') this.fileParsers[alias] = loaded
    else if (manifest.type === 'storage') this.storage[alias] = loaded
    else if (manifest.type === 'database') this.database[alias] = loaded
    else if (manifest.type === 'text_vectorizer')
      this.textVectorizers[alias] = loaded
    else if (manifest.type === 'image_vectorizer')
      this.imageVectorizers[alias] = loaded
    else if (manifest.type === 'reranker') this.rerankers[alias] = loaded
    else if (manifest.type === 'generative') this.generative[alias] = loaded
    else if (manifest.type === 'enhancer') this.enhancers[alias] = loaded
  }

  async deletePlugin(alias: string) {
    const plugin = this.plugins[alias]

    if (!plugin) return

    const instance = await this.getInstance(plugin)
    await instance.runTask('destroy')({})

    const session = await this.models.pluginState.startSession()
    session.withTransaction(async () => {
      await this.models.pluginState.deleteOne({ alias })
    })

    delete this.plugins[alias]
  }

  async getPlugins(type?: PluginType) {
    const plugins = Object.entries(this.plugins).map(([alias, plugin]) => ({
      alias: alias,
      id: plugin.id,
      type: plugin.manifest.type,
      name: plugin.manifest.name,
      displayName: plugin.manifest.displayName,
      description: plugin.manifest.description || '',
      version: plugin.manifest.version,
    }))

    if (type) {
      return plugins.filter((p) => p.type === type)
    }

    return plugins
  }

  async getInstance(plugin: LoadedPlugin) {
    switch (plugin.manifest.type) {
      case 'file_parser':
        return new FileParserPluginInstance(plugin, {}, this.resources)
      case 'provider':
        return new ProviderPluginInstance(plugin, {}, this.resources)
      case 'storage':
        return new StoragePluginInstance(plugin, {}, this.resources)
      case 'text_vectorizer':
        return new TextVectorizerPluginInstance(plugin, {}, this.resources)
      case 'image_vectorizer':
        return new ImageVectorizerPluginInstance(plugin, {}, this.resources)
      case 'reranker':
        return new RerankerPluginInstance(plugin, {}, this.resources)
      case 'database':
        return new DatabasePluginInstance(plugin, {} as any, this.resources)
      case 'enhancer':
        return new EnhancerPluginInstance(plugin, {} as any, this.resources)
      case 'generative':
        return new GenerativePluginInstance(plugin, {} as any, this.resources)
      default:
        return new PluginInstance({}, plugin, this.resources)
    }
  }

  async getStorage() {
    return Object.values(this.storage)[0]
  }

  async getDatabase() {
    return Object.values(this.database)[0]
  }

  async getProvider(alias: string) {
    return this.providers[alias]
  }

  async getFileParser(alias: string) {
    return this.fileParsers[alias]
  }

  async getEnhancer(alias: string) {
    return this.enhancers[alias]
  }

  async getGenerative(alias: string) {
    return this.generative[alias]
  }

  async getTextVectorizer(alias: string) {
    return this.textVectorizers[alias]
  }

  async getImageVectorizer(alias: string) {
    return this.imageVectorizers[alias]
  }

  async getReranker(alias: string) {
    return this.rerankers[alias]
  }

  async startServices() {
    for (const plugin of Object.values(this.plugins)) {
      try {
        if (plugin.manifest.runtime === 'service') {
          const instance = await this.getInstance(plugin)
          await instance.runTask('startService')({})
        }
      } catch (error) {
        console.error(error)
      }
    }
  }

  async stopServices() {
    for (const plugin of Object.values(this.plugins)) {
      try {
        if (plugin.manifest.runtime === 'service') {
          const instance = await this.getInstance(plugin)
          await instance.runTask('stopService')({})
        }
      } catch (error) {
        console.error(error)
      }
    }
  }
}

const BaseError = Error
export namespace PluginRegistry {
  export namespace Error {
    export interface Details {
      alias: string
      path: string
      manifest: PluginManifest
    }
  }

  export class Error extends BaseError {
    constructor(
      message: string,
      public readonly pluginDetails: Error.Details,
      public readonly causedBy?: unknown,
    ) {
      super(message)
      this.name = 'PluginRegistryError'
      Object.setPrototypeOf(this, Error.prototype)
    }
  }
}
