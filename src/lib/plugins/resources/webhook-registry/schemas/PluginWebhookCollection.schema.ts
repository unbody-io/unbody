import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, SchemaTypes } from 'mongoose'
import * as uuid from 'uuid'

@Schema({
  id: true,
  timestamps: true,
  collection: 'plugin_webhook_registry_webhooks',
})
export class PluginWebhookCollectionSchema {
  @Prop({
    type: SchemaTypes.UUID,
    default: () => uuid.v4().toString(),
    cast: String,
  })
  _id: string

  @Prop()
  key: string

  @Prop()
  pluginId: string

  @Prop()
  scope: 'global' | 'source'

  @Prop()
  sourceId?: string

  @Prop({
    default: '',
  })
  description: string

  @Prop({
    type: SchemaTypes.Mixed,
    default: {},
  })
  metadata: Record<string, any>

  @Prop()
  url: string

  @Prop()
  secretSalt: string

  @Prop()
  createdAt: Date

  @Prop()
  updatedAt: Date
}

export type PluginWebhookCollectionDocument = PluginWebhookCollectionSchema &
  Document

export const pluginWebhookCollectionSchema = SchemaFactory.createForClass(
  PluginWebhookCollectionSchema,
)
pluginWebhookCollectionSchema.index(
  {
    key: 1,
    pluginId: 1,
    scope: 1,
    sourceId: 1,
  },
  {
    unique: true,
    sparse: true,
  },
)
