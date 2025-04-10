import {
  ProviderContextSourceData,
  ProviderPluginContext,
} from 'src/lib/plugins-common/provider'

export type Config = {}

export type SourceEntrypoint = {
  url: string
  maxDepth: number
  maxPages: number
}

export type SourceCredentials = {}

export type SourceState = {
  lastEventTimestamp?: string
}

export type SourceData = ProviderContextSourceData<
  SourceEntrypoint,
  SourceCredentials,
  SourceState
>

export type Context = ProviderPluginContext<SourceData>

export type PageDocument = {
  pageId: string
  url: string
  hash: string
  title: string
  html: string
  isRoot: boolean
  metadata: Record<string, any>
  sourceId: string
  createdAt: Date
  updatedAt: Date
}
