import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export const SkipFormatResponseInterceptor = Symbol()

@Injectable()
export class FormatResponseInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const skip =
      this.reflector.get<boolean>(
        SkipFormatResponseInterceptor,
        context.getHandler(),
      ) ||
      this.reflector.get<boolean>(
        SkipFormatResponseInterceptor,
        context.getClass(),
      )
    if (skip) {
      return next.handle()
    }

    return next.handle().pipe(
      map((res) => {
        const { _message, ...rest } = res || {}

        return {
          statusCode: 200,
          message: _message ?? 'OK',
          data: {
            ...rest,
          },
        }
      }),
    )
  }
}
