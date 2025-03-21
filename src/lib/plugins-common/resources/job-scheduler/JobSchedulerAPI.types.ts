export interface JobSchedulerAPI {
  get(jobId: string): Promise<Job>

  schedule(job: JobConfig): Promise<Job>

  list(options?: ListJobsOptions): Promise<{
    jobs: Job[]
    cursor?: string | undefined
  }>

  cancel(jobId: string): Promise<void>

  cancelAll(scope?: 'global' | 'source'): Promise<void>
}

export type JobConfig = {
  name: string

  scope?: 'global' | 'source'

  // When to run the job
  schedule: string | number | Date

  // How often to run the job in ms or string like '1d', '1h', '1m', '20s'
  every?: string | number

  // The payload to pass to the job handler
  payload?: Record<string, any>

  retryOptions?: {
    /**
     * The maximum number of retries before the job is marked as failed
     */
    maxRetries?: number

    /**
     * The delay between retries (in ms)
     */
    retryDelay?: number

    /**
     * The backoff factor to apply between retries
     */
    backoffFactor?: number
  }
}

export type Job = JobConfig & {
  id: string

  retries: number
  error?: string

  createdAt?: Date
  lastRunAt?: Date
  nextRunAt?: Date
  lastFinishedAt?: Date

  status: 'scheduled' | 'running' | 'completed' | 'failed'
}

export type ListJobsOptions = {
  name?: string
  limit?: number
  cursor?: string
  scope?: 'global' | 'source'
}
