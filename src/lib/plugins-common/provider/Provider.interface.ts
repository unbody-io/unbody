import { type z } from 'zod'
import { PluginContext } from '../runtime'
import { PluginEvent } from '../runtime/events'
import {
  EntrypointInput,
  EntrypointListOption,
  EntrypointOptions,
} from './Entrypoint.types'

export type ProviderContextSourceData<
  E extends Record<string, any> = Record<string, any>,
  C extends Record<string, any> = Record<string, any>,
  S extends Record<string, any> = Record<string, any>,
> = {
  id: string

  state: S
  entrypoint: E
  credentials: C
}

export type ProviderPluginContext<
  S extends ProviderContextSourceData = ProviderContextSourceData,
> = Omit<PluginContext, 'dispatchEvent'> & {
  source: S

  tempDir: string
  dispatchEvent: PluginContext.EventDispatcher<ProviderPlugin.Events.Event>
}

export namespace ProviderPlugin {
  export type Context = ProviderPluginContext
  export type SourceData = ProviderContextSourceData

  export namespace Events {
    export const EventNames = {
      SourceUpdated: 'source_updated' as 'source_updated',
    } as const

    export type EventName = (typeof EventNames)[keyof typeof EventNames]

    export type SourceUpdatedPayload = {
      sourceId: string
    }

    export class SourceUpdated extends PluginEvent<
      typeof EventNames.SourceUpdated,
      SourceUpdatedPayload
    > {
      constructor(payload: SourceUpdatedPayload) {
        super(Events.EventNames.SourceUpdated, payload)
      }
    }

    export type Event = SourceUpdated
    export type EventMap = Record<
      typeof EventNames.SourceUpdated,
      SourceUpdated
    >
  }
}

export interface ProviderPlugin<
  C extends ProviderPluginContext = ProviderPluginContext,
> {
  schemas: {
    config: z.ZodObject<any, any, any>
  }

  listEntrypointOptions: (
    ctx: C,
    params: ListEntrypointOptionsParams,
  ) => Promise<ListEntrypointOptionsResult>
  handleEntrypointUpdate: (
    ctx: C,
    params: HandleEntrypointUpdateParams,
  ) => Promise<HandleEntryPointUpdateResult<C['source']['entrypoint']>>
  validateEntrypoint: (
    ctx: C,
    params: ValidateEntrypointParams<C['source']['entrypoint']>,
  ) => Promise<ValidateEntrypointResult<C['source']['entrypoint']>>

  connect: (ctx: C, params: ConnectParams) => Promise<ConnectResult>
  verifyConnection: (
    ctx: C,
    params: VerifyConnectionParams,
  ) => Promise<VerifyConnectionResult>

  initSource: (
    ctx: C,
    params: InitSourceParams,
  ) => Promise<InitSourceResult<C['source']['state']>>
  handleSourceUpdate: (
    ctx: C,
    params: HandleSourceUpdateParams,
  ) => Promise<HandleSourceUpdateResult<C['source']['state']>>
  getRecordMetadata: (
    ctx: C,
    params: GetRecordMetadataParams,
  ) => Promise<GetRecordMetadataResult>
  getRecord: (ctx: C, params: GetRecordParams) => Promise<GetRecordResult>
  processRecord: (
    ctx: C,
    params: ProcessRecordParams,
  ) => Promise<ProcessRecordResult>

  registerObserver?: (
    ctx: C,
    params: RegisterObserverParams,
  ) => Promise<RegisterObserverResult>
  unregisterObserver?: (
    ctx: C,
    params: UnregisterObserverParams,
  ) => Promise<UnregisterObserverResult>
}

export type ListEntrypointOptionsParams = {
  parent?: EntrypointListOption
}

export type ListEntrypointOptionsResult = EntrypointOptions

export type HandleEntrypointUpdateParams = {
  entrypoint: EntrypointInput
}

export type HandleEntryPointUpdateResult<T> = {
  entrypoint: T
}

export type ValidateEntrypointParams<T = any> = {
  entrypoint: T
}

export type ValidateEntrypointResult<T = any> = {
  entrypoint?: T | null
}

export type ConnectParams = {
  state?: Record<string, any>
  redirectUrl?: string
}

export type ConnectResult = {
  redirectUrl?: string
}

export type VerifyConnectionParams<T = Record<string, any>> = {
  reconnect?: boolean
  payload?: T
}

export type VerifyConnectionResult<T = Record<string, any>> = {
  isValid: boolean
  credentials?: T
}

export type InitSourceParams = {
  taskId?: string

  maxRecords?: number
}

export type InitSourceResult<T extends Record<string, any>> = IndexingResult<T>

export type HandleSourceUpdateParams = {
  taskId?: string

  isManual?: boolean
  maxRecords?: number
}

export type HandleSourceUpdateResult<T extends Record<string, any>> =
  IndexingResult<T>

export type GetRecordMetadataParams = {
  recordId: string
}

export type GetRecordMetadataResult = {
  metadata: Record<string, any>
}

export type GetRecordParams = {
  recordId: string
  metadata?: Record<string, any>

  taskId?: string
}

export type ProcessRecordParams = {
  recordId: string
  metadata: Record<string, any>
  content: Record<string, any>
  attachments: {
    raw: AttachmentReference[]
    processed: ProcessedAttachment[]
  }
}

export type ProcessRecordResult = {
  record: Record<string, any>
}

export type AttachmentReference = {
  id: string
  filename: string
  contentType: string
  file:
    | {
        key: string
        isExternal: false
      }
    | {
        url: string
        isExternal: true
      }
}

export type ProcessedAttachment = {
  id: string
  url: string
  filename: string
  contentType: string
  processed: Record<string, any>
}

export type ProcessRecordLocalFileResult = {
  type: 'file'
  mimeType: string
  metadata: Record<string, any>
  fileReference: {
    key: string
    mimeType: string
    isExternal?: false
  }
}

export type ProcessRecordExternalFileResult = {
  type: 'file'
  mimeType: string
  metadata: Record<string, any>
  fileReference: {
    url: string
    isExternal: true
    mimeType: string
  }
}

export type ProcessRecordContentResult = {
  type: 'json'
  recordType: string
  metadata: Record<string, any>
  content: Record<string, any>
  attachments: AttachmentReference[]
}

export type GetRecordResult =
  | IndexingResultBase
  | (IndexingResultBase & {
      result:
        | ProcessRecordLocalFileResult
        | ProcessRecordExternalFileResult
        | ProcessRecordContentResult
    })

export const IndexingEventNames = {
  Created: 'created' as 'created',
  Updated: 'updated' as 'updated',
  Deleted: 'deleted' as 'deleted',
  Patched: 'patched' as 'patched',
} as const

export type IndexingEventName =
  (typeof IndexingEventNames)[keyof typeof IndexingEventNames]

export type IndexingEvent = {
  recordId: string
  recordType: string
  eventName: IndexingEventName

  dependsOn?: string[]
  metadata?: Record<string, any>
}

export type IndexingResultBase = {
  taskId?: string
  status: 'pending' | 'ready'
}

export type IndexingResult<
  T extends Record<string, any> = Record<string, any>,
> = IndexingResultBase & {
  events?: IndexingEvent[]
  sourceState?: T
}

export type RegisterObserverParams = {}

export type RegisterObserverResult = {}

export type UnregisterObserverParams = {}

export type UnregisterObserverResult = {}
