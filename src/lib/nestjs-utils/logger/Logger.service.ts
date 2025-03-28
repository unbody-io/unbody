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
import * as UserMessage from "./UserMessage"
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

  public error({ error, suggestion }: UserMessage.ErrorMessage) {
    Nest.Logger.error(error)
    if (suggestion) {
      this.logger.error(`Error [${error.name}]: ${error.message}`)
      this.logger.warn(suggestion)
    }
  }

  public warn(message: string) {
    Nest.Logger.warn(message)
  }
}

@Injectable()
export class LoggerService {
  private jsonLogger: Logger
  private userMessageLogger: UserMessageLogger

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

    this.userMessageLogger = new UserMessageLogger()

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

  public userMessage(userMessage: UserMessage.UserMessage) {
    switch (userMessage.type) {
      case "error":
        this.userMessageLogger.error(userMessage)
        break;
      case "warning":
        this.userMessageLogger.warn(userMessage.warning)
        break;
    }
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
