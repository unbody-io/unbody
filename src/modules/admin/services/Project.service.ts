import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Unbody } from 'src/lib/core/Unbody'
import { IndexingService } from 'src/modules/indexing/services/Indexing.service'
import { CreateProjectDto } from '../dto/CreateProject.dto'
import { SourceSchemaClass } from '../schemas/Source.schema'
import { ProjectSchemaClass } from '../schemas/Project.schema'
import { CoreTypes } from 'src/lib/core-types'
import { Result } from 'src/lib/core-utils/result'
import * as uuid from 'uuid'

@Injectable()
export class ProjectService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(ProjectSchemaClass.name)
    private projectModel: Model<ProjectSchemaClass>,
    @InjectModel(SourceSchemaClass.name)
    private sourceModel: Model<SourceSchemaClass>,
    private indexingService: IndexingService,
    private unbody: Unbody,
  ) {}
  async onApplicationBootstrap() {
    const result = await this.createProject({
      body: { name: ProjectService.DEFAULT_PROJECT_NAME },
    })

    Result.match(result, {
      ok: async () => {
        console.log('Created default project.')
        // If we find sources, it means the project was deleted, but its sources were kept.
        // This is the case when `deleteProject` was called with `keepSources=true`.
        // If so, we re-schedule indexing jobs for all sources.
        // This is a temporary hack to allow for a clean restart of the project without having to re-initialize its sources.
        // It is meant to improve DX in the near term, and not as a permanent solution.
        const sources = await this.sourceModel.find({})
        for (const source of sources) {
          await this.indexingService.scheduleIndexingJob({
            jobId: uuid.v4(),
            sourceId: source.id,
            type: 'init',
          })
        }
      },
      err: async (error) => {
        switch (error.type) {
          case 'project-exists':
            console.warn('Project already exists. Skipping creation.')
        }
      },
    })
  }

  static readonly DEFAULT_PROJECT_NAME = 'default-project'

  async createProject(params: {
    body: CreateProjectDto
  }): Promise<Result<ProjectSchemaClass, ProjectService.Error>> {
    const existingProject = await this.projectModel.findOne({})
    if (existingProject) {
      return Result.err(ProjectService.Errors.projectExist(existingProject))
    }

    const database = await this.unbody.modules.database.getDatabase({})
    await database.configureDatabase({})

    const project = await this.projectModel.create({
      name: params.body.name,
      state: CoreTypes.Project.States.Running,
    })

    return Result.ok(project)
  }

  async deleteProject(params: {
    projectId: string
    keepSources?: boolean
    exit?: boolean
  }) {
    await this.projectModel.deleteMany({})

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

    if (!params.keepSources) {
      await Promise.all(sources.map((source) => source.deleteOne()))
    } else {
      await this.sourceModel.updateMany(
        {},
        {
          $set: {
            initialized: false,
            state: CoreTypes.Source.States.Idle,
            providerState: {},
          },
        },
      )
    }

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

    if (params.exit) {
      process.exit(0)
    }

    return {}
  }
}
export namespace ProjectService {
  export type Error = ReturnType<typeof Errors.projectExist>
  export namespace Errors {
    // We only support a single project for now
    export const projectExist = (project: ProjectSchemaClass) => ({
      type: 'project-exists' as const,
      message:
        'Project has already been created. Only one project may exist at a time.',
      project,
    })
  }
}
