export interface LoggerAPI {
  info: (message: string, meta?: Record<string, any>) => void

  warn: (message: string, meta?: Record<string, any>) => void

  error(message: Error, meta?: Record<string, any>): void
  error(
    message: string,
    trace: string | Error,
    meta?: Record<string, any>,
  ): void

  debug: (message: string, meta?: Record<string, any>) => void
}
