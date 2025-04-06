import { z } from 'zod'

export const schemas = {
  config: z.object({}),
  parseFileOptions: z.object({
    contentOnly: z.boolean().optional().default(false),
    contentSelectors: z.array(z.string()).optional().default(['main']),
  }),
}
