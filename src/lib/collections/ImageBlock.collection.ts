import { Collection, Property, ReferenceProperty } from '../core-types'
import { GoogleDoc } from './GoogleDoc.collection'
import { TextDocument } from './TextDocument.collection'
import { RecordCollection } from './utils'

@Collection({
  name: 'ImageBlock',
})
export class ImageBlock {
  __typename: 'ImageBlock' = 'ImageBlock'

  @Property({
    type: 'text',
    vectorize: false,
    required: true,
    tokenization: 'field',
    description: 'The source identifier',
  })
  sourceId: string

  @Property({
    type: 'text',
    vectorize: false,
    array: false,
    required: false,
    tokenization: 'field',
  })
  remoteId?: string

  @Property({
    type: 'date',
    required: false,
  })
  createdAt?: string

  @Property({
    type: 'date',
    required: false,
  })
  modifiedAt?: string

  @Property({
    type: 'text',
    vectorize: false,
    required: true,
  })
  url: string

  @Property({
    type: 'text',
    vectorize: false,
    required: true,
    tokenization: 'field',
  })
  originalName: string

  @Property({
    type: 'text',
    required: true,
    vectorize: false,
    tokenization: 'field',
  })
  mimeType: string

  @Property({
    type: 'text',
    tokenization: 'field',
    vectorize: false,
    required: true,
  })
  ext: string

  @Property({
    type: 'int',
    required: true,
  })
  size: number

  @Property({
    type: 'text',
    array: true,
    required: true,
    vectorize: false,
    tokenization: 'field',
  })
  path: string[]

  @Property({
    type: 'text',
    array: false,
    required: true,
    vectorize: false,
    tokenization: 'field',
  })
  pathString: string

  @Property({
    type: 'int',
    required: true,
  })
  order: number

  @Property({
    type: 'text',
    array: true,
  })
  classNames?: string[]

  @Property({
    type: 'text',
    vectorize: true,
    required: false,
  })
  alt?: string

  @Property({
    type: 'text',
    required: false,
    vectorize: true,
  })
  caption?: string

  @Property({
    type: 'text',
    vectorize: true,
    required: false,
  })
  title?: string

  @Property({
    type: 'int',
    required: false,
  })
  width: number

  @Property({
    type: 'int',
    required: false,
  })
  height: number

  @Property({
    type: 'blob',
    required: false,
    array: false,
  })
  blob?: string

  @Property({
    type: 'cref',
  })
  @ReferenceProperty({
    type: () => [
      {
        collection: GoogleDoc,
      },
      {
        collection: TextDocument,
      },
    ],
    onUpdate: 'UPDATE_REFERENCE',
    onDelete: 'REMOVE_REFERENCE',
  })
  document: Array<GoogleDoc>

  @Property({
    type: 'text',
    required: false,
    vectorize: true,
  })
  autoCaption?: string

  @Property({
    type: 'text',
    array: true,
    required: false,
    vectorize: true,
  })
  autoTypes?: string[]

  @Property({
    type: 'text',
    required: false,
    vectorize: true,
  })
  autoOCR?: string
}

export const ImageBlockCollection = new RecordCollection<ImageBlock>(ImageBlock)
