import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { GenerativeService } from '../services/Generative.service'

@Controller('/generative')
export class GenerativeController {
  constructor(private generativeService: GenerativeService) {}

  @HttpCode(200)
  @Post('/chat/completions')
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
  @Post('/generate/text')
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
