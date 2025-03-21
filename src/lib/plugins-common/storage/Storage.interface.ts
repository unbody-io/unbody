import type { z } from 'zod'
import { PluginContext } from '..'

export type StoragePluginContext = PluginContext & {
  tempDir: string
}

export interface StoragePlugin<C extends PluginContext = StoragePluginContext> {
  schemas: {
    config: z.ZodObject<any, any, any>
  }

  storeFile: (ctx: C, params: StoreFileParams) => Promise<StoreFileResult>
  deleteFile: (ctx: C, params: DeleteFileParams) => Promise<void>
  getRecordFiles: (
    ctx: C,
    params: GetRecordFilesParams,
  ) => Promise<StoreFileResult[]>
  changeFileVisibility: (
    ctx: C,
    params: ChangeFileVisibilityParams,
  ) => Promise<ChangeFileVisibilityResult>
  deleteRecordFiles: (ctx: C, params: DeleteRecordFilesParams) => Promise<void>
  deleteSourceFiles: (ctx: C, params: DeleteSourceFilesParams) => Promise<void>
}

export type StoreFileParams = {
  id: string
  sourceId: string
  recordId: string

  filename: string
  mimeType: string
  visibility: 'public' | 'private'
  file: NodeJS.ReadableStream | Buffer
}

export type StoreFileResult = {
  id: string
  sourceId: string
  recordId: string

  filename: string
  mimeType: string

  publicUrl: string
  privateUrl: string
  visibility: 'public' | 'private'
}

export type GetRecordFilesParams = {
  recordId: string
  sourceId: string
}

export type ChangeFileVisibilityParams = {
  visibility: 'public' | 'private'
  sourceId: string
} & (
  | {
      id: string
      recordId: string
    }
  | {
      recordId: string
    }
)

export type ChangeFileVisibilityResult = {
  files: StoreFileResult[]
}

export type DeleteFileParams = {
  id: string
  sourceId: string
  recordId: string
}

export type DeleteRecordFilesParams = {
  recordId: string
  sourceId: string
}

export type DeleteSourceFilesParams = {
  sourceId: string
}
