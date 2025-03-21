import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { HttpAdapterHost } from '@nestjs/core'
import { ConfigService } from '../../config'
import { Log, LogLevel, LoggerService } from '../../logger'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
    private getErrorMessage: (errorCode: string) => string,
  ) {}

  private isHttpException = (exception: any) =>
    typeof exception.getStatus === 'function' &&
    typeof exception.getResponse === 'function'

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost

    const ctx = host.switchToHttp()

    const isHttpException = this.isHttpException(exception)

    const httpStatus = isHttpException
      ? (exception as HttpException).getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR

    if (!isHttpException) {
      if (this.configService.isDev) {
        console.error(exception)
      } else {
        const err = exception as Error
        const log = new Log({
          name: err.name,
          message: err.message,
          stack: err.stack?.toString(),
        })
        log.level = LogLevel.Error
        log.event = 'uncaught_server_error'
        this.loggerService.log(log)
      }
    }

    const response = isHttpException
      ? (exception as any).getResponse()
      : {
          statusCode: 500,
          message: 'Oops, Something went wrong!',
          error: 'Internal Server Error',
        }

    const errorCode: string = isHttpException ? response.message : null

    const responseBody = errorCode
      ? {
          statusCode: response.statusCode,
          message: this.getErrorMessage(errorCode),
          error: response.error,
          errorCode,
        }
      : response

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus)
  }
}
