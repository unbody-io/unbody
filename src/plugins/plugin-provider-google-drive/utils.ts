import { drive_v3, google } from 'googleapis'
import { ReadStream, WriteStream, createWriteStream } from 'node:fs'
import { join } from 'node:path'
import _slugify from 'slugify'
import { ProviderPlugin } from 'src/lib/plugins-common/provider'
import { GOOGLE_DRIVE_FOLDER_MIME_TYPE } from './shared'

const slugify = (text: string, options?: Parameters<typeof _slugify>[1] | {}) =>
  _slugify(text, { strict: true, trim: true, lower: true, ...(options ?? {}) })

export const listDrives = async (params: { auth: any }) => {
  const drives: { id: string; name: string }[] = []

  let hasNext: boolean = true
  let pageToken: string = ''

  while (hasNext) {
    const { data } = await google
      .drive({ version: 'v3', auth: params.auth })
      .drives.list({
        pageToken,
        fields: 'drives(id, name)',
      })

    data.drives && drives.push(...(data.drives as any))

    if (data.nextPageToken) {
      pageToken = data.nextPageToken
    } else {
      hasNext = false
    }
  }

  return drives
}

export const listFolders = async (params: { auth: any; parent?: string }) => {
  const folders: { id: string; name: string }[] = []

  let hasNext: boolean = true
  let pageToken: string = ''

  while (hasNext) {
    const { data } = await google
      .drive({ version: 'v3', auth: params.auth })
      .files.list({
        pageToken,
        q: `mimeType="application/vnd.google-apps.folder" AND "${
          params.parent ?? 'root'
        }" in parents`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      })

    data.files && folders.push(...(data.files as any))

    if (data.nextPageToken) {
      pageToken = data.nextPageToken
    } else {
      hasNext = false
    }
  }

  return folders
}

export const getFileParent = async <T = drive_v3.Schema$File>(params: {
  auth: any
  fileId: string
  file?: drive_v3.Schema$File
  fields: string
}): Promise<T | null> => {
  const drive = google.drive({ version: 'v3', auth: params.auth })
  const file =
    params.file ??
    (
      await drive.files.get({
        fileId: params.fileId,
        fields: 'parents',
        supportsAllDrives: true,
      })
    ).data

  const parentId = file?.parents?.[0]
  if (!parentId) return null

  const { data: parent } = await drive.files.get({
    fileId: parentId,
    fields: params.fields ?? 'id, name, parents',
    supportsAllDrives: true,
  })

  return parent as any
}

export const findFileParents = async <T = drive_v3.Schema$File>(params: {
  auth: any
  fileId: string
  rootFolderId: string
  fields?: string
}): Promise<T[]> => {
  const parents: any[] = []

  while (true) {
    const parent = await getFileParent({
      auth: params.auth,
      fileId: parents[parents.length - 1]?.id ?? params.fileId,
      fields: 'id, name, parents',
    })

    if (!parent || parent.id === params.rootFolderId) break

    parents.push(parent)
  }

  return parents.reverse()
}

export const findFileDir = async (params: {
  auth: any
  fileId: string
  rootFolderId: string
}): Promise<string[]> => {
  const parents = await findFileParents({
    auth: params.auth,
    fileId: params.fileId,
    fields: 'id, name, parents',
    rootFolderId: params.rootFolderId,
  })

  return parents.map((file) => file.name!)
}

export const getFile = async (params: {
  auth: any
  fileId: string
  rootFolderId?: string
}): Promise<GoogleFile> => {
  const { data } = await google
    .drive({ version: 'v3', auth: params.auth })
    .files.get({ fileId: params.fileId, fields: '*', supportsAllDrives: true })

  const dir = params.rootFolderId
    ? await findFileDir({
        auth: params.auth,
        fileId: params.fileId,
        rootFolderId: params.rootFolderId,
      })
    : undefined

  return {
    id: data.id!,
    name: data.name!,
    createdTime: data.createdTime!,
    modifiedTime: data.modifiedTime!,
    mimeType: data.mimeType!,
    size: Number.parseInt(data.size ?? '0', 10),
    dir,
    trashed: data.trashed!,
  } as GoogleFile
}

export const getFileMetadata = async (params: {
  auth: any
  fileId: string
  rootFolderId?: string
}): Promise<GoogleDriveRecordMetadata> => {
  const file = await getFile({
    auth: params.auth,
    fileId: params.fileId,
    rootFolderId: params.rootFolderId,
  })

  if (file.trashed)
    throw new ProviderPlugin.Exceptions.FileNotFound(
      `File not found: ${params.fileId}`,
    )

  return generateFileMetadata({ file })
}

export const generateFileMetadata = (params: {
  file: GoogleFile
}): GoogleDriveRecordMetadata => {
  const { file } = params
  return {
    id: file.id,
    originalName: file.name,
    size: file.size
      ? typeof file.size === 'number'
        ? file.size
        : typeof file.size === 'string'
          ? Number.parseInt(file.size, 10)
          : 0
      : 0,
    mimeType: file.mimeType,
    createdAt: file.createdTime,
    slug: slugify(file.name),
    modifiedAt: file.modifiedTime,
    pathString: join('/', ...(file.dir ?? []), file.name),
    path: ['/', ...(file.dir ?? []), file.name],
  } as GoogleDriveRecordMetadata
}

export const listFilesInFolder = async (params: {
  auth: any
  folderId: string
  recursive?: boolean
}): Promise<FileList> => {
  const items: any[] = []

  let hasNext: boolean = true
  let pageToken: string = ''

  while (hasNext) {
    const { data } = await google
      .drive({ version: 'v3', auth: params.auth })
      .files.list({
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageToken,
        q: `"${params.folderId}" in parents`,
        fields: '*',
      })

    items.push(
      ...(params.recursive
        ? await Promise.all(
            (data.files ?? []).map(async (file) => {
              if (file.mimeType === GOOGLE_DRIVE_FOLDER_MIME_TYPE)
                return {
                  ...file,
                  files: await listFilesInFolder({
                    ...params,
                    folderId: file.id!,
                  }),
                }
              return file
            }),
          )
        : (data.files ?? [])),
    )
    if (data.nextPageToken) {
      pageToken = data.nextPageToken
    } else {
      hasNext = false
    }
  }

  return params.recursive ? setDirOnFileList(items) : items
}

export const flattenFileList = (list: FileList): FileListItem[] => {
  const result: FileList = []

  const flatten = (items: FileListItem[]) => {
    items.forEach((item) => {
      if (item.files) {
        result.push({ ...item, files: undefined })
        flatten(item.files)
      } else {
        result.push(item)
      }
    })
  }

  flatten(list)

  return result
}

export const setDirOnFileList = (list: FileList): FileList => {
  const setDir = (dir: string[], files: FileListItem[]): any =>
    files.map((file) => {
      if (file.files) {
        return {
          ...file,
          dir,
          files: setDir([...dir, file.name], file.files),
        }
      }

      return {
        ...file,
        dir,
      }
    })

  return setDir([], list)
}

export const promisifyStreamPipeline = <
  R extends ReadStream,
  W extends WriteStream,
>(
  readStream: R,
  writeStream: W,
) =>
  Promise.all([
    new Promise((resolve, reject) =>
      readStream
        .on('end', resolve as any)
        .on('error', reject)
        .pipe(writeStream),
    ),
    new Promise((resolve, reject) =>
      writeStream.on('close', resolve as any).on('error', reject),
    ),
  ])

export const createAssetDownloader =
  (params: { auth: any; fileId: string }) => async (path: string) => {
    const res = await google
      .drive({ version: 'v3', auth: params.auth })
      .files.get(
        {
          supportsAllDrives: true,
          fileId: params.fileId,
          alt: 'media',
        },
        { responseType: 'stream' },
      )

    return promisifyStreamPipeline(
      res.data as ReadStream,
      createWriteStream(path),
    )
  }

export const exportFile = (params: {
  auth: any
  fileId: string
  mimeType: string
}) =>
  google
    .drive({ version: 'v3', auth: params.auth })
    .files.export(
      { fileId: params.fileId, mimeType: params.mimeType },
      { responseType: 'stream' },
    )

export type GoogleFile = {
  id: string
  name: string
  mimeType: string
  trashed: boolean
  createdTime: string
  modifiedTime: string
  size: number
  files?: GoogleFile[]
  dir?: string[]
}

export type GoogleDriveRecordMetadata = {
  id: string
  slug: string
  originalName: string
  mimeType: string
  createdAt: string
  modifiedAt: string
  size: number
  path: string[]
  pathString: string
}

export type FileListItem = GoogleFile
export type FileList = GoogleFile[]
