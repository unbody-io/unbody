import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, SchemaTypes } from 'mongoose'
import { PluginManifest } from 'src/lib/plugins-common'
import * as uuid from 'uuid'

@Schema({
  id: true,
  timestamps: true,
  collection: 'plugin_states',
})
export class PluginStateCollectionSchema {
  @Prop({
    type: SchemaTypes.UUID,
    default: () => uuid.v4().toString(),
    cast: String,
  })
  _id: string

  @Prop({})
  alias: string

  @Prop({
    required: true,
    type: SchemaTypes.Mixed,
  })
  manifest: PluginManifest
}

export type PluginStateCollectionDocument = PluginStateCollectionSchema &
  Document

export const pluginStateCollectionSchema = SchemaFactory.createForClass(
  PluginStateCollectionSchema,
)
