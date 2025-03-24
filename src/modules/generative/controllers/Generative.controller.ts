import { Body, Controller, Post } from '@nestjs/common'
import { GenerativeService } from '../services/Generative.service'

@Controller('/generative')
export class GenerativeController {
  constructor(private generativeService: GenerativeService) {}

  @Post('/chat/completions')
  async chatCompletion(@Body() body: any) {
    // @TODO: handle cancellation
    const signal = new AbortController().signal

    return this.generativeService.generateText({
      params: body,
      signal,
    })
  }

  @Post('/generate/text')
  async text(@Body() body: any) {
    // @TODO: handle cancellation
    const signal = new AbortController().signal

    return this.generativeService.generateText({
      params: body,
      signal,
    })
  }
}
