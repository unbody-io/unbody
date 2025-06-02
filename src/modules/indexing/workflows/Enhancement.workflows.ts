import { proxyActivities, sleep } from '@temporalio/workflow'
import * as _ from 'lodash'
import { EnhancementPipelineDefinition } from 'src/lib/core-types'
import { EnhancerPipelineState } from 'src/lib/core/modules/enhancer'
import { EnhancementActivities } from '../activities/Enhancement.activities'

export type EnhanceRecordObjectsWorkflowParams = {
  sourceId: string
  recordId: string
  record: Record<string, any>

  objectId: string
  objects: {
    path: string
    objectId: string
    collection: string
  }[]
}

export async function enhanceRecordObjectsWorkflow(
  params: EnhanceRecordObjectsWorkflowParams,
) {
  const { patchObject, runPipeline, getCollectionPipelines } =
    proxyActivities<EnhancementActivities>({
      startToCloseTimeout: '10m',
      retry: {
        nonRetryableErrorTypes: ['UNSUPPORTED_MIME_TYPE'],
      },
    })

  const objects = params.objects.map((obj) => ({
    ...obj,
    depth: obj.path.split('.').length,
  }))

  let maxDepth = 0
  const collections: Record<string, EnhancementPipelineDefinition[]> = {}

  const grouped = objects.reduce(
    (acc, obj) => {
      if (!acc[obj.depth]) acc[obj.depth] = []
      acc[obj.depth]!.push(obj)

      if (obj.depth > maxDepth) maxDepth = obj.depth
      collections[obj.collection] = []

      return acc
    },
    {} as Record<string, typeof objects>,
  )

  for (const collection in collections) {
    const pipelines = await getCollectionPipelines({ collection })
    if (pipelines.length > 0) collections[collection] = pipelines
    else delete collections[collection]
  }

  for (let depth = maxDepth; depth >= 0; depth--) {
    const objects = grouped[String(depth)] || []
    const groupedByCollection = objects.reduce(
      (acc, obj) => {
        if (!collections[obj.collection]) return acc
        if (!acc[obj.collection]) acc[obj.collection] = []
        acc[obj.collection]!.push(obj)
        return acc
      },
      {} as Record<string, typeof objects>,
    )

    for (const collection in groupedByCollection) {
      const pipelines = collections[collection] || []
      const objects = groupedByCollection[collection] || []
      await Promise.all(
        objects.map(async (obj) => {
          for (const pipeline of pipelines) {
            let state: EnhancerPipelineState | null = null

            while (true) {
              const objectValue =
                obj.path.length === 0
                  ? params.record
                  : _.get(params.record, obj.path)

              let updates: Record<string, any> = {}

              state = await runPipeline({
                jobId: '',
                collection,
                object: objectValue,
                objectId: obj.objectId,
                pipelineName: pipeline.name,
                recordId: params.recordId,
                sourceId: params.sourceId,
                state: state!,
              })

              if (state.pendingStepTask) await sleep('10 seconds')

              if (state.currentStep && state.steps[state.currentStep]) {
                const step = state.steps[state.currentStep]!
                if (step.finishedAt && step.output) {
                  updates = {
                    ...updates,
                    ...step.output,
                  }

                  state.record = {
                    ...state.record,
                    ...updates,
                  }
                }
              }

              if (state.skippedAt) {
                break
              }

              if (state.finishedAt || state.failedAt) {
                await patchObject({
                  sourceId: params.sourceId,
                  collection: collection,
                  objectId: obj.objectId,
                  payload: updates,
                })

                break
              }
            }
          }
        }),
      )
    }
  }
}
