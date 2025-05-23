import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, SchemaTypes } from 'mongoose'
import { UploadFileOptions } from 'src/lib/plugins-common/resources/file-store'

@Schema({
  timestamps: true,
  collection: 'plugin_file_storage_files',
})
export class PluginFileCollectionSchema {
  @Prop()
  pluginId!: string

  @Prop()
  key!: string

  @Prop()
  contentType!: string

  @Prop({})
  size!: number

  @Prop({
    default: {},
    type: SchemaTypes.Mixed,
  })
  metadata!: Record<string, any>

  @Prop({
    type: SchemaTypes.Mixed,
  })
  payload!: Record<string, any> // Storage specific payload

  @Prop({
    type: SchemaTypes.Mixed,
  })
  options!: UploadFileOptions

  @Prop()
  createdAt!: Date

  @Prop()
  updatedAt!: Date

  @Prop()
  expiresAt?: Date
}

export type PluginFileCollectionDocument = PluginFileCollectionSchema & Document

export const pluginFileCollectionSchema = SchemaFactory.createForClass(
  PluginFileCollectionSchema,
)
pluginFileCollectionSchema.index(
  {
    key: 1,
    pluginId: 1,
  },
  {
    unique: true,
    sparse: true,
  },
)
