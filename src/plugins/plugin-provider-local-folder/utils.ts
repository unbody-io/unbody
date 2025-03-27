import * as chokidar from 'chokidar'
import * as fs from 'fs'
import * as mimeTypes from 'mime-types'
import * as path from 'path'
import { settle } from 'src/lib/core-utils'
import * as uuid from 'uuid'
import { EventDocument, RecordMetadata, WatcherConfig } from './plugin.types'

export const getFileMetadata = async (
  directory: string,
  filename: string,
  stat: fs.Stats,
): Promise<RecordMetadata> => {
  const originalName = path.basename(filename)
  const ext = path.extname(filename)
  if (!ext) throw new Error('Unknown file type')
  const mimeType = mimeTypes.lookup(ext) || ''
  if (!mimeType) throw new Error('Unknown file type')
  const pathString = path.relative(directory, filename)
  const filePath = pathString.split(path.sep)
  const createdAt = stat.birthtime.toJSON()
  const modifiedAt = stat.mtime.toJSON()
  const size = stat.size

  return {
    originalName,
    size,
    ext,
    mimeType,
    pathString,
    path: filePath,
    createdAt,
    modifiedAt,
  }
}

export const scanFolder = async (
  config: WatcherConfig,
): Promise<EventDocument[]> => {
  const events: EventDocument[] = []

  const watcher = chokidar.watch(config.directory, {
    atomic: 1000,
    interval: 1000,
    usePolling: true,
    ignoreInitial: false,
    awaitWriteFinish: true,
    depth: config.maxDepth,
  })

  return new Promise((resolve) => {
    let ready = false

    watcher.on('ready', () => {
      ready = true

      resolve(events)
      watcher.close()
    })

    watcher.on('add', async (filename, stat) => {
      if (ready) {
        return
      }

      if (!stat || !stat.isFile()) return

      const id = uuid.v5(`${config.sourceId}:${filename}`, uuid.v5.URL)
      const relative = path.relative(config.directory, filename)

      const [metadata, metadataErr] = await settle(() =>
        getFileMetadata(config.directory, filename, stat),
      )

      if (metadataErr) {
        return
      }

      events.push({
        recordId: id,
        filename: relative,
        timestamp: Date.now(),
        sourceId: config.sourceId,
        metadata,
        eventName: 'created',
      } satisfies EventDocument)
    })
  })
}

export const watchForChanges = async (
  config: WatcherConfig,
  callback: (event: EventDocument) => Promise<void>,
) => {
  const watcher = chokidar.watch(config.directory, {
    atomic: 1000,
    interval: 1000,
    usePolling: true,
    awaitWriteFinish: true,

    ignoreInitial: true,
    depth: config.maxDepth,
  })

  watcher.on('all', async (event, filename, stat) => {
    if (!['add', 'change', 'unlink'].includes(event)) return

    const id = uuid.v5(`${config.sourceId}:${filename}`, uuid.v5.URL)
    const relative = path.relative(config.directory, filename)

    if (event === 'unlink') {
      await callback({
        recordId: id,
        filename: relative,
        timestamp: Date.now(),
        sourceId: config.sourceId,
        eventName: 'deleted',
      } satisfies EventDocument)
      return
    }
    if (!stat || !stat.isFile()) return

    const [metadata, metadataErr] = await settle(() =>
      getFileMetadata(config.directory, filename, stat),
    )

    if (metadataErr) {
      return
    }

    await callback({
      recordId: id,
      filename: relative,
      timestamp: Date.now(),
      sourceId: config.sourceId,
      metadata: metadata,
      eventName:
        event === 'add'
          ? 'created'
          : event === 'change'
            ? 'updated'
            : 'deleted',
    } satisfies EventDocument)
  })

  return watcher
}
