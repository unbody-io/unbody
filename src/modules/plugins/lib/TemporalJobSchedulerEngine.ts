import { Client, ScheduleNotFoundError } from '@temporalio/client'
import { settle } from 'src/lib/core-utils'
import {
  JobSchedulerEngine,
  JobSchedulerJobConfig,
  JobSchedulerJobInfo,
} from 'src/lib/plugins/resources/job-scheduler/JobSchedulerEngine'

export class TemporalJobSchedulerEngine implements JobSchedulerEngine {
  constructor(private temporal: Client) {}

  scheduleJob = async (
    job: JobSchedulerJobConfig,
  ): Promise<JobSchedulerJobInfo> => {
    await this.temporal.schedule.create({
      scheduleId: job.id,
      action: {
        type: 'startWorkflow',
        taskQueue: 'unbody-plugins-task-queue',
        workflowType: 'handlePluginJobWorkflow',
        args: [
          {
            id: job.id,
          },
        ],
        retry: {
          initialInterval: job.retryDelay,
          maximumAttempts: job.maxRetries,
          backoffCoefficient: job.backoffFactor,
        },
      },
      policies: {},
      spec: {
        intervals: job.interval
          ? [
              {
                every: job.interval as any,
              },
            ]
          : [],
      },
    })

    return {
      id: job.id,
      status: 'scheduled',
      createdAt: new Date(),
    }
  }

  cancelJob = async (jobId: string) => {
    const handle = this.temporal.schedule.getHandle(jobId)

    const [info, err] = await settle(() => handle.describe())

    if (err instanceof ScheduleNotFoundError) {
      return
    }

    await handle.delete()
  }

  getInfo = async (jobId: string): Promise<JobSchedulerJobInfo> => {
    const handle = this.temporal.schedule.getHandle(jobId)
    const description = await handle.describe()
    const { info, state, action, policies } = description

    const workflow = await this.temporal.workflow
      .getHandle(action.workflowId)
      .describe()

    return {
      id: jobId,
      createdAt: info.createdAt,
      status: ['CANCELLED', 'COMPLETED', 'TERMINATED'].includes(
        workflow.status.name,
      )
        ? 'completed'
        : workflow.status.name === 'FAILED'
          ? 'failed'
          : workflow.status.name === 'RUNNING'
            ? 'running'
            : 'scheduled',
      nextRunAt: info.nextActionTimes[0],
      lastRunAt: workflow.startTime,
      lastFinishedAt: workflow.closeTime,
      retries: info.recentActions.length,
      error: undefined,
    }
  }
}
