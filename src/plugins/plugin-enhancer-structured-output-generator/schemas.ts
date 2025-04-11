import { EnhancerPlugin } from 'src/lib/plugins-common/enhancer'
import { z } from 'zod'

const config = z.object({
  clientSecret: z.object({
    openai: z
      .object({
        apiKey: z.string(),
        project: z.string().optional(),
        organization: z.string().optional(),
      })
      .optional(),
  }),
})

const args = z.object({
  schema: z.any(),
  model: z.enum(['openai-gpt-4o', 'openai-gpt-4o-mini']),
  prompt: z.string(),
  maxTokens: z.number().optional(),
  temperature: z.number().optional(),
  images: z
    .array(
      z.object({
        url: z.string().url(),
      }),
    )
    .optional()
    .default([]),
})

export const schemas = {
  config,
  args,
} satisfies EnhancerPlugin['schemas']
