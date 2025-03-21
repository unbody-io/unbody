import { PluginContext } from '.'
import { Job } from '../resources/job-scheduler'

export interface JobSchedulerConsumer<C extends PluginContext = PluginContext> {
  onExecuteJob: (ctx: C, job: Job) => Promise<void>
}
