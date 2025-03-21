import * as crypto from 'crypto'
import { MongoError } from 'mongodb'
import { Model } from 'mongoose'
import { settle } from 'src/lib/core-utils'
import {
  ListWebhooksOptions,
  Webhook,
  WebhookConfig,
} from 'src/lib/plugins-common/resources/webhook-registry'
import * as uuid from 'uuid'
import { PluginWebhookCollectionDocument } from './schemas/PluginWebhookCollection.schema'

export type PluginWebhookRegistryConfig = {
  baseUrl: string
}

export class PluginWebhookRegistry {
  private config: PluginWebhookRegistryConfig

  constructor(
    config: PluginWebhookRegistryConfig,
    private readonly models: {
      PluginWebhook: Model<PluginWebhookCollectionDocument>
    },
  ) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl.endsWith('/')
        ? config.baseUrl.slice(0, -1)
        : config.baseUrl,
    }
  }

  public async create(
    params: {
      pluginId: string
      sourceId?: string
    },
    { webhook: config }: { webhook: WebhookConfig },
  ) {
    const id = uuid.v4()
    const uniquePath = `${params.pluginId}/${uuid.v4()}`
    const url = `${this.config.baseUrl}/${uniquePath}`

    if (config.scope === 'source' && !params.sourceId)
      throw new Error('Source ID is required for source scoped webhooks')

    const [webhook, err] = await settle(() =>
      this.models.PluginWebhook.create({
        _id: id,
        key: config.key,
        url: url,
        pluginId: params.pluginId,
        sourceId: params.sourceId,
        scope: config.scope || 'global',
        description: config.description || '',
        metadata: config.metadata || {},
        secretSalt: crypto.randomBytes(16).toString('hex'),
      }),
    )

    if (err) {
      if (err instanceof MongoError && err.code === 11000) {
        throw new Error('Webhook key already exists')
      }

      throw err
    }

    return webhook.toJSON({ virtuals: true })
  }

  public async get(
    {
      pluginId,
      sourceId,
    }: {
      pluginId: string
      sourceId?: string
    },
    params: {
      key: string
      scope: 'global' | 'source'
    },
  ) {
    return this.models.PluginWebhook.findOne({
      key: params.key,
      scope: params.scope,
      pluginId: pluginId,
      sourceId: sourceId,
    }).then((res) => (res ? res.toJSON({ virtuals: true }) : null))
  }

  public async getById(
    { pluginId }: { pluginId: string },
    params: { id: string },
  ) {
    return this.models.PluginWebhook.findOne({
      _id: params.id,
      pluginId: pluginId,
    }).then((res) => (res ? res.toJSON({ virtuals: true }) : null))
  }

  public async delete(
    {
      pluginId,
      sourceId,
    }: {
      pluginId: string
      sourceId?: string
    },
    params: {
      key: string
      scope: 'global' | 'source'
    },
  ) {
    await this.models.PluginWebhook.deleteMany({
      key: params.key,
      pluginId: pluginId,
      scope: 'global',
      ...(params.scope === 'source'
        ? { sourceId: sourceId, scope: 'source' }
        : {}),
    })
  }

  public async deleteById(
    {
      pluginId,
    }: {
      pluginId: string
    },
    params: { id: string },
  ) {
    await this.models.PluginWebhook.deleteOne({
      _id: params.id,
      pluginId: pluginId,
    })
  }

  public async list(
    {
      pluginId,
      sourceId,
    }: {
      pluginId: string
      sourceId?: string
    },
    params: {
      options: ListWebhooksOptions
    },
  ) {
    const docs = await this.models.PluginWebhook.find({
      pluginId: pluginId,
      ...(params.options?.scope ? { scope: params.options.scope } : {}),
      ...(params.options?.scope === 'source' && sourceId
        ? {
            sourceId: sourceId,
          }
        : {}),
      ...(params.options.cursor
        ? {
            _id: {
              $gt: params.options.cursor,
            },
          }
        : {}),
    }).limit(params.options.limit || 10)

    return {
      webhooks: docs.map((doc) => doc.toJSON({ virtuals: true })),
      cursor: docs.length ? docs[docs.length - 1]!._id!.toString() : undefined,
    }
  }

  public async update(
    {
      pluginId,
      sourceId,
    }: {
      pluginId: string
      sourceId?: string
    },
    {
      key,
      scope,
      payload,
    }: {
      key: string
      scope: 'global' | 'source'
      payload: Pick<WebhookConfig, 'metadata'>
    },
  ) {
    const doc = await this.models.PluginWebhook.findOne({
      key,
      pluginId,
      ...(scope === 'source'
        ? {
            scope: 'source',
            sourceId,
          }
        : {
            scope: 'global',
          }),
    })

    if (!doc) throw new Error('Webhook not found')

    doc.metadata = payload.metadata || {}
    await doc.save()

    return doc.toJSON({ virtuals: true })
  }

  public async updateById(
    {
      pluginId,
    }: {
      pluginId: string
    },
    {
      id,
      payload,
    }: {
      id: string
      payload: Pick<WebhookConfig, 'metadata'>
    },
  ) {
    const doc = await this.models.PluginWebhook.findOne({
      _id: id,
      pluginId,
    })

    if (!doc) throw new Error('Webhook not found')

    doc.metadata = payload.metadata || {}
    await doc.save()

    return doc.toJSON({ virtuals: true })
  }

  deleteAll = async (
    {
      pluginId,
      sourceId,
    }: {
      pluginId: string
      sourceId?: string
    },
    {
      scope,
    }: {
      scope?: 'global' | 'source'
    },
  ) => {
    await this.models.PluginWebhook.deleteMany({
      pluginId,
      ...(scope === 'source'
        ? { sourceId, scope }
        : scope === 'global'
          ? { scope }
          : {}),
    })
  }

  public async getSecret(
    {
      pluginId,
      sourceId,
    }: {
      pluginId: string
      sourceId?: string
    },
    params: {
      webhook: WebhookConfig | Webhook
    },
  ) {
    const doc =
      'id' in params.webhook
        ? await this.models.PluginWebhook.findOne({
            _id: params.webhook.id,
            pluginId: pluginId,
          })
        : await this.models.PluginWebhook.findOne({
            key: params.webhook.key,
            scope: params.webhook.scope || 'global',
            pluginId: pluginId,
            ...(params.webhook.scope === 'source'
              ? {
                  sourceId: sourceId,
                }
              : {}),
          })

    if (!doc) throw new Error('Webhook not found')

    const plain = `${doc.pluginId}:${doc.scope === 'source' ? doc.sourceId : 'global'}:${doc.key}:${doc.secretSalt}`

    return crypto.createHash('sha256').update(plain).digest('hex')
  }

  public async findWebhook(params: { pluginId: string; url: string }) {
    const path = params.url.split('/')
    const webhookPath = '/' + path.slice(path.length - 2).join('/')
    const url = `${this.config.baseUrl}${webhookPath}`

    const webhook = await this.models.PluginWebhook.findOne({
      url,
      pluginId: params.pluginId,
    })

    return webhook ? webhook.toJSON({ virtuals: true }) : null
  }
}
