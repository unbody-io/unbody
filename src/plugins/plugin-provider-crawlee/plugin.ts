import { JsonRecord } from 'src/lib/collections/types'
import { settle } from 'src/lib/core-utils'
import * as uuid from 'uuid'
import { z } from 'zod'
import zodToJsonSchema from 'zod-to-json-schema'
import { PluginContext, PluginLifecycle } from '../../lib/plugins-common'
import {
  ConnectParams,
  ConnectResult,
  GetRecordMetadataParams,
  GetRecordMetadataResult,
  GetRecordParams,
  GetRecordResult,
  HandleEntrypointUpdateParams,
  HandleEntryPointUpdateResult,
  HandleSourceUpdateParams,
  HandleSourceUpdateResult,
  IndexingEvent,
  IndexingEventName,
  InitSourceParams,
  InitSourceResult,
  ListEntrypointOptionsParams,
  ListEntrypointOptionsResult,
  ProcessRecordParams,
  ProcessRecordResult,
  ProviderPlugin,
  RegisterObserverParams,
  RegisterObserverResult,
  UnregisterObserverParams,
  UnregisterObserverResult,
  ValidateEntrypointParams,
  ValidateEntrypointResult,
  VerifyConnectionParams,
  VerifyConnectionResult,
} from '../../lib/plugins-common/provider'
import { Crawler } from './crawler'
import {
  Config,
  Context,
  PageDocument,
  SourceCredentials,
  SourceEntrypoint,
  SourceState,
} from './plugin.types'

const configSchema = z.object({})

const entrypointSchema = z.object({
  url: z
    .string()
    .url()
    .describe('Website URL to start crawling from')
    .refine(
      (value) => value.startsWith('http://') || value.startsWith('https://'),
      {
        message: 'URL must start with http:// or https://',
      },
    ),
  maxDepth: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(1)
    .describe('The maximum depth of the crawl'),
  maxPages: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(10)
    .describe('The maximum number of pages to crawl'),
})

export class CrawleeProvider
  implements PluginLifecycle<Context, Config>, ProviderPlugin<Context>
{
  config!: Config

  schemas: ProviderPlugin['schemas'] = {
    config: configSchema,
  }

  constructor() {}

  initialize = async (config: Config) => {
    this.config = config
  }

  bootstrap = async (ctx: Context) => {
    const pageCollection = await this._pageCollection(ctx)

    await pageCollection.createIndex({
      sourceId: 1,
    })

    await pageCollection.createIndex({
      sourceId: 1,
      pageId: 1,
    })
  }

  destroy = async (ctx: PluginContext) => {}

  startService = async (ctx: Context) => {}

  stopService = async (ctx: Context) => {}

  listEntrypointOptions = async (
    ctx: Context,
    params: ListEntrypointOptionsParams,
  ): Promise<ListEntrypointOptionsResult> => {
    return {
      type: 'form',
      schema: zodToJsonSchema(entrypointSchema),
    }
  }

  handleEntrypointUpdate = async (
    ctx: Context,
    params: HandleEntrypointUpdateParams,
  ): Promise<HandleEntryPointUpdateResult<SourceEntrypoint>> => {
    const { entrypoint } = await this._validateEntrypoint(
      params.entrypoint.type === 'form'
        ? (params.entrypoint.fields as SourceEntrypoint)
        : undefined,
    )

    if (!entrypoint)
      throw new ProviderPlugin.Exceptions.InvalidEntrypoint(
        'Entrypoint is required',
      )

    return {
      entrypoint,
    }
  }

  validateEntrypoint = async (
    ctx: Context,
    params: ValidateEntrypointParams<SourceEntrypoint | undefined>,
  ): Promise<ValidateEntrypointResult<SourceEntrypoint>> => {
    if (params.entrypoint) return this._validateEntrypoint(params.entrypoint)
    return this._validateEntrypoint(ctx.source.entrypoint)
  }

  private _validateEntrypoint = async (
    entrypoint: SourceEntrypoint | undefined,
  ): Promise<{ entrypoint: SourceEntrypoint }> => {
    const [parsed, err] = await settle(() =>
      entrypointSchema.parseAsync(entrypoint),
    )

    if (err) {
      if (err instanceof z.ZodError) {
        throw new ProviderPlugin.Exceptions.InvalidEntrypoint(err.message)
      }

      throw new ProviderPlugin.Exceptions.InvalidEntrypoint(err.message)
    }

    return {
      entrypoint: {
        url: parsed.url,
        maxDepth: parsed.maxDepth,
        maxPages: parsed.maxPages,
      },
    }
  }

  connect = async (
    ctx: Context,
    params: ConnectParams,
  ): Promise<ConnectResult> => {
    return {}
  }

  verifyConnection = async (
    ctx: Context,
    params: VerifyConnectionParams,
  ): Promise<VerifyConnectionResult<SourceCredentials>> => {
    return {
      isValid: true,
      credentials: {},
    }
  }

  initSource = async (
    ctx: Context,
    params: InitSourceParams,
  ): Promise<InitSourceResult<SourceState>> => {
    const { id: sourceId, entrypoint } = ctx.source

    const pageCollection = await this._pageCollection(ctx)

    await pageCollection.deleteMany({ sourceId })

    const crawler = new Crawler(ctx.source.id, entrypoint)
    await crawler.crawl()
    const data = await crawler.getData(10)

    const events: IndexingEvent[] = []

    const now = new Date()

    while (data.hasNext()) {
      const items = await data.next()

      await pageCollection.insertMany(
        items.map(
          (item) =>
            ({
              pageId: item.id,
              url: item.url,
              title: item.title,
              hash: item.hash,
              html: item.html,
              sourceId: sourceId,
              isRoot: item.isRoot || false,
              metadata: item.metadata,
              createdAt: now,
              updatedAt: now,
            }) satisfies PageDocument,
        ),
      )

      events.push(
        ...items.map(
          (item) =>
            ({
              eventName: 'created',
              recordId: item.id,
              recordType: '',
              dependsOn: [],
              metadata: {
                mimeType: 'text/html',
              },
            }) satisfies IndexingEvent,
        ),
      )
    }

    events.push({
      eventName: 'created',
      recordId: sourceId,
      recordType: '',
      dependsOn: events.map((ev) => ev.recordId),
      metadata: {
        mimeType: 'text/html',
      },
    })

    return {
      status: 'ready',
      events: events,
      sourceState: {
        lastEventTimestamp: now.toJSON(),
      },
    }
  }

  handleSourceUpdate = async (
    ctx: Context,
    params: HandleSourceUpdateParams,
  ): Promise<HandleSourceUpdateResult<SourceState>> => {
    const { id: sourceId, entrypoint } = ctx.source

    const pageCollection = await this._pageCollection(ctx)

    const crawler = new Crawler(ctx.source.id, entrypoint)
    await crawler.crawl()
    const data = await crawler.getData(10)

    const events: IndexingEvent[] = []

    const now = new Date()

    const newPages: Record<string, string> = {}
    const existingPages = Object.fromEntries(
      await pageCollection
        .find(
          {
            sourceId: sourceId,
          },
          {
            limit: 1000,
            projection: {
              pageId: 1,
              hash: 1,
            },
          },
        )
        .toArray()
        .then((res) =>
          res.map((item) => [item.pageId, item.hash] as [string, string]),
        ),
    )

    while (data.hasNext()) {
      const items = await data.next()

      const newRecords: PageDocument[] = []
      const updatedRecords: PageDocument[] = []
      let eventName: IndexingEventName = 'created'

      for (const item of items) {
        newPages[item.id] = item.hash

        const pageRecord: PageDocument = {
          pageId: item.id,
          url: item.url,
          title: item.title,
          hash: item.hash,
          html: item.html,
          sourceId: sourceId,
          isRoot: item.isRoot || false,
          metadata: item.metadata || {},
          createdAt: now,
          updatedAt: now,
        }
        if (existingPages[item.id]) {
          if (existingPages[item.id] === item.hash) {
            continue
          } else {
            updatedRecords.push(pageRecord)
            eventName = 'updated'
          }
        } else {
          newRecords.push(pageRecord)
          eventName = 'created'
        }

        events.push({
          eventName,
          recordId: item.id,
          recordType: '',
          dependsOn: [],
          metadata: {
            mimeType: 'text/html',
          },
        })
      }

      if (newRecords.length) await pageCollection.insertMany(newRecords)
      if (updatedRecords.length) {
        await pageCollection.bulkWrite(
          updatedRecords.map((item) => ({
            updateOne: {
              filter: { sourceId, pageId: item.pageId },
              update: {
                $set: {
                  ...item,
                  updatedAt: now,
                },
              },
            },
          })),
        )
      }
    }

    const deletedPages = Object.keys(existingPages).filter(
      (key) => !newPages[key],
    )
    events.push(
      ...deletedPages.map(
        (pageId) =>
          ({
            eventName: 'deleted',
            recordId: pageId,
            recordType: '',
          }) satisfies IndexingEvent,
      ),
    )

    await pageCollection.deleteMany({
      sourceId,
      pageId: { $in: deletedPages },
    })

    if (events.length > 0)
      events.push({
        eventName: 'updated',
        recordId: sourceId,
        recordType: '',
        dependsOn: events.map((ev) => ev.recordId),
        metadata: {
          mimeType: 'text/html',
        },
      })

    return {
      status: 'ready',
      events: events,
      sourceState: {
        lastEventTimestamp: now.toJSON(),
      },
    }
  }

  getRecordMetadata = async (
    ctx: Context,
    params: GetRecordMetadataParams,
  ): Promise<GetRecordMetadataResult> => {
    const { id: sourceId } = ctx.source

    const pageCollection = await this._pageCollection(ctx)

    const isRoot = sourceId === params.recordId

    const page = await pageCollection.findOne({
      sourceId,
      ...(isRoot
        ? {
            isRoot: true,
          }
        : {
            pageId: params.recordId,
          }),
    })

    if (!page)
      throw new ProviderPlugin.Exceptions.FileNotFound('Page not found')

    return {
      metadata: {
        title: page.title,
        mimeType: 'text/html',
        id: params.recordId,
        url: page.url,
        hash: page.hash,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      },
    }
  }

  getRecord = async (
    ctx: Context,
    params: GetRecordParams,
  ): Promise<GetRecordResult> => {
    const { id: sourceId } = ctx.source

    const isRoot = params.recordId === sourceId
    const pageCollection = await this._pageCollection(ctx)
    const page = await pageCollection.findOne({
      sourceId,
      ...(isRoot
        ? {
            isRoot: true,
          }
        : {
            pageId: params.recordId,
          }),
    })

    if (!page)
      throw new ProviderPlugin.Exceptions.FileNotFound('Page not found')

    if (isRoot) {
      return {
        status: 'ready',
        result: {
          type: 'json',
          content: {},
          metadata: {
            title: page.title,
            mimeType: 'text/html',
            id: params.recordId,
            url: page.url,
            hash: page.hash,
            createdAt: page.createdAt,
            updatedAt: page.updatedAt,
          },
          attachments: [],
          recordType: '',
        },
      }
    }

    const fileKey = uuid.v4()
    const fs = await ctx.getResource('fileStorage')
    await fs.upload(fileKey, Buffer.from(page.html))

    return {
      status: 'ready',
      result: {
        type: 'file',
        mimeType: 'text/html',
        fileReference: {
          isExternal: false,
          key: fileKey,
          mimeType: 'text/html',
        },
        metadata: {
          title: page.title,
          mimeType: 'text/html',
          id: params.recordId,
          url: page.url,
          hash: page.hash,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
        },
      },
    }
  }

  processRecord = async (
    ctx: Context,
    params: ProcessRecordParams,
  ): Promise<ProcessRecordResult> => {
    if (params.recordId === ctx.source.id) {
      const pageCollection = await this._pageCollection(ctx)
      const pages = await pageCollection
        .find(
          {
            sourceId: ctx.source.id,
          },
          {
            limit: 1000,
            projection: {
              pageId: 1,
            },
          },
        )
        .toArray()
        .then((pages) => pages.map((page) => page.pageId))

      const rootPage = await pageCollection.findOne({
        sourceId: ctx.source.id,
        isRoot: true,
      })

      if (!rootPage)
        throw new ProviderPlugin.Exceptions.FileNotFound('Page not found!')

      const pageMetadata = (rootPage.metadata || {}) as Crawler.PageMetadata

      return {
        record: {
          __typename: 'Website',
          title: pageMetadata.title,
          description: pageMetadata.description,
          keywords: pageMetadata.keywords,
          locale: pageMetadata.locale,
          type: pageMetadata.type,
          properties: JSON.stringify(pageMetadata.properties || {}),
          url: rootPage.url,
          createdAt: params.metadata['createdAt'],
          modifiedAt: params.metadata['updatedAt'],
          pages: pages.map(
            (pageId) =>
              ({
                __typename: 'WebPage',
                remoteId: pageId,
              }) as any,
          ),
        } satisfies JsonRecord<'Website'>,
      }
    }

    return {
      record: {
        ...params.content,
        ...params.metadata,
        url: params.metadata['url'],
        remoteId: params.metadata['id'],
      },
    }
  }

  registerObserver = async (
    ctx: Context,
    params: RegisterObserverParams,
  ): Promise<RegisterObserverResult> => {
    return {}
  }

  unregisterObserver = async (
    ctx: Context,
    params: UnregisterObserverParams,
  ): Promise<UnregisterObserverResult> => {
    return {}
  }

  private _pageCollection = async (ctx: Context) => {
    return ctx
      .getResource('database')
      .then((db) => db.getCollection<PageDocument>('pages'))
  }
}
