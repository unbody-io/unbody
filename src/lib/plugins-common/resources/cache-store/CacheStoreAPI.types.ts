export interface CacheStoreAPI {
  keys(): Promise<string[]>

  get(key: string, options?: { encoding?: 'json' | 'base64' }): Promise<any>

  set(
    key: string,
    value: any,
    options?: {
      ttl?: number // time-to-live in seconds
      encoding?: 'json' | 'base64'
    },
  ): Promise<void>

  has(key: string): Promise<boolean>

  delete(key: string): Promise<void>

  clear(): Promise<void>
}
