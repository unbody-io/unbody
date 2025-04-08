import { MultimodalVectorizerPlugin } from 'src/lib/plugins-common/multimodal-vectorizer'
import { z } from 'zod'

const config = z.object({
  baseURL: z.string().url().optional(),
  supportedImageFormats: z
    .array(z.string())
    .optional()
    .default(['jpeg', 'jpg', 'png', 'webp']),
})

const vectorizeOptions = z.object({})

export const schemas = {
  config,
  vectorizeOptions,
} satisfies MultimodalVectorizerPlugin['schemas']
