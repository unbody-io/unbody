import { Injectable, LogLevel } from '@nestjs/common'
import {
  createLogger,
  format,
  LeveledLogMethod,
  Logger,
  transports,
} from 'winston'
import { ConfigService } from '../config'
import { Log } from './Log'

@Injectable()
export class LoggerService {
  private logger: Logger

  public info!: LeveledLogMethod
  public error!: LeveledLogMethod
  public warn!: LeveledLogMethod
  public debug!: LeveledLogMethod
  public silly!: LeveledLogMethod
  public verbose!: LeveledLogMethod

  constructor(private config: ConfigService) {
    this.logger = createLogger({
      transports: [new transports.Console({ level: 'debug' })],
      format: format.combine(format.timestamp(), this.format),
    })

    Object.keys(this.logger.levels).forEach((l) => {
      const level = l as string as LogLevel
      ;(this as any)[level] = (
        (this.logger as any)[level] || this.logger.log
      ).bind(this.logger)
    })
  }

  public log = (log: Log) => {
    this[log.level](log)
  }

  public format = format.printf(({ level, message, timestamp }) => {
    let log: any
    const msg: any = message

    if (!Log.isInstance(msg))
      log = {
        level: level as any,
        event: '',
        payload: message,
        meta: {
          timestamp: +new Date(timestamp as string),
          service: this.config.get('app.name'),
        },
      }
    else {
      log = (msg as Log).toJSON()
      log.meta.service = this.config.get('app.name')
    }

    return JSON.stringify(log)
  })
}
