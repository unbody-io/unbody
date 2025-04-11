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
  text: z.string(),
  prompt: z.string().optional(),
  metadata: z.string().optional(),
  maxWords: z.number().optional(),
  chunkSize: z.number().optional(),
  chunkOverlap: z.number().optional(),
  model: z.enum([
    'openai-gpt-4o',
    'openai-gpt-4o-mini',
    'openai-gpt-3.5-turbo',
  ]),
})

export const schemas = {
  config,
  args,
} satisfies EnhancerPlugin['schemas']
