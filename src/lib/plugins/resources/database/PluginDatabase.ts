import { Db, MongoClient } from 'mongodb'

export type PluginDatabaseConfig = {
  database: string
}

export class PluginDatabase {
  private config: PluginDatabaseConfig
  private db: Db

  constructor(
    config: PluginDatabaseConfig,
    private client: MongoClient,
  ) {
    this.config = {
      ...config,
    }

    this.db = this.client.db(this.config.database)
  }

  async createCollection(
    { pluginId }: { pluginId: string },
    name: string,
    options?: any,
  ) {
    await this.db.createCollection(
      this.prefixCollectionName(pluginId, name),
      options,
    )

    return this.getCollection({ pluginId }, name)
  }

  async dropCollection(
    { pluginId }: { pluginId: string },
    name: string,
    options?: any,
  ) {
    await this.db.dropCollection(
      this.prefixCollectionName(pluginId, name),
      options,
    )
  }

  async listCollections({ pluginId }: { pluginId: string }) {
    return await this.db
      .listCollections(
        {
          name: `^${pluginId}_.*$`,
        },
        { nameOnly: true },
      )
      .toArray()
      .then((list) => list.map((item) => item.name))
  }

  async getCollection({ pluginId }: { pluginId: string }, name: string) {
    const collection = this.db.collection(
      this.prefixCollectionName(pluginId, name),
    )

    return collection
  }

  async withTransaction({ pluginId }: { pluginId }, fn: any, options?: any) {
    return this.client.startSession().withTransaction(async (session) => {
      await fn(session)
    }, options)
  }

  private prefixCollectionName(pluginId: string, collection: string) {
    return `${pluginId}_${collection}`
  }
}
