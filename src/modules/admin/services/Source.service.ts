import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { UnbodySourceDoc } from 'src/lib/core-types'
import { Unbody } from 'src/lib/core/Unbody'
import { IndexingService } from 'src/modules/indexing/services/Indexing.service'
import * as uuid from 'uuid'
import { ConnectSourceDto } from '../dto/ConnectSource.dto'
import { CreateSourceDto } from '../dto/CreateSource.dto'
import { ListEntrypointOptionsDto } from '../dto/ListEntrypointOptions.dto'
import { SetEntrypointDto } from '../dto/SetEntrypoint.dto'
import { VerifySourceConnectionDto } from '../dto/VerifySourceConnection.dto'
import { SourceSchemaClass } from '../schemas/Source.schema'

@Injectable()
export class SourceService {
  constructor(
    @InjectModel(SourceSchemaClass.name)
    private sourceModel: Model<SourceSchemaClass>,
    private indexingService: IndexingService,
    private unbody: Unbody,
  ) {}

  async create({ body }: { body: CreateSourceDto }) {
    const provider = await this.unbody.plugins.registry.getProvider(
      body.provider,
    )

    if (!provider) throw new BadRequestException('Provider not found')

    const source = await this.sourceModel.create({
      name: body.name,
      provider: body.provider,
    })

    return source.toJSON({ virtuals: true })
  }

  private async _getSource(sourceId: string) {
    const doc = await this.sourceModel.findById(sourceId)
    if (!doc) throw new BadRequestException('Source not found')

    const source: UnbodySourceDoc = {
      id: doc._id,
      name: doc.name,

      state: doc.state,
      provider: doc.provider,
      connected: doc.connected,
      initialized: doc.initialized,

      entrypoint: doc.entrypoint,
      credentials: doc.credentials,
      providerState: doc.providerState,
      entrypointOptions: doc.entrypointOptions,

      createdAt: doc.createdAt.toJSON(),
      updatedAt: doc.updatedAt.toJSON(),
    }

    const provider = await this.unbody.modules.providers.getProvider({
      provider: source.provider,
      source,
    })

    return { source: doc, provider }
  }

  async connect({
    sourceId,
    body,
  }: {
    sourceId: string
    body: ConnectSourceDto
  }) {
    const { source, provider } = await this._getSource(sourceId)

    const res = await provider.connect({
      state: body.state || {},
      redirectUrl: body.redirectUrl,
    })

    return res
  }

  async delete({ sourceId }: { sourceId: string }) {
    const { source, provider } = await this._getSource(sourceId)

    this.indexingService.scheduleDeleteSourceJob({
      sourceId,
    })

    await source.deleteOne()

    return {}
  }

  async verifyConnection({
    sourceId,
    body,
  }: {
    sourceId: string
    body: VerifySourceConnectionDto
  }) {
    const { source, provider } = await this._getSource(sourceId)

    try {
      const res = await provider.verifyConnection({
        reconnect: body.reconnect,
        payload: body.payload,
      })

      if (!res.isValid) throw new BadRequestException('Invalid connection')

      await source.updateOne({
        connected: true,
        ...(res.credentials && { credentials: res.credentials }),
      })

      return {
        isValid: true,
      }
    } catch (error) {
      throw new BadRequestException(error.message)
    }
  }

  async listEntrypoints({
    sourceId,
    body,
  }: {
    sourceId: string
    body: ListEntrypointOptionsDto
  }) {
    const { source, provider } = await this._getSource(sourceId)

    if (!source.connected) throw new BadRequestException('Source not connected')

    try {
      const res = provider.listEntrypointOptions({
        parent: body.parent as any,
      })

      return res
    } catch (error) {
      throw new BadRequestException(error.message)
    }
  }

  async setEntrypoint({
    sourceId,
    body,
  }: {
    sourceId: string
    body: SetEntrypointDto
  }) {
    const { source, provider } = await this._getSource(sourceId)

    if (source.state !== 'idle' || source.initialized)
      throw new BadRequestException(
        'Cannot set entrypoint while source is already initialized or being indexed.',
      )

    try {
      const res = await provider.handleEntrypointUpdate({
        entrypoint: body.entrypoint as any,
      })

      await source.updateOne({
        entrypoint: res.entrypoint,
        entrypointOptions: body.entrypoint,
      })

      return res
    } catch (error) {
      throw new BadRequestException(error.message)
    }
  }

  async initSource({ sourceId }: { sourceId: string }) {
    const { source, provider } = await this._getSource(sourceId)

    return this.indexingService.scheduleIndexingJob({
      sourceId,
      type: 'init',
      jobId: uuid.v4(),
    })
  }

  async rebuildSource({ sourceId }: { sourceId: string }) {
    const { source, provider } = await this._getSource(sourceId)

    return this.indexingService.scheduleIndexingJob({
      sourceId,
      type: 'init',
      force: true,
      jobId: uuid.v4(),
    })
  }

  async updateSource({ sourceId }: { sourceId: string }) {
    const { source } = await this._getSource(sourceId)

    if (!source.initialized)
      throw new BadRequestException('Source not initialized')

    return this.indexingService.scheduleIndexingJob({
      sourceId,
      type: 'update',
      jobId: uuid.v4(),
    })
  }
}
