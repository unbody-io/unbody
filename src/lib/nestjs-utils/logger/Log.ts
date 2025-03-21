const CLASS_NAME = 'Unbody.Logger.Log'

export enum LogLevel {
  Info = 'info',
  Error = 'error',
  Warn = 'warn',
  Debug = 'debug',
  Silly = 'silly',
  Verbose = 'verbose',
}

export type LogJSON<T extends object = {}> = {
  level: LogLevel
  event: string
  payload: T
  meta: {
    timestamp: number
  }
}

export class Log<T extends object = {}> {
  public level: LogLevel = LogLevel.Debug
  public event: string = 'event'
  public payload: T
  public timestamp: number

  constructor(payload: T) {
    this.timestamp = +new Date()
    this.payload = payload
  }

  toJSON = (): LogJSON => ({
    level: this.level,
    event: this.event,
    payload: this.payload,
    meta: {
      timestamp: this.timestamp,
    },
  })

  static isInstance = (obj: any): boolean =>
    obj instanceof Log || obj?.__proto__?.constructor?.__name__ === CLASS_NAME
}

;(Log as any).__name__ = CLASS_NAME
