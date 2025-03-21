export class IndexingQueues {
  static Indexing = 'indexing-queue' as const
  static FileParser = 'file-parser-queue' as const
  static Enhancement = 'enhancement-queue' as const
  static RecordProcessor = 'record-processor-queue' as const
}
