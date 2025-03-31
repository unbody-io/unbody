import { Client, ScheduleNotFoundError } from '@temporalio/client'
import { settle } from 'src/lib/core-utils'
import {
  JobSchedulerEngine,
  JobSchedulerJobConfig,
  JobSchedulerJobInfo,
} from 'src/lib/plugins/resources/job-scheduler/JobSchedulerEngine'
import { PluginTaskQueues } from '../constants/PluginTaskQueues'
import { HandlePluginJobParams } from '../workflows/PluginTask.workflows'

export class TemporalJobSchedulerEngine implements JobSchedulerEngine {
  constructor(private temporal: Client) {}

  scheduleJob = async (
    job: JobSchedulerJobConfig,
  ): Promise<JobSchedulerJobInfo> => {
    await this.temporal.schedule.create({
      scheduleId: job.id,
      state: {
        triggerImmediately: true,
      },
      action: {
        type: 'startWorkflow',
        taskQueue: PluginTaskQueues.JobHandler,
        workflowType: 'handlePluginJobWorkflow',
        args: [
          {
            job,
          } satisfies HandlePluginJobParams,
        ],
        retry: {
          initialInterval: job.retryDelay,
          maximumAttempts: job.maxRetries,
          backoffCoefficient: job.backoffFactor,
        },
      },
      policies: {
        overlap: 'BUFFER_ONE',
      },
      spec: {
        startAt: new Date(job.schedule),
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
    const [description, describeErr] = await settle(() => handle.describe())

    if (describeErr) {
      if (describeErr instanceof ScheduleNotFoundError) {
        throw new Error('Schedule not found')
      }
      throw describeErr
    }

    const { info } = description

    let workflowStatus: JobSchedulerJobInfo['status'] = 'scheduled'
    let workflowStartTime: Date | undefined
    let workflowCloseTime: Date | undefined

    const recentAction = info.recentActions?.[0]
    if (recentAction) {
      const [workflow, workflowErr] = await settle(() =>
        this.temporal.workflow
          .getHandle(recentAction.action.workflow.workflowId)
          .describe(),
      )

      if (!workflowErr && workflow) {
        workflowStartTime = workflow.startTime
        workflowCloseTime = workflow.closeTime

        if (
          ['CANCELLED', 'COMPLETED', 'TERMINATED'].includes(
            workflow.status.name,
          )
        ) {
          workflowStatus = 'completed'
        } else if (workflow.status.name === 'FAILED') {
          workflowStatus = 'failed'
        } else if (workflow.status.name === 'RUNNING') {
          workflowStatus = 'running'
        }
      }
    }

    if (info.nextActionTimes.length === 0) {
      workflowStatus = workflowStatus === 'failed' ? 'failed' : 'completed'
    } else if (
      info.nextActionTimes.length > 0 &&
      workflowStatus !== 'running'
    ) {
      workflowStatus = 'scheduled'
    }

    return {
      id: jobId,
      createdAt: info.createdAt,
      status: workflowStatus,
      nextRunAt: info.nextActionTimes?.[0],
      lastRunAt: workflowStartTime,
      lastFinishedAt: workflowCloseTime,
      retries: 0,
      error: undefined,
    }
  }
}
