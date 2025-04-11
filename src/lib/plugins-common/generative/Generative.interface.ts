import type * as stream from 'stream'
import type { z } from 'zod'
import { PluginContext } from '..'

export type GenerativePluginContext = PluginContext & {}

export interface GenerativePlugin<
  C extends PluginContext = GenerativePluginContext,
> {
  schemas: {
    config: z.ZodObject<any, any, any>
    generateTextOptions: z.ZodObject<any, any, any>
  }

  getSupportedModels: (
    ctx: C,
    params: GetSupportedModelsParams,
  ) => Promise<GetSupportedModelsResult>

  generateText: (
    ctx: C,
    params: GenerateTextParams,
  ) => Promise<GenerateTextResult | GenerateTextResultStream>
}

export type GetSupportedModelsParams = {}
export type GetSupportedModelsResult = {
  models: ModelSpec[]
}

export type GenerateTextParams<
  T extends GenerateTextOptionsBase = GenerateTextOptionsBase,
> = {
  messages: GenerativeMessage[]

  options?: T
  stream?: boolean
  signal: AbortSignal
}

export type GenerateTextResult = {
  content: string | Record<string, any>

  metadata: {
    usage: {
      inputTokens: number
      outputTokens: number
      totalTokens: number
    }

    finishReason: string
  }
}

export type GenerateTextResultStreamChunk = {
  content: string | Record<string, any>
}

export type GenerateTextResultStreamPayload = GenerateTextResult & {
  finished: true
}

export type GenerateTextResultStream = stream.Readable

export type ModelSpec = {
  name: string
}

export type GenerativeMessageBase = {
  name?: string
  role: 'system' | 'user' | 'assistant'
}

export type GenerativeTextMessage = GenerativeMessageBase & {
  type: 'text'
  content: string
}

export type GenerativeImageMessage = GenerativeMessageBase & {
  type: 'image'
  content: {
    url: string
  }
}

export type GenerativeMessage = GenerativeTextMessage | GenerativeImageMessage

export type GenerateTextOptionsBase = {
  model?: string
  topP?: number
  maxTokens?: number
  temperature?: number
  presencePenalty?: number
  frequencyPenalty?: number

  schema?: z.ZodObject<any, any, any> | Record<string, any>
  responseFormat?: 'text' | 'json_object' | 'json_schema'
}
