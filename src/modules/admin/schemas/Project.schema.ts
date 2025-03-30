import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, SchemaTypes } from 'mongoose'
import { CoreTypes } from 'src/lib/core-types'
import * as uuid from 'uuid'

@Schema({
  id: true,
  timestamps: true,
  collection: 'projects',
})
export class ProjectSchemaClass {
  @Prop({
    type: SchemaTypes.UUID,
    default: () => uuid.v4().toString(),
    cast: String,
  })
  _id: string

  @Prop({
    required: true,
  })
  name: string

  @Prop({
    required: true,
    enum: Object.values(CoreTypes.Project.States),
  })
  state: CoreTypes.Project.State

  @Prop({
    type: SchemaTypes.Mixed
  })
  settings: CoreTypes.ProjectSettings.Document

  @Prop()
  createdAt: Date

  @Prop()
  updatedAt: Date

  @Prop()
  pausedAt?: Date

  @Prop()
  restoredAt?: Date
}

export const ProjectSchema = SchemaFactory.createForClass(ProjectSchemaClass) 
