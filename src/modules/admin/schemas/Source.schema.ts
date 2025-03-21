import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { SchemaTypes } from 'mongoose'
import { UnbodySourceState, UnbodySourceStates } from 'src/lib/core-types'
import * as uuid from 'uuid'

export type SourceDocument = SourceSchemaClass & Document

@Schema({
  id: true,
  timestamps: true,
  collection: 'sources',
})
export class SourceSchemaClass {
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

  @Prop({})
  provider: string

  @Prop({
    default: UnbodySourceStates.Idle,
    enum: Object.values(UnbodySourceStates),
  })
  state: UnbodySourceState

  @Prop({
    default: false,
  })
  connected: boolean

  @Prop({
    default: false,
  })
  initialized: boolean

  @Prop({
    default: () => ({}),
    type: SchemaTypes.Mixed,
  })
  credentials: Record<string, any>

  @Prop({
    default: () => ({}),
    type: SchemaTypes.Mixed,
  })
  providerState: Record<string, any>

  @Prop({
    default: null,
    type: SchemaTypes.Mixed,
  })
  entrypoint: Record<string, any>

  @Prop({
    default: null,
    type: SchemaTypes.Mixed,
  })
  entrypointOptions: Record<string, any>

  @Prop({})
  createdAt: Date

  @Prop({})
  updatedAt: Date
}

export const SourceSchema = SchemaFactory.createForClass(SourceSchemaClass)
