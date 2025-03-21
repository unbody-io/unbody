export interface JobSchedulerEngine {
  getInfo: (jobId: string) => Promise<JobSchedulerJobInfo>;
  scheduleJob: (job: JobSchedulerJobConfig) => Promise<JobSchedulerJobInfo>;
  cancelJob: (jobId: string) => Promise<void>;
}

export type JobSchedulerJobConfig = {
  id: string;
  interval?: string | number;
  maxRetries?: number;
  retryDelay?: number;
  backoffFactor?: number;
  schedule: string | number | Date;
};

export type JobSchedulerJobInfo = {
  id: string;
  error?: string;
  retries?: number;
  createdAt?: Date;
  lastRunAt?: Date;
  nextRunAt?: Date;
  lastFinishedAt?: Date;
  status: 'scheduled' | 'running' | 'completed' | 'failed';
};
