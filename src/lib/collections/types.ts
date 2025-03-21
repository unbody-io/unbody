import { GoogleDoc } from './GoogleDoc.collection'
import { ImageBlock } from './ImageBlock.collection'
import { TextBlock } from './TextBlock.collection'

export const RecordTypeNames = {
  GoogleDoc: 'GoogleDoc' as 'GoogleDoc',

  TextBlock: 'TextBlock' as 'TextBlock',
  ImageBlock: 'ImageBlock' as 'ImageBlock',
} as const

export type RecordTypeName =
  (typeof RecordTypeNames)[keyof typeof RecordTypeNames]

export const CollectionTypeMap = {
  [RecordTypeNames.GoogleDoc]: GoogleDoc,

  [RecordTypeNames.TextBlock]: TextBlock,
  [RecordTypeNames.ImageBlock]: ImageBlock,
}

export type JsonRecord<T extends RecordTypeName> = Partial<
  InstanceType<(typeof CollectionTypeMap)[T]>
>
