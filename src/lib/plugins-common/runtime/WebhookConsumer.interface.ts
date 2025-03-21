import { PluginContext } from '.'
import { Webhook, WebhookEvent } from '../resources/webhook-registry'

export interface WebhookConsumer<C extends PluginContext = PluginContext> {
  onWebhookEvent: (
    ctx: C,
    webhook: Webhook,
    event: WebhookEvent,
  ) => Promise<void>
}
