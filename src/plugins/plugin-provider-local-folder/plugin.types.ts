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

export type EventDocument = {
  sourceId: string
  filename: string
  recordId: string
  eventName: 'created' | 'updated' | 'deleted'
  timestamp: number
  metadata?: Record<string, any>
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
