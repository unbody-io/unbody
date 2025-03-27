import { GraphQLClient } from 'graphql-request'
import * as _ from 'lodash'
import {
  CollectionConfig,
  CrossReferencePropertyConfig,
} from 'src/lib/core-types'
import {
  CreateRecordPayload,
  PatchRecordPayload,
} from 'src/lib/plugins-common/database'
import * as uuid from 'uuid'
import { WeaviateV2, WeaviateV3 } from './client.types'
import { Config, Context } from './plugin.types'
import { SchemaManager } from './SchemaManager'

type Ref = {
  fromUuid: string
  fromProperty: string
  to: string

  collection: string
}

type InsertPayload = {
  references: Ref[]
  objects: Array<{
    id: string
    path: string[]
    vectors: number[]
    collection: string
    properties: Record<string, any>
  }>
}

type PatchPayload = InsertPayload & {}

export class Database {
  public schemaManager: SchemaManager

  private cascadeProperties: Map<
    string,
    {
      collection: string
      path: string[]
      property: string
      onUpdate?: boolean
      onDelete?: boolean
    }[]
  > = new Map()

  private _collections: Record<string, CollectionConfig>
  private _graphQLPaths: Record<string, string> = {}
  private _graphql: GraphQLClient

  constructor(
    private config: Config,
    private v2: WeaviateV2,
    private v3: WeaviateV3,
    private ctx: Context,
  ) {
    this.schemaManager = new SchemaManager(config, v3, ctx)
    this._graphql = new GraphQLClient(
      `${this.v2.graphql.raw().client.host}/v1/graphql`,
      {},
    )
  }

  get collections() {
    if (this._collections) return this._collections

    this._collections = Object.fromEntries(
      this.ctx.collections.map((col) => [col.name, col]),
    )

    return this._collections
  }

  getGraphQLPath = (collection: string) => {
    if (this._graphQLPaths[collection]) return this._graphQLPaths[collection]

    const path: string[] = []
    path.push('_additional { id }')

    for (const property of this.collections[collection].properties) {
      if (property.type === 'cref') {
        const paths = property.refs.map(
          (ref) => `... on ${ref.collection} { __typename _additional {id} }`,
        )
        path.push(`${property.name} { ${paths.join(' ')} }`)
      } else if (property.type === 'object') {
        path.push(
          `${property.name} { ${property.properties.map((p) => p.name).join(' ')} }`,
        )
      } else if (property.type === 'geoCoordinates') {
        path.push(`${property.name} { latitude longitude }`)
      } else if (property.type === 'phoneNumber') {
        path.push(`${property.name} { input }`)
      } else {
        path.push(property.name)
      }
    }

    return path.join(' ')
  }

  insert = async (
    sourceId: string,
    recordId: string,
    collection: string,
    record: CreateRecordPayload<any>,
  ) => {
    const _collection = this.collections[collection]
    if (!_collection)
      throw new Error(`Collection ${collection} not found in schema`)

    const clone = _.cloneDeep(record)
    clone['remoteId'] = recordId
    const { objectId, objects } = await this._insertOne(sourceId, clone)

    return {
      objectId,
      objects,
    }
  }

  patch = async (
    sourceId: string,
    recordId: string,
    collection: string,
    record: PatchRecordPayload<any>,
  ) => {
    const _collection = this.collections[collection]
    if (!_collection)
      throw new Error(`Collection ${collection} not found in schema`)

    const clone = _.cloneDeep(record)
    clone['remoteId'] = recordId
    const { objectId, objects } = await this._patchOne(sourceId, clone)

    return {
      objectId,
      objects,
    }
  }

  delete = async (
    sourceId: string,
    collection: string,
    record:
      | {
          id: string
        }
      | {
          remoteId: string
        },
  ) => {
    const objectId =
      'id' in record
        ? record.id
        : Database.getObjectId(sourceId, record.remoteId)

    const _collection = this.collections[collection]

    if (_collection) {
      const paths = this.getCascadeProperties(collection).filter(
        (path) => path.onDelete,
      )

      for (const { collection: refCollection, path } of paths) {
        await this.v2.batch
          .objectsBatchDeleter()
          .withClassName(refCollection)
          .withWhere({
            path,
            operator: 'Equal',
            valueText: objectId,
          })
          .do()
      }
    }

    await this.v3.collections.use(collection).data.deleteById(objectId)

    return {}
  }

  patchObject = async (
    sourceId: string,
    objectId: string,
    collection: string,
    payload: { vectors: number[]; [key: string]: any },
  ) => {
    const { objects } = await this._patchOne(sourceId, {
      ...payload,
      id: objectId,
      __typename: collection,
    })

    return {
      objectId,
      objects,
    }
  }

  executeQuery = async (
    query: string,
    options: {
      variables?: Record<string, any>
      headers?: Record<string, string>
    },
  ) => {
    const res = await this._graphql.request(
      query,
      options.variables || {},
      options.headers || {},
    )
    return res
  }

  getRecord = async (
    sourceId: string,
    recordId: string,
    collection?: string,
  ) => {
    const objId = Database.getObjectId(sourceId, recordId)
    if (collection) {
      return this.getObject(collection, objId)
    }

    const collections = this.ctx.collections.map((col) => col.name)
    for (const collection of collections) {
      const obj = await this.getObject(collection, objId)
      if (obj) return obj
    }

    return null
  }

  getObject = async (collection: string, objectId: string) => {
    const path = this.getGraphQLPath(collection)
    const res = await this.v2.graphql
      .get()
      .withClassName(collection)
      .withFields(path)
      .withWhere({
        path: ['id'],
        operator: 'Equal',
        valueText: objectId,
      })
      .do()

    const obj = res.data?.Get?.[collection]?.[0]
    if (!obj) return null

    const result: Record<string, any> = {
      id: obj.id,
      __typename: collection,
    }

    for (const key in obj) {
      if (key === '_additional') continue

      const property = this.collections[collection].properties.find(
        (prop) => prop.name === key,
      )

      if (!property || property.type !== 'cref') result[key] = obj[key]
      else {
        const crefs =
          (obj[key] as Array<{
            __typename: string
            _additional: { id: string }
          }>) || []
        result[key] = crefs.map((cref) => ({
          __typename: cref.__typename,
          id: cref._additional.id,
        }))
      }
    }

    return result
  }

  private _createInsertPayload = (
    currentPath: string[],
    payload: InsertPayload,
    sourceId: string,
    collection: string,
    record: CreateRecordPayload<any>,
  ) => {
    const schema = this.ctx.collections.find((col) => col.name === collection)
    if (!schema) throw new Error(`Collection ${collection} not found in schema`)

    if (!record['id'] && record['remoteId']) {
      record['id'] = Database.getObjectId(sourceId, record['remoteId'])
    }
    const objectId = record.id

    const properties: Record<string, any> = {}

    for (const key in record) {
      const property = schema.properties.find((prop) => prop.name === key)
      if (!property) continue

      if (property.type === 'cref') {
        const references = record[key] as Array<
          | { __typename: string; id: string }
          | { __typename: string; [key: string]: any }
        >

        let index = -1
        for (const reference of references) {
          index++

          if (!reference.__typename)
            throw new Error('Missing __typename in cref property')

          if (!reference['id'] && reference['remoteId']) {
            reference['id'] = Database.getObjectId(
              sourceId,
              reference['remoteId'],
            )
          }

          if (
            Object.keys(reference).every((key) =>
              ['id', '__typename', 'remoteId'].includes(key),
            )
          ) {
            const refId = reference.id

            payload.references.push({
              fromUuid: objectId,
              collection: collection,
              fromProperty: key,
              to: refId,
            })

            const targetProperty = property.refs.find(
              (r) => r.collection === reference['__typename'],
            )?.property
            if (targetProperty)
              payload.references.push({
                to: objectId,
                fromUuid: refId,
                collection: reference.__typename,
                fromProperty: targetProperty,
              })
          } else {
            const refId = reference['id'] || uuid.v4()

            this._createInsertPayload(
              [...currentPath, key, String(index)],
              payload,
              sourceId,
              reference.__typename,
              { ...reference, id: refId } as any,
            )

            payload.references.push({
              fromUuid: objectId,
              collection: collection,
              fromProperty: key,
              to: refId,
            })

            const targetProperty = property.refs.find(
              (r) => r.collection === reference['__typename'],
            )?.property

            if (targetProperty)
              payload.references.push({
                to: objectId,
                fromUuid: refId,
                collection: reference.__typename,
                fromProperty: targetProperty,
              })
          }
        }
      } else {
        properties[key] = record[key]
      }
    }

    payload.objects.push({
      id: objectId,
      collection: collection,
      path: currentPath,
      properties: {
        ...properties,
      },
      vectors: record.vectors || [],
    })

    return payload
  }

  private _createPatchPayload = (
    currentPath: string[],
    payload: InsertPayload,
    sourceId: string,
    collection: string,
    record: CreateRecordPayload<any>,
  ) =>
    this._createInsertPayload(
      currentPath,
      payload,
      sourceId,
      collection,
      record,
    )

  private _insertOne = async (
    sourceId: string,
    record: CreateRecordPayload<any>,
  ) => {
    const collection = this.collections[record.__typename]
    if (!collection)
      throw new Error(`Collection ${record.__typename} not found`)

    if (!record['id'] && record['remoteId'])
      record['id'] = Database.getObjectId(sourceId, record['remoteId'])

    const objectId = record.id

    const { objects, references } = this._createInsertPayload(
      [],
      { objects: [], references: [] },
      sourceId,
      record.__typename,
      record,
    )

    {
      const grouped = _.groupBy(objects, (o) => o.collection)
      for (const collectionName in grouped) {
        const collection = this.v3.collections.use(collectionName)
        await collection.data.insertMany(
          grouped[collectionName].map(({ id, properties, vectors }) => ({
            id,
            vectors,
            properties: {
              ...properties,
              sourceId,
            },
          })),
        )
      }
    }

    {
      const grouped = _.groupBy(references, (o) => o.collection)
      for (const collectionName in grouped) {
        const collection = this.v3.collections.use(collectionName)
        await collection.data.referenceAddMany(
          grouped[collectionName].map(({ fromUuid, fromProperty, to }) => ({
            fromProperty,
            fromUuid,
            to,
          })),
        )
      }
    }

    return {
      objectId,
      objects: objects.map((o) => ({
        path: o.path.join('.'),
        objectId: o.id,
        collection: o.collection,
      })),
    }
  }

  private _patchOne = async (
    sourceId: string,
    record: PatchRecordPayload<any>,
  ) => {
    const collection = record.__typename

    const _collection = this.ctx.collections.find(
      (col) => col.name === collection,
    )
    if (!_collection)
      throw new Error(`Collection ${collection} not found in schema`)

    if (!record['id'] && record['remoteId'])
      record['id'] = Database.getObjectId(sourceId, record['remoteId'])

    const objectId = record['id']
    const object = await this.getObject(collection, objectId)

    if (!object) throw new Error(`Object not found: ${objectId}`)

    const { objects, references } = this._createPatchPayload(
      [],
      { objects: [], references: [] },
      sourceId,
      collection,
      record,
    )

    const cascadeProperties = this.getCascadeProperties(collection) || []

    {
      const refProps = _collection.properties.filter(
        (prop) =>
          prop.type === 'cref' &&
          prop.onUpdate === 'CASCADE' &&
          !!record[prop.name],
      )

      for (const refProp of refProps) {
        const paths = cascadeProperties.filter(
          (path) => path.property === refProp.name,
        )

        for (const { collection, path, onUpdate } of paths) {
          if (onUpdate) {
            await this.v2.batch
              .objectsBatchDeleter()
              .withClassName(collection)
              .withWhere({
                path: path,
                operator: 'Equal',
                valueText: objectId,
              })
              .do()
          }
        }

        if (paths.length > 0) {
          const crefs =
            (object.properties![refProp.name] as Array<{
              __typename: string
              id: string
            }>) || []
          for (const cref of crefs) {
            await this.v3.collections.use(collection).data.referenceDelete({
              fromProperty: refProp.name,
              fromUuid: objectId,
              to: cref.id,
            })
          }
        }
      }
    }

    {
      const refProps = _collection.properties.filter(
        (prop) =>
          prop.type === 'cref' &&
          prop.onUpdate === 'UPDATE_REFERENCE' &&
          !!record[prop.name],
      ) as CrossReferencePropertyConfig[]

      for (const refProp of refProps) {
        const crefs = object.properties![refProp.name] as Array<{
          __typename: string
          id: string
        }>

        for (const cref of crefs) {
          await this.v3.collections.use(collection).data.referenceDelete({
            fromProperty: refProp.name,
            fromUuid: objectId,
            to: cref.id,
          })

          const refCollection = refProp.refs.find(
            (col) => col.collection === cref.__typename,
          )

          if (refCollection && refCollection.property) {
            await this.v3.collections
              .use(cref.__typename)
              .data.referenceDelete({
                fromProperty: refCollection.property,
                fromUuid: cref.id,
                to: objectId,
              })
          }
        }
      }
    }

    const rootObj = objects[objects.length - 1]
    const rest = objects.slice(0, -1)

    {
      const grouped = _.groupBy(rest, (o) => o.collection)
      for (const collectionName in grouped) {
        const collection = this.v3.collections.use(collectionName)
        await collection.data.insertMany(
          grouped[collectionName].map(({ id, properties, vectors }) => ({
            id,
            vectors,
            properties,
          })),
        )
      }
    }

    await this.v3.collections.use(collection).data.update({
      id: objectId,
      properties: rootObj.properties,
      vectors: rootObj.vectors,
    })

    {
      const grouped = _.groupBy(references, (o) => o.collection)
      for (const collectionName in grouped) {
        const collection = this.v3.collections.use(collectionName)
        await collection.data.referenceAddMany(
          grouped[collectionName].map(({ fromUuid, fromProperty, to }) => ({
            fromProperty,
            fromUuid,
            to,
          })),
        )
      }
    }

    return {
      objectId,
      objects: objects.map((o) => ({
        path: o.path.join('.'),
        objectId: o.id,
        collection: o.collection,
      })),
    }
  }

  getCascadeProperties = (collection: string) => {
    if (this.cascadeProperties.has(collection)) {
      return this.cascadeProperties.get(collection)!
    }

    const getAllPaths = (
      currentPath: string[],
      collectionName: string,
      property?: string,
    ) => {
      const paths: {
        collection: string
        property: string
        path: string[]
        onUpdate?: boolean
        onDelete?: boolean
      }[] = []

      const collection = this.ctx.collections.find(
        (col) => col.name === collectionName,
      )
      if (!collection) return []

      const referenceProperties = collection.properties.filter(
        (prop) =>
          prop.type === 'cref' &&
          (prop.onDelete === 'CASCADE' || prop.onUpdate === 'CASCADE'),
      ) as CrossReferencePropertyConfig[]
      for (const ref of referenceProperties) {
        const refCollections = ref.refs

        for (const refCollection of refCollections) {
          const path = [refCollection.property, collectionName, ...currentPath]
          paths.push({
            property: property || ref.name,
            collection: refCollection.collection,
            path,
            onUpdate: ref.onUpdate === 'CASCADE',
            onDelete: ref.onDelete === 'CASCADE',
          })

          paths.push(
            ...getAllPaths(
              path,
              refCollection.collection,
              property || refCollection.property,
            ),
          )
        }
      }

      return paths
    }

    const all = [
      ...getAllPaths([], collection)
        .reverse()
        .map((p) => ({
          collection: p.collection,
          property: p.property,
          path: [...p.path, 'id'],
          onUpdate: p.onUpdate,
          onDelete: p.onDelete,
        })),
    ]

    this.cascadeProperties.set(collection, all)

    return all
  }

  static getObjectId = (sourceId: string, recordId: string) =>
    uuid.v5(`${sourceId}:${recordId}`, uuid.v5.URL)
}
