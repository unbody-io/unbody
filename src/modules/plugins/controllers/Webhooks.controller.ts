import {
  Controller,
  NotImplementedException,
  Param,
  Post,
  Req,
} from '@nestjs/common'
import { Request } from 'express'

@Controller('/plugins/webhooks')
export class WebhooksController {
  constructor() {}

  @Post('/callback/:pluginId/:uid')
  async callback(
    @Param('pluginId') pluginId: string,
    @Param('uid') uid: string,
    @Req() request: Request & { rawBody: string },
  ) {
    const rawBody = request['rawBody']
    const headers = request.rawHeaders.reduce(
      (acc, val, index) => {
        if (index % 2 === 0) {
          acc[val] = request.rawHeaders[index + 1] || ''
        }
        return acc
      },
      {} as Record<string, string>,
    )

    throw new NotImplementedException()
  }
}
