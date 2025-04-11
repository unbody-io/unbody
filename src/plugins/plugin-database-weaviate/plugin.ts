import { settle } from 'src/lib/core-utils'
import { PluginLifecycle } from 'src/lib/plugins-common'
import {
  ConfigureDatabaseParams,
  ConfigureDatabaseResult,
  CountSourceRecordsParams,
  CountSourceRecordsResult,
  DeleteRecordParams,
  DeleteRecordResult,
  EraseDatabaseParams,
  EraseDatabaseResult,
  EraseSourceRecordsParams,
  EraseSourceRecordsResult,
  ExecuteQueryParams,
  ExecuteQueryResult,
  GetObjectIdParams,
  GetObjectIdResult,
  GetObjectParams,
  GetObjectResult,
  GetRecordParams,
  GetRecordResult,
  InsertRecordParams,
  InsertRecordResult,
  PatchObjectParams,
  PatchObjectResult,
  PatchRecordParams,
  PatchRecordResult,
} from 'src/lib/plugins-common/database'
import { FileParserPlugin } from 'src/lib/plugins-common/file-parser'
import weaviate, {
  ClientParams,
  Filters,
  InternalConnectionParams,
  WeaviateClient,
  weaviateV2,
} from 'weaviate-client'
import { Database } from './database'
import { Config, Context, configSchema } from './plugin.types'
import { SchemaManager } from './SchemaManager'

const v2Client = (config: InternalConnectionParams) => {
  try {
    return weaviateV2.client(config)
  } catch (e) {
    throw new PluginLifecycle.OtherError('Failed to create v2 client', {
      details: [
        'Could not connect with the following configuration:',
        `scheme: ${config.scheme}`,
        `host: ${config.host}`,
        `headers: ${JSON.stringify(config.headers)}`,
        `timeout: ${config.timeout}`,
        `skipInitChecks: ${config.skipInitChecks}`,
        JSON.stringify(config, null, 4),
      ],
    })
  }
}

const v3Client = async (config: ClientParams) => {
  try {
    const client = await weaviate.client(config)
    return client
  } catch (e) {
    throw new PluginLifecycle.OtherError('Failed to create v3 client', {
      details: [
        'Could not connect with the following configuration:',
        `host: ${config.connectionParams?.http?.host || 'undefined'}`,
        `port: ${config.connectionParams?.http?.port || 'undefined'}`,
      ],
    })
  }
}

export class WeaviateDatabase implements PluginLifecycle {
  private config: Config

  private v3: WeaviateClient
  private v2: ReturnType<typeof weaviateV2.client>

  schemas: FileParserPlugin['schemas'] = {
    config: configSchema,
  }

  constructor() {}

  initialize = async (config: Config) => {
    this.config = config

    const { connection } = this.config
    const auth = connection.auth

    this.v2 = v2Client({
      scheme: config.connection.httpSecure ? 'https' : 'http',
      host: `${config.connection.httpHost || 'localhost'}:${config.connection.httpPort || '8080'}`,
      headers: config.connection.headers,
    })

    this.v3 = await v3Client({
      connectionParams: {
        http: {
          host: connection.httpHost || 'localhost',
          port: connection.httpPort || 8080,
          secure: connection.httpSecure || false,
          path: connection.httpPath || '',
        },
        grpc: {
          host: connection.grpcHost || 'localhost',
          port: connection.grpcPort || 50051,
          secure: connection.grpcSecure || false,
        },
      },
      headers: connection.headers || {},
      skipInitChecks: connection.skipInitChecks || false,
      proxies: connection.proxies,
      timeout: connection.timeout,
      ...(auth
        ? {
            auth:
              'apiKey' in auth
                ? new weaviate.ApiKey(auth.apiKey)
                : new weaviate.AuthUserPasswordCredentials({
                    username: auth.username,
                    password: auth.password,
                  }),
          }
        : {}),
    })
  }

  bootstrap = async (ctx: Context) => {}

  destroy = async (ctx: Context) => {}

  async configureDatabase(
    ctx: Context,
    params: ConfigureDatabaseParams,
  ): Promise<ConfigureDatabaseResult> {
    const schemaManager = new SchemaManager(this.config, this.v3, ctx)
    await schemaManager.createCollections()
  }

  async eraseDatabase(
    ctx: Context,
    params: EraseDatabaseParams,
  ): Promise<EraseDatabaseResult> {
    const schemaManager = new SchemaManager(this.config, this.v3, ctx)
    await schemaManager.deleteAllSchemas()
  }

  async getObjectId(
    ctx: Context,
    params: GetObjectIdParams,
  ): Promise<GetObjectIdResult> {
    const objectId = this._getObjectId(params.sourceId, params.recordId)

    return {
      objectId,
    }
  }

  async countSourceRecords(
    ctx: Context,
    params: CountSourceRecordsParams,
  ): Promise<CountSourceRecordsResult> {
    const client = this.v3

    let count = 0

    for (const collection of ctx.collections) {
      if (params.collection && collection.name !== params.collection) continue

      const ref = client.collections.use(collection.name)

      const { totalCount } = await ref.aggregate.overAll({
        filters: Filters.and(
          ref.filter.byProperty('remoteId').isNull(false),
          ref.filter.byProperty('sourceId').equal(params.sourceId),
        ),
      })

      count += totalCount
    }

    return {
      count,
    }
  }

  async eraseSourceRecords(
    ctx: Context,
    params: EraseSourceRecordsParams,
  ): Promise<EraseSourceRecordsResult> {
    const client = this.v3
    const collections = await client.collections.listAll()
    for (const collection of collections) {
      const ref = client.collections.use(collection.name)
      await ref.data.deleteMany(
        ref.filter.byProperty('sourceId').equal(params.sourceId),
      )
    }
  }

  async executeQuery(
    ctx: Context,
    params: ExecuteQueryParams,
  ): Promise<ExecuteQueryResult> {
    const db = new Database(this.config, this.v2, this.v3, ctx)
    const [res, err] = await settle(() =>
      db.executeQuery(params.query, {
        headers: params.headers,
        variables: params.variables,
      }),
    )

    if (err) {
      if (err['response']) {
        return {
          result: {
            errors: err['response']['errors'],
          },
        }
      }

      throw err
    }

    return {
      result: res,
    }
  }

  async getRecord(
    ctx: Context,
    params: GetRecordParams,
  ): Promise<GetRecordResult> {
    const db = new Database(this.config, this.v2, this.v3, ctx)
    const record = await db.getRecord(
      params.sourceId,
      params.recordId,
      params.collection,
    )

    if (!record) {
      return null
    }

    return {
      record: {
        __typename: record.__typename,
        id: record.id,
        ...record,
      },
    }
  }

  async insertRecord(
    ctx: Context,
    params: InsertRecordParams,
  ): Promise<InsertRecordResult> {
    const { record, recordId, sourceId } = params

    const db = new Database(this.config, this.v2, this.v3, ctx)

    const { objectId, objects } = await db.insert(
      sourceId,
      recordId,
      record.__typename,
      record,
    )

    return {
      objectId,
      objects,
    }
  }

  async patchRecord(
    ctx: Context,
    params: PatchRecordParams,
  ): Promise<PatchRecordResult> {
    const { record, recordId, sourceId } = params

    const db = new Database(this.config, this.v2, this.v3, ctx)

    const { objectId, objects } = await db.patch(
      sourceId,
      recordId,
      record.__typename,
      record,
    )

    return {
      objectId,
      objects,
    }
  }

  async deleteRecord(
    ctx: Context,
    params: DeleteRecordParams,
  ): Promise<DeleteRecordResult> {
    const { collection, recordId, sourceId } = params

    const db = new Database(this.config, this.v2, this.v3, ctx)

    await db.delete(sourceId, collection, {
      remoteId: recordId,
    })

    return {
      objectId: this._getObjectId(sourceId, recordId),
    }
  }

  async getObject(
    ctx: Context,
    params: GetObjectParams,
  ): Promise<GetObjectResult> {
    const db = new Database(this.config, this.v2, this.v3, ctx)
    const obj = await db.getObject(params.collection, params.objectId)

    if (!obj) {
      return null
    }

    return {
      object: obj,
      objectId: obj.id,
      collection: obj.__typename,
    }
  }

  async patchObject(
    ctx: Context,
    params: PatchObjectParams,
  ): Promise<PatchObjectResult> {
    const db = new Database(this.config, this.v2, this.v3, ctx)

    const { objectId, objects } = await db.patchObject(
      params.sourceId,
      params.objectId,
      params.collection,
      params.payload,
    )

    return {
      objects,
      objectId,
    }
  }

  private _getObjectId(sourceId: string, recordId: string) {
    return Database.getObjectId(sourceId, recordId)
  }
}
