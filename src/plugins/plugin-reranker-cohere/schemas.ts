import { RerankerPlugin } from 'src/lib/plugins-common/reranker'
import { z } from 'zod'

export const model = z.enum([
  'rerank-v3.5',
  'rerank-english-v3.0',
  'rerank-multilingual-v3.0',
])

const options = z.object({
  model: model.optional().default('rerank-v3.5'),
})

const config = z.object({
  baseURL: z.string().optional().default('https://api.cohere.com/'),
  clientSecret: z.object({
    apiKey: z.string(),
  }),
  options: options.optional(),
})

const rerankOptions = z.object({
  model: model.optional(),
})

export const schemas = {
  config,
  rerankOptions,
} satisfies RerankerPlugin['schemas']
