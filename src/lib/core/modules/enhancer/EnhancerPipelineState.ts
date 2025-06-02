import * as acorn from 'acorn'
import * as _ from 'lodash'
import * as vm from 'node:vm'
import { UnbodyProjectSettings } from 'src/lib/core-types'

export const evaluate = async <T = any>(
  expression: string,
  context: Record<string, any>,
): Promise<T> => {
  let type: 'expression' | 'function' = 'expression'

  try {
    const parsed = acorn.parse(expression, { ecmaVersion: 'latest' })

    if (parsed.body.length === 0) throw new Error()

    const firstNode = parsed.body[0]
    if (!firstNode) throw new Error('No expression found')

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

export class EnhancerStepState {
  name: string = ''
  run: boolean = false
  failed: boolean = false
  taskId?: string
  pending?: boolean = false
  args: Record<string, any> = {}
  output: Record<string, any> = {}
  preparedAt?: Date
  startedAt?: Date
  finishedAt?: Date
  failedAt?: Date
  skipped: boolean = false
  errorCode?: string
  errorMessage?: string
  logs: {
    level: string
    message: string
    timestamp: Date
  }[] = []

  constructor() {}

  prepare() {
    const output = { ...this.output }
    this.reset()
    this.preparedAt = new Date()
    this.output = output
  }

  onStarted() {
    this.startedAt = new Date()
    this.run = true
  }

  onArgsEvaluated(args: Record<string, any>) {
    this.args = { ...args }
  }

  onSkipped() {
    this.skipped = true
    this.finishedAt = new Date()
  }

  onPendingTask(taskId: string) {
    this.pending = true
    this.taskId = taskId
  }

  onTaskFinished() {
    this.pending = false
    this.taskId = undefined
  }

  onFinished(output: Record<string, any>) {
    this.finishedAt = new Date()
    this.output = output
  }

  onError(error: Error) {
    this.pending = false
    this.taskId = undefined
    this.failed = true
    this.failedAt = new Date()
    this.errorMessage = error.message
    this.errorCode = error.name
  }

  log(level: string, message: string) {
    this.logs.push({
      level,
      message,
      timestamp: new Date(),
    })
  }

  reset() {
    this.preparedAt = undefined
    this.run = false
    this.failed = false
    this.args = {}
    this.output = {}
    this.pending = false
    this.taskId = undefined
    this.startedAt = undefined
    this.preparedAt = undefined
    this.finishedAt = undefined
    this.failedAt = undefined
    this.skipped = false
    this.errorCode = undefined
    this.errorMessage = undefined
    this.logs = []
  }

  toJSON = () => {
    return {
      name: this.name,
      run: this.run,
      failed: this.failed,
      pending: this.pending,
      taskId: this.taskId,
      args: this.args,
      output: this.output,
      preparedAt: this.preparedAt,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      failedAt: this.failedAt,
      skipped: this.skipped,
      errorCode: this.errorCode,
      errorMessage: this.errorMessage,
      logs: this.logs,
    }
  }

  static fromJSON = (data: Record<string, any>) => {
    const state = new EnhancerStepState()
    state.name = data['name']
    state.run = data['run']
    state.pending = data['pending']
    state.taskId = data['taskId']
    state.failed = data['failed']
    state.args = data['args']
    state.output = data['output']
    state.preparedAt = data['preparedAt']
    state.startedAt = data['startedAt']
    state.finishedAt = data['finishedAt']
    state.failedAt = data['failedAt']
    state.skipped = data['skipped']
    state.errorCode = data['errorCode']
    state.errorMessage = data['errorMessage']
    state.logs = data['logs']

    return state
  }
}

export class EnhancerPipelineState {
  job: {
    id: string
  }
  source: {
    id: string
    name: string
    provider: string
  }
  record: Record<string, any>
  pipeline: UnbodyProjectSettings.Enhancement.Pipeline

  steps: Record<string, EnhancerStepState> = {}
  vars: Record<string, any> = {}
  result: Record<string, any> = {}

  skippedAt?: Date
  finishedAt?: Date
  failedAt?: Date
  errorCode?: string
  errorMessage?: string
  pendingStepTask?: boolean = false

  currentStep: string | undefined = undefined

  constructor(
    job: EnhancerPipelineState['job'],
    source: EnhancerPipelineState['source'],
    record: EnhancerPipelineState['record'],
    pipeline: EnhancerPipelineState['pipeline'],
    steps: EnhancerPipelineState['steps'],
    vars: EnhancerPipelineState['vars'],
  ) {
    this.job = job
    this.source = source
    this.record = record
    this.pipeline = pipeline

    this.pipeline.steps.forEach((step) => {
      if (steps[step.name]) {
        this.steps[step.name] = EnhancerStepState.fromJSON(steps[step.name]!)
      } else this.steps[step.name] = new EnhancerStepState()
    })

    this.vars = { ...vars }
  }

  prepare() {
    for (const step of this.pipeline.steps) {
      const stepState = this.steps[step.name]
      if (stepState) stepState.reset()
      else this.steps[step.name] = new EnhancerStepState()
    }

    this.result = {}
    this.vars = {}
    this.skippedAt = undefined
    this.finishedAt = undefined
    this.failedAt = undefined
    this.errorCode = undefined
    this.errorMessage = undefined
  }

  onVarsEvaluated(vars: Record<string, any>) {
    this.vars = { ...this.vars, ...vars }
  }

  onStepPrepared(stepName: string) {
    const stepState = this._getStepState(stepName)
    stepState.prepare()
    this.currentStep = stepName
  }

  onStepStarted(stepName: string) {
    const stepState = this._getStepState(stepName)
    stepState.onStarted()
    this.result = {}
  }

  onStepArgsEvaluated(stepName: string, args: Record<string, any>) {
    const stepState = this._getStepState(stepName)
    stepState.onArgsEvaluated(args)
  }

  onStepSkipped(stepName: string) {
    const stepState = this._getStepState(stepName)
    stepState.onSkipped()

    this.pendingStepTask = false
  }

  onStepResult(stepName: string, result: Record<string, any>) {
    this.result = { ...result }

    this.pendingStepTask = false
  }

  onStepPendingTask(stepName: string, taskId: string) {
    const stepState = this._getStepState(stepName)
    this.pendingStepTask = true
    stepState.onPendingTask(taskId)
  }

  onStepTaskFinished(stepName: string) {
    const stepState = this._getStepState(stepName)
    this.pendingStepTask = false
    stepState.onTaskFinished()
  }

  onStepFinished(stepName: string, output: Record<string, any>) {
    const stepState = this._getStepState(stepName)
    stepState.onFinished(output)

    this.pendingStepTask = false
  }

  onStepError(stepName: string, error: Error) {
    const stepState = this._getStepState(stepName)
    stepState.onError(error)

    this.pendingStepTask = false
  }

  logStep(stepName: string, level: string, message: string) {
    const stepState = this._getStepState(stepName)
    stepState.log(level, message)
  }

  onFinished() {
    this.finishedAt = new Date()
  }

  onSkipped() {
    this.skippedAt = new Date()
  }

  onFailed(error: Error) {
    this.failedAt = new Date()

    this.errorCode = error.name
    this.errorMessage = error.message
  }

  private _getStepState(stepName: string) {
    const stepState = this.steps[stepName]
    if (!stepState) {
      throw new Error(`Step ${stepName} not found in pipeline state`)
    }
    return stepState
  }

  get nextStep() {
    for (const step of this.pipeline.steps) {
      const stepState = this.steps[step.name]
      if (!stepState) continue

      if (stepState.preparedAt && !stepState.pending) continue

      if (step) return step
    }

    return undefined
  }

  get baseContext() {
    return {
      job: this.job,
      source: this.source,
      record: this.record,
      pipeline: this.pipeline,
      vars: this.vars,
      steps: {},
      result: {},
    }
  }

  get context() {
    return {
      job: this.job,
      source: this.source,
      record: this.record,
      steps: Object.fromEntries(
        Object.entries(this.steps).map(([name, state]) => [
          name,
          state.toJSON(),
        ]),
      ),
      vars: this.vars,
      result: this.result,
    }
  }

  toJSON = () => {
    return {
      job: this.job,
      source: this.source,
      record: this.record,
      pipeline: this.pipeline,
      pendingStepTask: this.pendingStepTask,
      currentStep: this.currentStep,
      steps: Object.fromEntries(
        Object.entries(this.steps).map(([name, state]) => [
          name,
          state.toJSON(),
        ]),
      ),
      vars: this.vars,
      result: this.result,
      skippedAt: this.skippedAt,
      finishedAt: this.finishedAt,
      failedAt: this.failedAt,
      errorCode: this.errorCode,
      errorMessage: this.errorMessage,
    }
  }

  static fromJSON = (state: Record<string, any>) => {
    const instance = new EnhancerPipelineState(
      state['job'],
      state['source'],
      state['record'],
      state['pipeline'],
      Object.fromEntries(
        Object.entries(state['steps'] || {}).map(([name, step]) => [
          name,
          EnhancerStepState.fromJSON(step as Record<string, any>),
        ]),
      ),
      state['vars'] || {},
    )

    if (state['currentStep']) instance.currentStep = state['currentStep']
    if (state['pendingStepTask']) instance.pendingStepTask = true
    if (state['failedAt']) instance.failedAt = new Date(state['failedAt'])
    if (state['skippedAt']) instance.skippedAt = new Date(state['skippedAt'])
    if (state['finishedAt']) instance.finishedAt = new Date(state['finishedAt'])

    if (state['errorCode']) instance.errorCode = state['errorCode']
    if (state['errorMessage']) instance.errorMessage = state['errorMessage']

    return instance
  }
}
