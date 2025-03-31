import {
  UnbodyProjectSettings,
  UnbodyProjectSettingsDoc,
} from 'src/lib/core-types'
import { EnhancerPipelineState } from '../EnhancerPipelineState'

type PipelineContext = EnhancerPipelineState['context']

export class AutoEnhancer {
  get name() {
    return 'AutoEnhancer'
  }

  constructor(
    protected readonly collection: string,
    protected settings: UnbodyProjectSettingsDoc,
  ) {}

  get enabled() {
    return false
  }

  get pipelines(): UnbodyProjectSettings.Enhancement.Pipeline[] {
    return []
  }

  get steps(): UnbodyProjectSettings.Enhancement.Step[] {
    return []
  }

  protected arg(value: ((ctx: PipelineContext) => any) | any) {
    if (typeof value === 'function') {
      return {
        type: 'computed',
        value: value.toString(),
      } satisfies UnbodyProjectSettings.Enhancement.ActionArg
    }

    return {
      type: 'literal',
      value,
    } satisfies UnbodyProjectSettings.Enhancement.ActionArg
  }

  protected cond(fn: (ctx: PipelineContext) => boolean) {
    return fn.toString()
  }
}
