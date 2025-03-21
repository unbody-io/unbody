import * as fs from 'fs'
import { Model } from 'mongoose'
import * as path from 'path'
import { settle } from 'src/lib/core-utils'
import {
  ListFilesOptions,
  UploadFileOptions,
} from 'src/lib/plugins-common/resources/file-store'
import { PluginFileCollectionDocument } from './schemas/PluginFileCollection.schema'

export type PluginFileStorageConfig = {
  rootPath: string
}

export class PluginFileStorage {
  private config: PluginFileStorageConfig

  constructor(
    config: PluginFileStorageConfig,
    private readonly models: {
      PluginFile: Model<PluginFileCollectionDocument>
    },
  ) {
    this.config = {
      ...config,
    }
  }

  async upload(
    { pluginId }: { pluginId: string },
    params: {
      key: string
      file: Buffer | NodeJS.ReadableStream
      options?: UploadFileOptions
    },
  ) {
    const dir = await this.getPluginDir({ pluginId })

    const session = await this.models.PluginFile.startSession()
    return session.withTransaction(async (session) => {
      const filename = path.join(dir, params.key)
      const expiresAt = params.options?.ttl
        ? new Date(Date.now() + params.options.ttl * 1000)
        : undefined

      const files = await this.models.PluginFile.create(
        {
          pluginId,
          key: params.key,
          options: params.options || {},
          metadata: params.options?.metadata || {},
          expiresAt: expiresAt,

          payload: {
            filename,
          },
        },
        { session },
      )

      await fs.promises.writeFile(filename, params.file)

      const size = await fs.promises.stat(filename).then((stat) => stat.size)

      const file = files[0]
      await file.updateOne({ size: size }, { session })

      return {
        size,
        contentType: file.contentType,
        metadata: file.metadata,
        ttl: file.options?.ttl,
      }
    })
  }

  async get({ pluginId }: { pluginId: string }, params: { key: string }) {
    const file = await this.models.PluginFile.findOne({
      pluginId,
      key: params.key,
    })

    if (!file) throw new Error(`File not found: ${params.key}`)

    return {
      key: file.key,
      size: file.size,
      ttl: file.options?.ttl,
      metadata: file.metadata,
      contentType: file.contentType,
    }
  }

  async delete({ pluginId }: { pluginId: string }, params: { key: string }) {
    const file = await this.models.PluginFile.findOne({
      pluginId,
      key: params.key,
    })

    if (!file) throw new Error(`File not found: ${params.key}`)

    await fs.promises.unlink(file.payload.filename)
    await file.deleteOne()
  }

  async list(
    { pluginId }: { pluginId: string },
    params: { options?: ListFilesOptions },
  ) {
    const files = await this.models.PluginFile.find({
      pluginId,
      ...(params.options?.cursor
        ? {
            createdAt: {
              $lt: params.options.cursor,
            },
          }
        : {}),
    })
      .limit(params.options?.limit || 100)
      .sort({ createdAt: -1 })

    return {
      files: files.map((file) => ({
        key: file.key,
        size: file.size,
        ttl: file.options?.ttl,
        metadata: file.metadata,
        contentType: file.contentType,
      })),
      cursor: files[files.length - 1]?._id as string | undefined,
    }
  }

  async download({ pluginId }: { pluginId: string }, params: { key: string }) {
    const file = await this.models.PluginFile.findOne({
      pluginId,
      key: params.key,
    })

    if (!file) throw new Error(`File not found: ${params.key}`)

    return fs.createReadStream(file.payload.filename)
  }

  private getPluginDir = (() => {
    const dirs: Record<string, string> = {}

    return async ({ pluginId }: { pluginId: string }) => {
      const rootDir = this.config.rootPath

      if (dirs[pluginId]) {
        return dirs[pluginId]
      }

      const dir = path.join(rootDir, pluginId)
      const [stat] = await settle(() => fs.promises.stat(dir))

      if (!stat || !stat.isDirectory()) {
        await fs.promises.mkdir(dir, { recursive: true })
      }

      dirs[pluginId] = dir

      return dir
    }
  })()
}
