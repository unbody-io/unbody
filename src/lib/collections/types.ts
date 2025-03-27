import { GoogleDoc } from './GoogleDoc.collection'
import { ImageBlock } from './ImageBlock.collection'
import { TextBlock } from './TextBlock.collection'
import { TextDocument } from './TextDocument.collection'

export const RecordTypeNames = {
  GoogleDoc: 'GoogleDoc' as 'GoogleDoc',
  TextDocument: 'TextDocument' as 'TextDocument',

  TextBlock: 'TextBlock' as 'TextBlock',
  ImageBlock: 'ImageBlock' as 'ImageBlock',
} as const

export type RecordTypeName =
  (typeof RecordTypeNames)[keyof typeof RecordTypeNames]

export const CollectionTypeMap = {
  [RecordTypeNames.GoogleDoc]: GoogleDoc,
  [RecordTypeNames.TextDocument]: TextDocument,

  [RecordTypeNames.TextBlock]: TextBlock,
  [RecordTypeNames.ImageBlock]: ImageBlock,
}

export type JsonRecord<T extends RecordTypeName> = Partial<
  InstanceType<(typeof CollectionTypeMap)[T]>
>
