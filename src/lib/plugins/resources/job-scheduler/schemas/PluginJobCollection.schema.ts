import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, SchemaTypes } from 'mongoose'

@Schema({
  timestamps: true,
  collection: 'plugin_job_scheduler_jobs',
})
export class PluginJobCollectionSchema {
  @Prop()
  name: string

  @Prop()
  pluginId: string

  @Prop()
  scope: 'global' | 'source'

  @Prop()
  sourceId?: string

  @Prop()
  schedule: string

  @Prop()
  every?: string

  @Prop({
    type: SchemaTypes.Mixed,
  })
  retryOptions: {
    maxRetries?: number
    retryDelay?: number
    backoffFactor?: number
  }

  @Prop({
    type: SchemaTypes.Mixed,
    default: {},
  })
  payload: Record<string, any>

  @Prop({
    type: SchemaTypes.Mixed,
  })
  jobId: string

  @Prop()
  createdAt: Date

  @Prop()
  updatedAt: Date
}

export type PluginJobCollectionDocument = PluginJobCollectionSchema & Document

export const pluginJobCollectionSchema = SchemaFactory.createForClass(
  PluginJobCollectionSchema,
)
pluginJobCollectionSchema.index(
  {
    name: 1,
    pluginId: 1,
    scope: 1,
    sourceId: 1,
  },
  {
    unique: true,
    sparse: true,
  },
)
