export interface WebhookRegistryAPI {
  get: (key: string, scope?: 'global' | 'source') => Promise<Webhook | null>
  getById: (id: string) => Promise<Webhook | null>

  delete: (key: string, scope?: 'global' | 'source') => Promise<void>
  deleteById: (id: string) => Promise<void>

  list: (options?: ListWebhooksOptions) => Promise<ListWebhooksResult>

  create: (webhook: WebhookConfig) => Promise<Webhook>

  getSecret: (webhook: WebhookConfig) => Promise<{
    secret: string
  }>

  update: (
    key: string,
    payload: Pick<WebhookConfig, 'metadata'>,
    scope?: 'global' | 'source',
  ) => Promise<Webhook>
  updateById: (
    id: string,
    payload: Pick<WebhookConfig, 'metadata'>,
  ) => Promise<Webhook>

  deleteAll: (scope?: 'global' | 'source') => Promise<void>
}

export type WebhookConfig = {
  key: string
  scope?: 'global' | 'source'
  description?: string
  metadata?: Record<string, any>
}

export type Webhook = WebhookConfig & {
  id: string
  url: string
  createdAt: Date
}

export type ListWebhooksOptions = {
  limit?: number
  cursor?: string
  scope?: 'global' | 'source'
}

export type ListWebhooksResult = {
  webhooks: Webhook[]

  cursor?: string
}

export type WebhookEvent = {
  url: string
  rawBody: string
  headers: Record<string, string>

  timestamp: Date
}
