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
import * as Nest from '@nestjs/common'

class UserMessageLogger {
  private logger: Logger

  constructor() {
    this.logger = createLogger({
      transports: [
        new transports.Console({
          level: 'verbose',
          format: format.combine(
            format.colorize({ all: true }),
            format.printf((info) => `${info.message}`),
          ),
        }),
      ],
    })
  }

  public error(e: Error, details?: { suggestion: string }) {
    Nest.Logger.error(e)
    if (details) {
      this.logger.error(`Error [${e.name}]: ${e.message}`)
      this.logger.warn(details.suggestion)
    }
  }
}

@Injectable()
export class LoggerService {
  private jsonLogger: Logger
  public userMessage: UserMessageLogger

  public info!: LeveledLogMethod
  public error!: LeveledLogMethod
  public warn!: LeveledLogMethod
  public debug!: LeveledLogMethod
  public silly!: LeveledLogMethod
  public verbose!: LeveledLogMethod

  constructor(private config: ConfigService) {
    this.jsonLogger = createLogger({
      transports: [new transports.Console({ level: 'debug' })],
      format: format.combine(format.timestamp(), this.formatJson),
    })

    this.userMessage = new UserMessageLogger()

    Object.keys(this.jsonLogger.levels).forEach((l) => {
      const level = l as string as LogLevel
      ;(this as any)[level] = (
        (this.jsonLogger as any)[level] || this.jsonLogger.log
      ).bind(this.jsonLogger)
    })
  }

  public log = (log: Log) => {
    this[log.level](log)
  }

  public formatJson = format.printf(({ level, message, timestamp }) => {
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
