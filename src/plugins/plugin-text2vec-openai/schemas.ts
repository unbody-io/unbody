import { TextVectorizerPlugin } from 'src/lib/plugins-common/text-vectorizer'
import { z } from 'zod'

export const model = z.enum([
  'text-embedding-ada-002',
  'text-embedding-3-large',
  'text-embedding-3-small',
])

const vectorizeOptions = z.object({
  model: model.optional().default('text-embedding-ada-002'),
  autoTrim: z.boolean().optional().default(true),
})

const config = z.object({
  baseURL: z.string().optional(),
  clientSecret: z.object({
    apiKey: z.string(),
    project: z.string().optional(),
    organization: z.string().optional(),
  }),
  options: vectorizeOptions.optional(),
})

export const schemas = {
  config,
  vectorizeOptions,
} satisfies TextVectorizerPlugin['schemas']
