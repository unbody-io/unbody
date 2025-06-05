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

  getCollection<T extends DatabaseAPI.Document = DatabaseAPI.Document>(
    name: string,
  ): Promise<DatabaseCollectionAPI<T>>

  withTransaction: mongodb.ClientSession['withTransaction']
}

export namespace DatabaseAPI {
  export type Collection<T extends Document = Document> = mongodb.Collection<T>
  export type Document = mongodb.Document
}

export type DatabaseCollectionAPI<
  T extends DatabaseAPI.Document = DatabaseAPI.Document,
> = Pick<
  mongodb.Collection<T>,
  | 'find'
  | 'findOne'
  | 'findOneAndUpdate'
  | 'insertOne'
  | 'insertMany'
  | 'updateOne'
  | 'updateMany'
  | 'deleteOne'
  | 'deleteMany'
  | 'countDocuments'
  | 'createIndex'
  | 'dropIndex'
  | 'listIndexes'
  | 'bulkWrite'
>
