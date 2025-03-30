export namespace IndexingFailures {
  export const SOURCE_BUSY = 'SOURCE_BUSY' as const
}

export type IndexingFailure = typeof IndexingFailures.SOURCE_BUSY
