import { EnhancerPluginContext } from 'src/lib/plugins-common/enhancer'
import type { z } from 'zod'
import type { schemas } from './schemas'

export type Config = z.infer<typeof schemas.config>

export type SummarizerArgs = z.infer<typeof schemas.args>

export type SummarizerResult = {
  summary: string
  metadata: {
    finishReason: string
    usage: {
      inputTokens: number
      outputTokens: number
    }
  }
}

export type Context = EnhancerPluginContext
