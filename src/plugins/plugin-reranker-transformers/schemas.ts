import { RerankerPlugin } from 'src/lib/plugins-common/reranker'
import { z } from 'zod'

const config = z.object({
  baseURL: z.string(),
})

const rerankOptions = z.object({})

export const schemas = {
  config,
  rerankOptions,
} satisfies RerankerPlugin['schemas']
