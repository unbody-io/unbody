import {
  ProviderContextSourceData,
  ProviderPluginContext,
} from 'src/lib/plugins-common/provider'

export type Config = {}

export type SourceEntrypoint = {
  directory: string
  maxDepth: number
}

export type SourceCredentials = {}

export type SourceState = {
  lastEventTimestamp?: string
}

type EventBase = {
  sourceId: string
  filename: string
  recordId: string
  timestamp: number
}

export type CreatedEvent = EventBase & {
  eventName: 'created'
  metadata: RecordMetadata
}

export type UpdatedEvent = EventBase & {
  eventName: 'updated'
  metadata: RecordMetadata
}

export type DeletedEvent = EventBase & {
  eventName: 'deleted'
  metadata?: undefined
}

export type EventDocument = CreatedEvent | UpdatedEvent | DeletedEvent

export type SourceDocument = {
  sourceId: string
  lockedAt: Date | null
  entrypoint: SourceEntrypoint
}

export type RecordMetadata = {
  originalName: string
  path: string[]
  pathString: string
  size: number
  ext: string
  mimeType: string
  createdAt: string
  modifiedAt: string
}

export type WatcherConfig = {
  sourceId: string
  directory: string
  maxDepth: number
}

export type SourceData = ProviderContextSourceData<
  SourceEntrypoint,
  SourceCredentials,
  SourceState
>

export type Context = ProviderPluginContext<SourceData>
