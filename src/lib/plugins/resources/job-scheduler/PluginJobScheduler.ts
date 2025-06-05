import { Model } from 'mongoose'
import {
  JobConfig,
  ListJobsOptions,
} from 'src/lib/plugins-common/resources/job-scheduler'
import * as uuid from 'uuid'
import { JobSchedulerEngine } from './JobSchedulerEngine'
import { PluginJobCollectionDocument } from './schemas'

export type PluginJobSchedulerConfig = {}

export class PluginJobScheduler {
  private config: PluginJobSchedulerConfig

  constructor(
    config: PluginJobSchedulerConfig,
    private readonly engine: JobSchedulerEngine,
    private readonly models: {
      PluginJob: Model<PluginJobCollectionDocument>
    },
  ) {
    this.config = {
      ...config,
    }
  }

  public async schedule(
    {
      pluginId,
      sourceId,
    }: {
      pluginId: string
      sourceId?: string
    },
    {
      job: config,
    }: {
      job: JobConfig
    },
  ) {
    const jobId = uuid.v4()
    const session = await this.models.PluginJob.startSession({})

    await session.withTransaction(async (session) => {
      await this.models.PluginJob.insertOne(
        {
          jobId,
          pluginId,
          sourceId,
          name: config.name,
          scope: config.scope || 'global',
          schedule: config.schedule,
          every: config.every,
          payload: config.payload || {},
          retryOptions: config.retryOptions || {},
        },
        { session },
      )

      await this.engine.scheduleJob({
        id: jobId,
        schedule: config.schedule,
        interval: config.every,
        retryDelay: config.retryOptions?.retryDelay,
        maxRetries: config.retryOptions?.maxRetries,
        backoffFactor: config.retryOptions?.backoffFactor,
      })
    })

    return this.models.PluginJob.findOne({ jobId }).then((res) => res?.toJSON())
  }

  public async get(
    {
      pluginId,
    }: {
      pluginId: string
    },
    {
      jobId,
    }: {
      jobId: string
    },
  ) {
    const job = await this.models.PluginJob.findOne({ jobId, pluginId })
    if (!job) return null

    const info = await this.engine.getInfo(jobId)
    return {
      ...job.toJSON(),
      ...info,
    }
  }

  public async list(
    {
      pluginId,
      sourceId,
    }: {
      pluginId: string
      sourceId?: string
    },
    { name, cursor, limit, scope }: ListJobsOptions,
  ) {
    const jobs = await this.models.PluginJob.find({
      pluginId,
      ...(name ? { name } : {}),
      ...(cursor ? { _id: { $gt: cursor } } : {}),
      ...(scope === 'global' ? { scope } : {}),
      ...(scope === 'source' ? { scope, sourceId } : {}),
    }).limit(limit || 10)

    return {
      jobs: await Promise.all(
        jobs.map(async (job) => ({
          ...job.toJSON(),
          ...(await this.engine.getInfo(job.jobId)),
        })),
      ),
      cursor:
        jobs.length > 0 ? (jobs[jobs.length - 1]!._id as string) : undefined,
    }
  }

  public async cancel(
    {
      pluginId,
    }: {
      pluginId: string
    },
    {
      jobId,
    }: {
      jobId: string
    },
  ) {
    const session = await this.models.PluginJob.startSession({})

    await session.withTransaction(async (session) => {
      await this.models.PluginJob.deleteOne(
        {
          jobId,
          pluginId,
        },
        { session },
      )

      await this.engine.cancelJob(jobId)
    })
  }

  public async cancelAll(
    {
      pluginId,
      sourceId,
    }: {
      pluginId: string
      sourceId?: string
    },
    {
      scope,
    }: {
      scope?: 'global' | 'source'
    },
  ) {
    const session = await this.models.PluginJob.startSession({})

    await session.withTransaction(async (session) => {
      while (true) {
        const jobs = await this.models.PluginJob.find(
          {
            pluginId,
            ...(scope === 'global' ? { scope } : {}),
            ...(scope === 'source' ? { scope, sourceId } : {}),
          },
          {
            jobId: 1,
          },
          { session },
        ).limit(1000)

        if (!jobs.length) break

        await Promise.all(jobs.map((job) => this.engine.cancelJob(job.jobId)))
        await this.models.PluginJob.deleteMany({
          pluginId,
          ...(scope === 'global' ? { scope } : {}),
          ...(scope === 'source' ? { scope, sourceId } : {}),
        })
      }
    })
  }
}
