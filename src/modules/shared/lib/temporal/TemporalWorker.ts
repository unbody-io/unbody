import { InjectionToken, Provider } from '@nestjs/common'
import { Worker, WorkerOptions } from '@temporalio/worker'

export class TemporalWorker {
  static forFeature({
    provide,
    ActivityService,
    useFactory,
    inject,
  }: {
    provide: InjectionToken<any>
    ActivityService?: any
    inject?: InjectionToken<any>[]
    useFactory: (...args: any[]) => WorkerOptions | Promise<WorkerOptions>
  }) {
    return {
      provide,
      inject: [
        ...(ActivityService ? [ActivityService] : []),
        ...(inject || []),
      ],
      useFactory: async (...injections: any[]) => {
        let activities: any = null

        if (ActivityService) {
          const activityService = injections[0]

          const activityKeys = Object.getOwnPropertyNames(
            Object.getPrototypeOf(activityService),
          ).filter(
            (key) =>
              typeof activityService[key] === 'function' &&
              key !== 'constructor',
          )
          activities = Object.fromEntries(
            activityKeys.map((key) => [
              key,
              activityService[key].bind(activityService),
            ]),
          )
        }

        const options = await useFactory(
          ...(ActivityService ? injections.slice(1) : injections),
        )

        const worker = await Worker.create({
          ...(activities ? { activities } : {}),
          ...options,
        })

        return worker
      },
    } as Provider
  }
}
