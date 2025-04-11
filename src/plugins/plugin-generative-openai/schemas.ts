import { GenerativePlugin } from 'src/lib/plugins-common/generative'
import { z } from 'zod'

export const model = z.enum([
  'gpt-4o-mini',
  'gpt-4o',
  'o1-mini',
  'o1',
  'o3-mini',
  'gpt-3.5-turbo',
  'gpt-4',
  'gpt-4-turbo',
])

const config = z.object({
  baseURL: z.string().optional(),

  clientSecret: z.object({
    apiKey: z.string(),
    project: z.string().optional(),
    organization: z.string().optional(),
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
  presencePenalty: z.number().optional(),
  frequencyPenalty: z.number().optional(),
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
