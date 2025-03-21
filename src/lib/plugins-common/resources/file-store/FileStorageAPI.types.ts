export interface FileStorageAPI {
  upload: (
    key: string,
    file: Buffer | NodeJS.ReadableStream,
    options?: UploadFileOptions,
  ) => Promise<UploadFileResult>

  get: (key: string) => Promise<GetFileResult | null>

  delete: (key: string) => Promise<void>

  list: (options?: ListFilesOptions) => Promise<ListFilesResult>

  download: (key: string) => Promise<NodeJS.ReadableStream>
}

export type UploadFileOptions = {
  size?: number
  contentType?: string
  metadata?: Record<string, any>

  ttl?: number // time to live in seconds
}

export type UploadFileResult = {
  size: number
  contentType: string
  metadata: Record<string, any>

  ttl?: number
}

export type GetFileResult = {
  size: number
  contentType: string
  metadata: Record<string, any>

  ttl?: number
}

export type ListFilesOptions = {
  limit?: number
  cursor?: string
}

export type ListFilesResult = {
  files: {
    key: string
    size: number
    contentType: string
    metadata: Record<string, any>

    ttl?: number
  }[]

  cursor?: string
}
