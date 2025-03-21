import { Injectable } from '@nestjs/common'
import { EnhancerPipelineState } from 'src/lib/core/modules/enhancer'
import { Unbody } from 'src/lib/core/Unbody'

@Injectable()
export class EnhancementActivities {
  constructor(private unbody: Unbody) {}

  async runPipeline({
    jobId,
    sourceId,
    object,
    recordId,
    pipelineName,
    objectId,
    collection,
    state,
  }: {
    jobId: string
    sourceId: string
    objectId: string
    recordId: string
    collection: string
    pipelineName: string
    object: Record<string, any>
    state?: Record<string, any>
  }) {
    const pipeline = await this.unbody.modules.enhancer
      .getCollectionEnhancers({
        collection,
      })
      .then((res) => res.find((p) => p.name === pipelineName))

    return this.unbody.modules.enhancer.runPipeline({
      jobId,
      collection,
      object,
      objectId,
      pipeline: pipeline!,
      recordId,
      source: {
        id: sourceId,
      } as any,
      state: state ? EnhancerPipelineState.fromJSON(state) : undefined,
    })
  }

  async patchObject(params: {
    sourceId: string
    objectId: string
    collection: string
    payload: Record<string, any>
  }) {
    return this.unbody.services.indexing.patchObject(params)
  }

  async getCollectionPipelines({ collection }: { collection: string }) {
    return this.unbody.modules.enhancer.getCollectionEnhancers({ collection })
  }
}
