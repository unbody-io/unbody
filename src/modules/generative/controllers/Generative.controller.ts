import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { GenerativeService } from '../services/Generative.service'

@Controller('')
export class GenerativeController {
  constructor(private generativeService: GenerativeService) {}

  @HttpCode(200)
  @Post('/content/generative/chat/completions')
  async _chatCompletion(@Body() body: any) {
    return this.chatCompletion(body)
  }

  @HttpCode(200)
  @Post('/generative/chat/completions')
  async chatCompletion(@Body() body: any) {
    // @TODO: handle cancellation
    const signal = new AbortController().signal

    const result = await this.generativeService.generateText({
      params: body,
      signal,
    })

    return result
  }

  @HttpCode(200)
  @Post('/generative/generate/text')
  async text(@Body() body: any) {
    // @TODO: handle cancellation
    const signal = new AbortController().signal

    const result = await this.generativeService.generateText({
      params: body,
      signal,
    })

    return result
  }
}
