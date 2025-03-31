import {
  UnbodyProjectSettings,
  UnbodyProjectSettingsDoc,
} from 'src/lib/core-types'
import { AutoEnhancer } from './AutoEnhancer'
import { AutoSummary } from './AutoSummary'
import { AutoVision } from './AutoVision'

export class AutoEnhancement extends AutoEnhancer {
  get name() {
    return 'AutoEnhancement'
  }

  private enhancers: AutoEnhancer[] = []

  constructor(
    protected readonly collection: string,
    protected settings: UnbodyProjectSettingsDoc,
  ) {
    super(collection, settings)

    this.enhancers = [
      new AutoVision(collection, settings),
      new AutoSummary(collection, settings),
    ].filter((enhancer) => enhancer.enabled)
  }

  get enabled() {
    return false
  }

  get pipelines(): UnbodyProjectSettings.Enhancement.Pipeline[] {
    const pipelines: UnbodyProjectSettings.Enhancement.Pipeline[] = []

    const used = new Set<string>()

    this.enhancers.forEach((enhancer) => {
      const enhancerPipelines = enhancer.pipelines
      if (enhancerPipelines.length > 0) {
        pipelines.push(...enhancerPipelines)
        used.add(enhancer.name)
      }
    })

    const pipeline: UnbodyProjectSettings.Enhancement.Pipeline = {
      name: 'auto_enhancement',
      collection: this.collection,
      vars: {
        collection: this.arg(this.collection),
      },
      steps: [],
    }

    this.enhancers.forEach((enhancer) => {
      if (used.has(enhancer.name)) return
      const steps = enhancer.steps
      if (steps.length > 0) {
        pipeline.steps.push(...steps)
      }
    })

    if (pipeline.steps.length > 0) {
      pipelines.push(pipeline)
    }

    return pipelines
  }
}
