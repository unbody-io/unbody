import { Redis as IORedis } from 'ioredis'

export type PluginCacheStoreConfig = {}

export class PluginCacheStore {
  private config: PluginCacheStoreConfig

  constructor(
    config: PluginCacheStoreConfig,
    private client: IORedis,
  ) {
    this.config = {
      ...config,
    }
  }

  async keys({ pluginId }: { pluginId: string }) {
    return this.client.keys(`${pluginId}:*`)
  }

  async get(
    { pluginId }: { pluginId: string },
    key: string,
    options?: { encoding?: 'json' | 'base64' },
  ) {
    this.client.get(`${pluginId}:${key}`).then((value) => {
      if (!value) return null
      return this.decode(value, options?.encoding)
    })
  }

  async set(
    { pluginId }: { pluginId: string },
    key: string,
    value: any,
    options?: { ttl?: number; encoding?: 'json' | 'base64' },
  ) {
    const encodedValue = this.encode(value, options?.encoding)
    if (!options?.ttl)
      return void this.client.set(`${pluginId}:${key}`, encodedValue)

    this.client.set(`${pluginId}:${key}`, encodedValue, 'EX', options.ttl)
  }

  async has({ pluginId }: { pluginId: string }, key: string) {
    return this.client.exists(`${pluginId}:${key}`).then((value) => !!value)
  }

  async delete({ pluginId }: { pluginId: string }, key: string) {
    return this.client.del(`${pluginId}:${key}`)
  }

  async clear({ pluginId }: { pluginId: string }) {
    return this.client.keys(`${pluginId}:*`).then((keys) => {
      keys.forEach((key) => this.client.del(key))
    })
  }

  decode(value: string, encoding?: 'json' | 'base64') {
    if (!encoding) return value

    if (encoding === 'json') return JSON.parse(value)
    if (encoding === 'base64') return Buffer.from(value, 'base64').toString()
  }

  encode(value: any, encoding?: 'json' | 'base64') {
    if (!encoding) return value

    if (encoding === 'json') return JSON.stringify(value)
    if (encoding === 'base64') return Buffer.from(value).toString('base64')
  }
}
