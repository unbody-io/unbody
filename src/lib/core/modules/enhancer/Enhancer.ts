import * as acorn from 'acorn'
import * as _ from 'lodash'
import * as vm from 'node:vm'
import {
  EnhancementPipelineDefinition,
  EnhancementPipelineStepDefinition,
  UnbodyProjectSettings,
  UnbodySourceDoc,
} from 'src/lib/core-types'
import { settle } from 'src/lib/core-utils'
import { EnhancerPluginInstance } from 'src/lib/plugins/instances/EnhancerPlugin'
import { z } from 'zod'
import { Plugins } from '../../plugins/Plugins'
import { ProjectContext } from '../../project-context'
import { EnhancerPipelineState } from './EnhancerPipelineState'

export class Enhancer {
  private _collectionPipelines: Record<
    string,
    UnbodyProjectSettings.Enhancement.Pipeline[]
  > = {}

  constructor(
    private _ctx: ProjectContext,
    private plugins: Plugins,
  ) {}

  async getCollectionEnhancers({ collection }: { collection: string }) {
    if (this._collectionPipelines[collection]) {
      return this._collectionPipelines[collection]
    }

    const pipelines = this._ctx.settings.modules.enhancement?.pipelines || []

    const collectionPipelines = pipelines.filter(
      (pipeline) => pipeline.collection === collection,
    )

    this._collectionPipelines[collection] = collectionPipelines

    return collectionPipelines
  }

  runPipeline = async (params: {
    jobId: string
    source: UnbodySourceDoc
    pipeline: UnbodyProjectSettings.Enhancement.Pipeline
    state?: EnhancerPipelineState

    recordId: string
    objectId: string
    collection: string
    object: Record<string, any>
  }): Promise<EnhancerPipelineState> => {
    const { jobId, source, pipeline, state: _state } = params

    const state =
      _state ||
      new EnhancerPipelineState(
        { id: jobId },
        { id: source.id, name: source.name, provider: source.provider },
        params.object,
        pipeline,
        {},
        {},
      )

    if (!_state) {
      state.prepare()

      if (pipeline.if) {
        const shouldRun = await this._evaluate(pipeline.if, {
          ctx: state.baseContext,
          helpers: {},
        })
        if (!shouldRun) {
          state.onSkipped()
          return state
        }
      }

      const [vars, err] = await settle(() =>
        this._evaluateVars(pipeline.vars || {}, {
          ctx: state.baseContext,
          helpers: {},
        }),
      )

      if (err) {
        state.onFailed(new Error(`Failed to evaluate vars: ${err.message}`))
        return state
      }

      state.onVarsEvaluated(vars)
    }

    const step = state.nextStep

    if (!step) {
      state.onFinished()
      return state
    }

    const pendingTaskId = state.pendingStepTask && state.steps[step.name].taskId

    if (!pendingTaskId) {
      state.onStepPrepared(step.name)
      state.onStepStarted(step.name)
    }

    const plugin = await this.plugins.registry.getEnhancer(step.action.name)

    if (!plugin) {
      state.onStepError(
        step.name,
        new Error(`Enhancer not found: ${step.name}`),
      )

      if (step.onFailure !== 'continue') {
        state.onFinished()
        return state
      } else {
        return this.runPipeline({
          ...params,
          state,
        })
      }
    }

    const [args, argsError] = await settle(async () =>
      this._evaluateArgs(step.action.args, {
        ctx: state.context,
        helpers: await this.getHelpers(),
      }),
    )

    if (argsError) {
      state.onStepError(step.name, argsError)

      if (step.onFailure !== 'continue') {
        state.onFinished()
        return state
      } else {
        return this.runPipeline({
          ...params,
          state,
        })
      }
    }

    state.onStepArgsEvaluated(step.name, args)

    const enhancer = new EnhancerPluginInstance(
      plugin,
      {},
      this.plugins.resources,
    )

    const [res, err] = await settle(() =>
      enhancer.enhance({
        args: args,
        ...(pendingTaskId ? { taskId: pendingTaskId } : {}),
      }),
    )

    if (err) {
      state.onStepError(step.name, err)

      if (step.onFailure !== 'continue') {
        state.onFinished()
        return state
      } else {
        return this.runPipeline({
          ...params,
          state,
        })
      }
    } else if (res.status === 'pending') {
      state.onStepPendingTask(step.name, res.taskId)
      return state
    }

    state.onStepResult(step.name, res.result)

    const [output, outputError] = await settle(() =>
      this._evaluateOutput(step.output, {
        ctx: state.context,
        helpers: {},
      }),
    )

    if (outputError) {
      state.onStepError(step.name, outputError)

      if (step.onFailure !== 'continue') {
        state.onFinished()
        return state
      } else {
        return this.runPipeline({
          ...params,
          state,
        })
      }
    }

    state.onStepFinished(step.name, output)

    if (!state.nextStep) {
      state.onFinished()
    }

    return state
  }

  private _evaluate = async <T = any>(
    expression: string,
    context: Record<string, any>,
  ): Promise<T> => {
    let type: 'expression' | 'function' = 'expression'

    try {
      const parsed = acorn.parse(expression, { ecmaVersion: 'latest' })

      if (parsed.body.length === 0) throw new Error()

      const firstNode = parsed.body[0]
      if (firstNode.type === 'ExpressionStatement') {
        const expressionNode = firstNode.expression
        if (
          [
            'ArrowFunctionExpression',
            'FunctionExpression',
            'FunctionDeclaration',
          ].includes(expressionNode.type)
        )
          type = 'function'
      } else if (firstNode.type === 'FunctionDeclaration') type = 'function'
    } catch (error) {
      console.error(error)
      throw new Error('Invalid expression syntax')
    }

    const func =
      type === 'expression'
        ? `((ctx)=>{return ${expression}})(ctx, helpers)`
        : `(${expression})(ctx, helpers)`

    const res = vm.runInNewContext(
      func,
      vm.createContext({
        ..._.cloneDeep({
          ...context,
        }),
      }),
      {},
    ) as T

    return res
  }

  private async _evaluateArgs(
    input: EnhancementPipelineStepDefinition['action']['args'],
    context: any,
  ) {
    const evaluated = await Promise.all(
      Object.keys(input).map(async (key) => {
        const raw = input[key]
        const value =
          raw.type === 'literal'
            ? raw.value
            : await this._evaluate(raw.value, context)
        return [key, value]
      }),
    ).then((values) => Object.fromEntries(values))

    return {
      ...evaluated,
    }
  }

  private async _evaluateOutput(
    output: EnhancementPipelineStepDefinition['output'],
    context: any,
  ) {
    return await Promise.all(
      Object.keys(output).map(async (key) => {
        const raw = output[key]
        const value =
          raw.type === 'literal'
            ? raw.value
            : await this._evaluate(raw.value, context)
        return [key, value]
      }),
    ).then((values) => Object.fromEntries(values))
  }

  private async _evaluateVars(
    vars: EnhancementPipelineDefinition['vars'] = {},
    context: any,
  ) {
    return await Promise.all(
      Object.keys(vars).map(async (key) => {
        const raw = vars[key]
        const value =
          raw.type === 'literal'
            ? raw.value
            : await this._evaluate(raw.value, context)
        return [key, value]
      }),
    ).then((values) => Object.fromEntries(values))
  }

  async getHelpers() {
    return {
      z,
    }
  }
}
