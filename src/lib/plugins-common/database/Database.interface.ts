import { CollectionConfig } from 'src/lib/core-types'
import type { z } from 'zod'
import { PluginContext } from '..'

export type DatabasePluginContext = PluginContext & {
  collections: CollectionConfig[]
}

export interface DatabasePlugin<
  C extends PluginContext = DatabasePluginContext,
> {
  schemas: {
    config: z.ZodObject<any, any, any>
  }

  configureDatabase: (
    ctx: C,
    params: ConfigureDatabaseParams,
  ) => Promise<ConfigureDatabaseResult>

  eraseDatabase: (
    ctx: C,
    params: EraseDatabaseParams,
  ) => Promise<EraseDatabaseResult>

  getObjectId: (
    ctx: C,
    params: GetObjectIdParams,
  ) => GetObjectIdResult | Promise<GetObjectIdResult>

  countSourceRecords: (
    ctx: C,
    params: CountSourceRecordsParams,
  ) => Promise<CountSourceRecordsResult>

  eraseSourceRecords: (
    ctx: C,
    params: EraseSourceRecordsParams,
  ) => Promise<EraseSourceRecordsResult>

  executeQuery: (
    ctx: C,
    params: ExecuteQueryParams,
  ) => Promise<ExecuteQueryResult>

  getRecord: (ctx: C, params: GetRecordParams) => Promise<GetRecordResult>

  insertRecord: (
    ctx: C,
    params: InsertRecordParams,
  ) => Promise<InsertRecordResult>

  patchRecord: (ctx: C, params: PatchRecordParams) => Promise<PatchRecordResult>

  deleteRecord: (
    ctx: C,
    params: DeleteRecordParams,
  ) => Promise<DeleteRecordResult>

  getObject: (ctx: C, params: GetObjectParams) => Promise<GetObjectResult>

  patchObject: (ctx: C, params: PatchObjectParams) => Promise<PatchObjectResult>
}

export type ConfigureDatabaseParams = {}
export type ConfigureDatabaseResult = {} | void

export type EraseDatabaseParams = {}
export type EraseDatabaseResult = {} | void

export type CountSourceRecordsParams = {
  sourceId: string
  collection?: string
}
export type CountSourceRecordsResult = {
  count: number
}

export type EraseSourceRecordsParams = {
  sourceId: string
}
export type EraseSourceRecordsResult = {} | void

export type GetObjectIdParams = {
  sourceId: string
  recordId: string
}
export type GetObjectIdResult = {
  objectId: string
}

export type ExecuteQueryParams = {
  query: string
  variables?: Record<string, any>
  headers?: Record<string, string>
}
export type ExecuteQueryResult = {
  result: any
}

export type GetRecordParams = {
  sourceId: string
  recordId: string
  collection?: string
}
export type GetRecordResult = {
  record: GetRecordPayload<any>
} | null

export type InsertRecordParams = {
  recordId: string
  sourceId: string
  record: CreateRecordPayload<any>
}
export type InsertRecordResult = {
  objectId: string
  objects: Array<{
    path: string
    objectId: string
    collection: string
  }>
}

export type PatchRecordParams = {
  recordId: string
  sourceId: string
  record: PatchRecordPayload<any>
}
export type PatchRecordResult = {
  objectId: string
  objects: Array<{
    path: string
    objectId: string
    collection: string
  }>
}

export type DeleteRecordParams = {
  sourceId: string
  recordId: string
  collection: string
}
export type DeleteRecordResult = {
  objectId: string
}

export type GetObjectParams = {
  collection: string
  objectId: string
}
export type GetObjectResult = {
  objectId: string
  collection: string
  object: Record<string, any>
} | null

export type PatchObjectParams = {
  sourceId: string
  objectId: string
  collection: string
  payload: PatchRecordPayload<any>
}
export type PatchObjectResult = {
  objectId: string
  objects: Array<{
    path: string
    objectId: string
    collection: string
  }>
}

export type CreateRecordPayload<T extends { __typename: string }> = {
  [K in keyof T as Exclude<K, '__typename'>]: T[K] extends Array<infer U>
    ? U extends { __typename: string }
      ? Array<
          | CreateRecordPayload<U>
          | {
              __typename: U['__typename']
              id: string
            }
        >
      : T[K]
    : T[K]
} & {
  vectors: number[]
  __typename: T['__typename']
}

export type PatchRecordPayload<T extends { __typename: string }> = {
  [K in keyof T as Exclude<K, '__typename'>]?: T[K] extends Array<infer U>
    ? U extends { __typename: string }
      ? Array<
          | PatchRecordPayload<U>
          | {
              __typename: U['__typename']
              id: string
            }
        >
      : T[K]
    : T[K]
} & {
  vectors: number[]
  __typename: T['__typename']
}

export type GetRecordPayload<T extends { __typename: string }> = {
  [K in keyof T as Exclude<K, '__typename'>]: T[K] extends Array<infer U>
    ? U extends { __typename: string }
      ? Array<{
          __typename: U['__typename']
          id: string
        }>
      : T[K]
    : T[K]
} & {
  id: string
  __typename: T['__typename']
}
