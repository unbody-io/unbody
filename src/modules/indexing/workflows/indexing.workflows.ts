import {
  ApplicationFailure,
  continueAsNew,
  defineQuery,
  defineSignal,
  executeChild,
  proxyActivities,
  setHandler,
  sleep,
  startChild,
  workflowInfo,
} from '@temporalio/workflow'
import { UnbodySourceDoc } from 'src/lib/core-types'
import {
  IndexingEvent,
  InitSourceResult,
} from 'src/lib/plugins-common/provider'
import { IndexingActivities } from '../activities/Indexing.activities'
import { ProcessEventWorkflowParams } from './ProcessRecord.workflows'

export type SchedulerLockWorkflowParams = {
  current?: string | null
  queue?: string[]
}

export const requestSchedulerLock = defineSignal<
  [
    {
      requestId: string
    },
  ]
>('requestSchedulerLock')

export const releaseSchedulerLock = defineSignal<
  [
    {
      requestId: string
    },
  ]
>('releaseSchedulerLock')

export const schedulerLockQuery = defineQuery('schedulerLockQuery')

export async function schedulerLockWorkflow(
  params: SchedulerLockWorkflowParams,
) {
  let queue: string[] = params?.queue || []
  let current: string | null = params?.current || null

  setHandler(requestSchedulerLock, ({ requestId }) => {
    if (!current) current = requestId
    else queue.unshift(requestId)
  })

  setHandler(releaseSchedulerLock, ({ requestId }) => {
    if (queue.includes(requestId)) {
      queue = queue.filter((id) => id !== requestId)
    }

    if (current === requestId) {
      current = queue.shift() || null
    }
  })

  setHandler(schedulerLockQuery, () => {
    return {
      current,
    }
  })

  while (true) {
    await sleep(5000)
    if (queue.length === 0 && !current) return {}
    else if (workflowInfo().historyLength > 1000)
      return continueAsNew({ current, queue })
  }
}

export type IndexSourceWorkflowParams = {
  jobId: string
  sourceId: string
  type: 'init' | 'update'

  force?: boolean
  dependsOn?: string[]
}

export async function indexSourceWorkflow(params: IndexSourceWorkflowParams) {
  const {
    cancelIndexingJob,
    getSchedulerLock,
    releaseSchedulerLock,
    getSourceOpenJobs,
  } = proxyActivities<IndexingActivities>({
    startToCloseTimeout: '10m',
    retry: {
      nonRetryableErrorTypes: ['SOURCE_BUSY'],
    },
  })

  await getSchedulerLock({ jobId: params.jobId, sourceId: params.sourceId })

  try {
    const jobs = await getSourceOpenJobs({ sourceId: params.sourceId })

    const initJobs = jobs.filter((job) => job.jobType === 'init')
    const updateJobs = jobs.filter((job) => job.jobType === 'update')

    if (params.type === 'init') {
      if (initJobs.length > 0) {
        if (params.force) {
          await Promise.all(
            initJobs.map((job) =>
              cancelIndexingJob({
                jobId: job.workflowId,
              }),
            ),
          )
        } else {
          throw new ApplicationFailure(
            'Source is busy, set "force" to true to reindex',
            'SOURCE_BUSY',
          )
        }
      }

      if (updateJobs.length > 0) {
        await Promise.all(
          updateJobs.map((job) =>
            cancelIndexingJob({
              jobId: job.workflowId,
            }),
          ),
        )
      }

      await startChild('initSourceWorkflow', {
        args: [params],
        workflowId: params.jobId,
        parentClosePolicy: 'ABANDON',
        searchAttributes: {
          sourceId: [params.sourceId],
        },
      })
    }

    if (params.type === 'update') {
      if (updateJobs.length + initJobs.length > 1) {
        return {}
      }

      await startChild('updateSourceWorkflow', {
        args: [
          {
            ...params,
            dependsOn: [...initJobs, ...updateJobs].map(
              (job) => job.workflowId,
            ),
          },
        ],
        workflowId: params.jobId,
        parentClosePolicy: 'ABANDON',
        searchAttributes: {
          sourceId: [params.sourceId],
        },
      })
    }
  } catch (error) {
    throw error
  } finally {
    await releaseSchedulerLock({
      jobId: params.jobId,
      sourceId: params.sourceId,
    })
  }

  return {}
}

const queryIndexingJobStatus = defineQuery('queryIndexingJobStatus')

export async function initSourceWorkflow(params: IndexSourceWorkflowParams) {
  const { initSource, onSourceInitFinished, deleteSourceResources } =
    proxyActivities<IndexingActivities>({
      startToCloseTimeout: '10m',
      retry: {
        nonRetryableErrorTypes: [
          'task_id_not_found',
          'source_not_found',
          'provider_not_found',
          'provider_not_connected',
          'provider_invalid_connection',
        ],
      },
    })

  await deleteSourceResources({
    sourceId: params.sourceId,
    jobId: params.jobId,
  })

  let res: InitSourceResult<any> | undefined
  let finished = false
  const results: {
    event: IndexingEvent
    recordId: string
    status: 'success' | 'error'
    error?: string
  }[] = []

  res = await initSource({ sourceId: params.sourceId })

  while (res.status === 'pending') {
    if (!res.taskId) {
      throw new ApplicationFailure('Task ID not found', 'task_id_not_found')
    }

    await sleep('10 seconds')

    res = await initSource({
      sourceId: params.sourceId,
      taskId: res.taskId,
    })
  }

  setHandler(queryIndexingJobStatus, () => {
    return {
      status: finished ? 'finished' : 'running',
      results,
    }
  })

  res.events = res.events || ([] as Required<typeof res>['events'])

  if (res.events && res.events.length > 0) {
    let batch = 0
    const batchSize = 20
    const lastBatch = Math.ceil(res.events.length / batchSize)

    while (batch < lastBatch) {
      const events = res.events.slice(
        batch * batchSize,
        (batch + 1) * batchSize,
      )

      const workflowResults = await Promise.allSettled(
        events.map(async (event) => {
          await executeChild('processEventWorkflow', {
            workflowId: `${params.jobId}:${event.eventName}:${event.recordId}`,
            taskQueue: 'record-processor-queue',
            args: [
              {
                sourceId: params.sourceId,
                jobId: params.jobId,
                event,
              } as ProcessEventWorkflowParams,
            ],
            searchAttributes: {
              sourceId: [params.sourceId],
              recordId: [event.recordId],
              eventType: [event.eventName],
            },
          })
        }),
      )

      workflowResults.map((res, index) => {
        if (res.status === 'fulfilled')
          results.push({
            event: events[index],
            recordId: events[index].recordId,
            status: 'success',
          })
        else
          results.push({
            event: events[index],
            recordId: events[index].recordId,
            status: 'error',
            error: res.reason,
          })
      })

      batch++
    }
  }

  await onSourceInitFinished({
    sourceId: params.sourceId,
    sourceState: res?.sourceState,
  })

  finished = true

  return {}
}

export async function updateSourceWorkflow(params: IndexSourceWorkflowParams) {
  const { getJobStatus, handleSourceUpdate, onSourceUpdateFinished } =
    proxyActivities<IndexingActivities>({
      startToCloseTimeout: '10m',
      retry: {
        nonRetryableErrorTypes: [
          'task_id_not_found',
          'source_not_found',
          'provider_not_found',
          'provider_not_connected',
          'provider_invalid_connection',
        ],
      },
    })

  while (true) {
    const status = await Promise.all(
      (params.dependsOn || []).map((jobId) =>
        getJobStatus({
          jobId,
          sourceId: params.sourceId,
        }),
      ),
    )

    if (status.every((s) => !s || s.status === 'completed')) break

    await sleep('30 seconds')
  }

  let res = await handleSourceUpdate({ sourceId: params.sourceId })

  while (res.status === 'pending') {
    if (!res.taskId) {
      throw new ApplicationFailure('Task ID not found', 'task_id_not_found')
    }

    await sleep('10 seconds')
    res = await handleSourceUpdate({
      sourceId: params.sourceId,
      taskId: res.taskId,
    })
  }

  res.events = res.events || ([] as Required<typeof res>['events'])

  if (res.events && res.events.length > 0) {
    let batch = 0
    const batchSize = 20
    const lastBatch = Math.ceil(res.events.length / batchSize)

    while (batch < lastBatch) {
      const events = res.events.slice(
        batch * batchSize,
        (batch + 1) * batchSize,
      )

      await Promise.allSettled(
        events.map(async (event) => {
          await executeChild('processEventWorkflow', {
            workflowId: `${params.jobId}:${event.eventName}:${event.recordId}`,
            taskQueue: 'record-processor-queue',
            args: [
              {
                sourceId: params.sourceId,
                jobId: params.jobId,
                event,
              } as ProcessEventWorkflowParams,
            ],
            searchAttributes: {
              sourceId: [params.sourceId],
              recordId: [event.recordId],
              eventType: [event.eventName],
            },
          })
        }),
      )

      batch++
    }
  }

  await onSourceUpdateFinished({
    sourceId: params.sourceId,
    sourceState: res.sourceState,
  })

  return {}
}

export type DeleteSourceResourcesWorkflowParams = {
  sourceId: string
  source: UnbodySourceDoc
}

export async function deleteSourceResourcesWorkflow(
  params: DeleteSourceResourcesWorkflowParams,
) {
  const { deleteSourceResources } = proxyActivities<IndexingActivities>({
    startToCloseTimeout: '10m',
  })

  const info = workflowInfo()

  await deleteSourceResources({
    source: params.source,
    sourceId: params.sourceId,
    jobId: info.workflowId,
  })
}
