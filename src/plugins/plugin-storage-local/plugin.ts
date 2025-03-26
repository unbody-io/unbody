import * as fs from 'fs'
import * as path from 'path'
import _slugify from 'slugify'
import { PluginLifecycle } from 'src/lib/plugins-common'
import {
  ChangeFileVisibilityParams,
  ChangeFileVisibilityResult,
  DeleteFileParams,
  DeleteSourceFilesParams,
  GetRecordFilesParams,
  StoragePlugin,
  StoragePluginContext,
  StoreFileParams,
  StoreFileResult,
} from 'src/lib/plugins-common/storage/Storage.interface'
import { z, ZodError } from 'zod'
import { Config, Context } from './plugin.types'
import { configSchema } from './plugin.types'

export const slugify = (
  text: string,
  options?: Parameters<typeof _slugify>[1] | {},
) =>
  _slugify(text, { strict: true, trim: true, lower: true, ...(options ?? {}) })

const encodeFilename = (id: string, filename: string) => {
  return Buffer.from(JSON.stringify([id, filename])).toString('base64')
}

const decodeFilename = (file: string) => {
  const [id, filename] = JSON.parse(
    Buffer.from(file, 'base64').toString('utf-8'),
  )

  return [id, filename]
}

export class LocalStoragePlugin implements PluginLifecycle, StoragePlugin {
  private config: Config
  private tree: Record<
    string,
    {
      sourceId: string
      records: Record<
        string,
        {
          recordId: string
          public: Record<string, StoreFileResult>
          private: Record<string, StoreFileResult>
        }
      >
    }
  > = {}

  schemas: StoragePlugin['schemas'] = {
    config: z.object({
      publicRootDir: z.string(),
      privateRootDir: z.string(),
    }),
  }

  constructor() {}

  initialize = async (config: Record<string, any>) => {
    try {
      this.config = configSchema.parse(config)
    } catch (e) {
      if (e instanceof z.ZodError) {
        throw new PluginLifecycle.ConfigurationError(
          config,
          e.issues.map((issue) => `'${issue.path}' ${issue.message}`),
        )
      }
    }

    if (!fs.existsSync(this.config.publicRootDir)) {
      throw new PluginLifecycle.OtherError('Directory not found.', {
        details: [
          `Public root directory does not exist: ${this.config.publicRootDir}`,
        ]
      })
    }

    if (!fs.existsSync(this.config.privateRootDir)) {
      throw new PluginLifecycle.OtherError('Directory not found.', {
        details: [
          `Private root directory does not exist: ${this.config.privateRootDir}`,
        ]
      })
    }

    await this._loadTree()
  }

  bootstrap = async (ctx: Context) => {}

  destroy = async (ctx: Context) => {}

  storeFile = async (
    ctx: StoragePluginContext,
    params: StoreFileParams,
  ): Promise<StoreFileResult> => {
    const { id, file, filename, recordId, sourceId, visibility } = params

    const recordDirs = [
      path.join(this.config.publicRootDir, sourceId, recordId),
      path.join(this.config.privateRootDir, sourceId, recordId),
    ]

    for (const recordDir of recordDirs) {
      if (!fs.existsSync(recordDir)) {
        fs.mkdirSync(recordDir, { recursive: true })
      }
    }

    const rootDir =
      visibility === 'public'
        ? this.config.publicRootDir
        : this.config.privateRootDir
    const recordDir = path.join(rootDir, sourceId, recordId)

    const writeStream = fs.createWriteStream(
      path.join(recordDir, encodeFilename(id, filename)),
    )
    if (file instanceof Buffer) {
      writeStream.write(file)
      writeStream.end()
    } else {
      await new Promise((resolve, reject) => {
        const stream = file as NodeJS.ReadableStream
        stream
          .pipe(writeStream)
          .on('finish', () => resolve(null))
          .on('error', reject)
      })
    }

    await this._loadTree()

    return this._getFile(sourceId, recordId, id)
  }

  deleteFile = async (ctx: Context, params: DeleteFileParams) => {
    const { id, recordId, sourceId } = params

    const file = await this._getFile(sourceId, recordId, id)
    const rootDir =
      file.visibility === 'public'
        ? this.config.publicRootDir
        : this.config.privateRootDir
    const filePath = path.join(
      rootDir,
      sourceId,
      recordId,
      encodeFilename(id, file.filename),
    )
    await fs.promises.unlink(filePath)
    await this._loadTree()
  }

  changeFileVisibility = async (
    ctx: Context,
    params: ChangeFileVisibilityParams,
  ) => {
    if ('id' in params) {
      const file = await this._getFile(
        params.sourceId,
        params.recordId,
        params.id,
      )
      const oldVisibility = file.visibility
      if (oldVisibility === params.visibility) {
        return {
          files: [file],
        }
      }
      const oldFile = path.join(
        this.config[
          oldVisibility === 'public' ? 'publicRootDir' : 'privateRootDir'
        ],
        params.sourceId,
        params.recordId,
        encodeFilename(params.id, file.filename),
      )
      const newFile = path.join(
        this.config[
          params.visibility === 'public' ? 'publicRootDir' : 'privateRootDir'
        ],
        params.sourceId,
        params.recordId,
        encodeFilename(params.id, file.filename),
      )

      await fs.promises.rename(oldFile, newFile)

      await this._loadTree()

      return {
        files: [
          await this._getFile(params.sourceId, params.recordId, params.id)!,
        ] as StoreFileResult[],
      }
    }

    const files = await this._getRecordFiles(params.sourceId, params.recordId)
    for (const file of files) {
      if (file.visibility === params.visibility) continue

      const oldFile = path.join(
        this.config[
          file.visibility === 'public' ? 'publicRootDir' : 'privateRootDir'
        ],
        params.sourceId,
        params.recordId,
        encodeFilename(file.id, file.filename),
      )
      const newFile = path.join(
        this.config[
          params.visibility === 'public' ? 'publicRootDir' : 'privateRootDir'
        ],
        params.sourceId,
        params.recordId,
        encodeFilename(file.id, file.filename),
      )

      await fs.promises.rename(oldFile, newFile)
    }

    await this._loadTree()

    return {
      files: (await Promise.all(
        files.map((file) =>
          this._getFile(params.sourceId, params.recordId, file.id),
        ),
      )) as StoreFileResult[],
    } as ChangeFileVisibilityResult
  }

  getRecordFiles = async (ctx: Context, params: GetRecordFilesParams) => {
    return this._getRecordFiles(params.sourceId, params.recordId)
  }

  deleteRecordFiles = async (ctx: Context, params: GetRecordFilesParams) => {
    const { sourceId, recordId } = params

    const dirs = [
      path.join(this.config.privateRootDir, sourceId, recordId),
      path.join(this.config.publicRootDir, sourceId, recordId),
    ]

    for (const dir of dirs) {
      if (fs.existsSync(dir)) {
        await fs.promises.rm(dir, { force: true, recursive: true })
      }
    }

    await this._loadTree()
  }

  deleteSourceFiles = async (ctx: Context, params: DeleteSourceFilesParams) => {
    const { sourceId } = params

    const dirs = [
      path.join(this.config.privateRootDir, sourceId),
      path.join(this.config.publicRootDir, sourceId),
    ]

    for (const dir of dirs) {
      if (fs.existsSync(dir)) {
        await fs.promises.rm(dir, { force: true, recursive: true })
      }
    }

    await this._loadTree()
  }

  private async _getFile(sourceId: string, recordId: string, id: string) {
    return (
      this.tree[sourceId].records[recordId].public[id] ||
      this.tree[sourceId].records[recordId].private[id]
    )
  }

  private async _getRecordFiles(
    sourceId: string,
    recordId: string,
  ): Promise<StoreFileResult[]> {
    return [
      ...Object.values(this.tree[sourceId].records[recordId].public),
      ...Object.values(this.tree[sourceId].records[recordId].private),
    ]
  }

  private async _loadTree() {
    const tree: LocalStoragePlugin['tree'] = {}

    const rootDirs = [this.config.publicRootDir, this.config.privateRootDir]
    await Promise.all(
      rootDirs.map(async (rootDir, index) => {
        const sources = await fs.promises.readdir(rootDir)
        for (const source of sources) {
          if (!tree[source]) {
            tree[source] = {
              sourceId: source,
              records: {},
            }
          }

          const recordDirs = await fs.promises.readdir(
            path.join(rootDir, source),
          )

          for (const record of recordDirs) {
            if (!tree[source].records[record])
              tree[source].records[record] = {
                private: {},
                public: {},
                recordId: record,
              }

            const files = await fs.promises.readdir(
              path.join(rootDir, source, record),
            )

            for (const file of files) {
              const [id, filename] = decodeFilename(file)
              tree[source].records[record][index === 0 ? 'public' : 'private'][
                id
              ] = {
                id,
                filename: filename,
                mimeType: '',
                privateUrl: await this._getFileUrl(
                  source,
                  record,
                  id,
                  filename,
                  'private',
                ),
                publicUrl: await this._getFileUrl(
                  source,
                  record,
                  id,
                  filename,
                  'public',
                ),
                recordId: record,
                sourceId: source,
                visibility: index === 0 ? 'public' : 'private',
              }
            }
          }
        }
      }),
    )

    this.tree = tree
  }

  private _getFileUrl = (
    sourceId: string,
    recordId: string,
    id: string,
    filename: string,
    visibility: 'public' | 'private',
  ) => {
    const rootDir =
      visibility === 'public'
        ? this.config.publicRootDir
        : this.config.privateRootDir

    const baseUrl =
      visibility === 'public'
        ? this.config.publicBaseUrl
        : this.config.privateBaseUrl
    return `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}${sourceId}/${recordId}/${encodeFilename(id, filename)}`
  }
}
