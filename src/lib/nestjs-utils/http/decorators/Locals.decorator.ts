import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { Response } from 'express'

export const Locals = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const { locals } = ctx.switchToHttp().getResponse<Response>()

    return data ? locals[data] : locals
  },
)
