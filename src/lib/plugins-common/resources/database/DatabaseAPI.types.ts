import type * as mongodb from 'mongodb'

export interface DatabaseAPI {
  createCollection(
    name: string,
    options?: mongodb.CreateCollectionOptions,
  ): Promise<DatabaseCollectionAPI>

  dropCollection(
    name: string,
    options?: mongodb.DropCollectionOptions,
  ): Promise<void>

  listCollections(): Promise<string[]>

  getCollection(name: string): Promise<DatabaseCollectionAPI>

  withTransaction: mongodb.ClientSession['withTransaction']
}

export interface DatabaseCollectionAPI {
  find: mongodb.Collection['find']

  findOne: mongodb.Collection['findOne']

  findOneAndUpdate: mongodb.Collection['findOneAndUpdate']

  insertOne: mongodb.Collection['insertOne']

  insertMany: mongodb.Collection['insertMany']

  updateOne: mongodb.Collection['updateOne']

  updateMany: mongodb.Collection['updateMany']

  deleteOne: mongodb.Collection['deleteOne']

  deleteMany: mongodb.Collection['deleteMany']

  countDocuments: mongodb.Collection['countDocuments']

  createIndex: mongodb.Collection['createIndex']

  dropIndex: mongodb.Collection['dropIndex']

  listIndexes: mongodb.Collection['listIndexes']
}
