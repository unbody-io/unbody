import { StoragePlugin } from 'src/lib/plugins-common/storage'
import { z } from 'zod'

const config = z.object({
  publicRootDir: z.string().nonempty('cannot be empty'),
  publicBaseUrl: z.string().url(),
  privateRootDir: z.string().nonempty('cannot be empty'),
  privateBaseUrl: z.string().url(),
})

export const schemas = {
  config,
} satisfies StoragePlugin['schemas']
