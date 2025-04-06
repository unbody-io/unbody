import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common'
import { Response } from 'express'
import { Stream } from 'stream'
import { GenerativeService } from '../services/Generative.service'

@Controller('')
export class GenerativeController {
  constructor(private generativeService: GenerativeService) {}

  @HttpCode(200)
  @Post('/content/generative/chat/completions')
  async _chatCompletion(@Body() body: any, @Res() res: Response) {
    return this.chatCompletion(body, res)
  }

  @HttpCode(200)
  @Post('/generative/chat/completions')
  async chatCompletion(@Body() body: any, @Res() res: Response) {
    // @TODO: handle cancellation
    const signal = new AbortController().signal

    const result = await this.generativeService.generateText({
      params: body,
      signal,
    })

    if (result instanceof Stream.Readable) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      result.pipe(res)
    } else {
      return res.send({
        data: result,
      })
    }
  }

  @HttpCode(200)
  @Post('/generative/generate/text')
  async text(@Body() body: any, @Res() res: Response) {
    // @TODO: handle cancellation
    const signal = new AbortController().signal

    const result = await this.generativeService.generateText({
      params: body,
      signal,
    })

    if (result instanceof Stream.Readable) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      result.pipe(res)
    } else {
      return res.send({
        data: result,
      })
    }
  }
}
