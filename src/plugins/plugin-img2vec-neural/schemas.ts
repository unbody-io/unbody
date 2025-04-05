import { ImageVectorizerPlugin } from 'src/lib/plugins-common/image-vectorizer'
import { z } from 'zod'

const configSchema = z.object({
  baseURL: z.string().url().optional(),
  supportedFormats: z
    .array(z.string())
    .optional()
    .default(['png', 'jpeg', 'jpg', 'webp']),
})

const vectorizeOptionsSchema = z.object({})

export const schemas = {
  config: configSchema,
  vectorizeOptions: vectorizeOptionsSchema,
} satisfies ImageVectorizerPlugin['schemas']
