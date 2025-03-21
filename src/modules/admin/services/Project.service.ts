import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Unbody } from 'src/lib/core/Unbody'
import { IndexingService } from 'src/modules/indexing/services/Indexing.service'
import { CreateProjectDto } from '../dto/CreateProject.dto'
import { SourceSchemaClass } from '../schemas/Source.schema'

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(SourceSchemaClass.name)
    private sourceModel: Model<SourceSchemaClass>,
    private indexingService: IndexingService,
    private unbody: Unbody,
  ) {}

  async createProject(params: { body: CreateProjectDto }) {
    const database = await this.unbody.modules.database.getDatabase({})
    await database.configureDatabase({})

    return {
      project: {
        id: 'default',
      },
    }
  }

  async deleteProject(params: { projectId: string }) {
    const sources = await this.sourceModel.find({})

    await Promise.all(
      sources.map((source) =>
        this.indexingService.deleteSourceResources({
          sourceId: source.id,
          source: {
            id: source.id,
            ...(source.toJSON() as any),
          },
        }),
      ),
    )

    await Promise.all(sources.map((source) => source.deleteOne()))

    const database = await this.unbody.modules.database.getDatabase({})
    await database.eraseDatabase({})

    const plugins = this.unbody.plugins.registry.plugins

    for (const key in plugins) {
      const plugin = plugins[key]
      const instance = await this.unbody.plugins.registry.getInstance(plugin)

      const webhookRegistry = instance.webhookRegistry
      if (webhookRegistry) await webhookRegistry.deleteAll('global')
      const jobScheduler = instance.jobScheduler
      if (jobScheduler) await jobScheduler.cancelAll('global')
      const database = instance.database
      if (database)
        await database
          .listCollections()
          .then(
            async (collections) =>
              await Promise.all(
                collections.map((collection) =>
                  database.dropCollection(collection),
                ),
              ),
          )
      const cache = instance.cacheStore
      await cache.clear()

      await this.unbody.plugins.registry.deletePlugin(key)
    }

    return {}
  }
}
