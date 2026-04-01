import { GenerativePlugin } from 'src/lib/plugins-common/generative'
import { z } from 'zod'

export const model = z.enum([
  'MiniMax-M2.7',
  'MiniMax-M2.7-highspeed',
  'MiniMax-M2.5',
  'MiniMax-M2.5-highspeed',
])

const config = z.object({
  baseURL: z.string().optional().default('https://api.minimax.io/v1'),

  clientSecret: z.object({
    apiKey: z.string(),
  }),

  options: z
    .object({
      model: model.optional(),
    })
    .optional(),
})

const generateTextOptions = z.object({
  model: model.optional(),
  topP: z.number().optional(),
  maxTokens: z.number().optional(),
  temperature: z.number().optional(),
  schema: z.record(z.any()).optional(),
  responseFormat: z
    .enum(['text', 'json_object', 'json_schema'])
    .optional()
    .default('text'),
})

export const schemas = {
  config,
  generateTextOptions,
} satisfies GenerativePlugin['schemas']
