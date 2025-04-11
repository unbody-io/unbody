import { MultimodalVectorizerPlugin } from 'src/lib/plugins-common/multimodal-vectorizer'
import { z } from 'zod'

export const model = z.enum([
  'embed-english-v3.0',
  'embed-english-light-v3.0',
  'embed-multilingual-v3.0',
  'embed-multilingual-light-v3.0',
])

const vectorizeOptions = z.object({
  model: model.optional().default(model.enum['embed-english-v3.0']),
})

const config = z.object({
  baseURL: z.string().optional(),
  clientSecret: z.object({
    apiKey: z.string().optional(),
  }),
  options: vectorizeOptions.optional(),
})

export const schemas = {
  config,
  vectorizeOptions,
} satisfies MultimodalVectorizerPlugin['schemas']
