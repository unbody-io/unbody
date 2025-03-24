import { Injectable, UnprocessableEntityException } from '@nestjs/common'
import { settle } from 'src/lib/core-utils'
import { Unbody } from 'src/lib/core/Unbody'

@Injectable()
export class GenerativeService {
  constructor(private unbody: Unbody) {}

  async generateText(params: { signal: AbortSignal; params: any }) {
    const [res, err] = await settle(() =>
      this.unbody.services.generative.generateText(params),
    )

    if (err) throw new UnprocessableEntityException(err.message)

    return res
  }
}
