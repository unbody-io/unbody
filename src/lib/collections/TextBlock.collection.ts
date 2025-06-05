import { Collection, Property, ReferenceProperty } from '../core-types'
import { GoogleDoc } from './GoogleDoc.collection'
import { TextDocument } from './TextDocument.collection'
import { RecordCollection } from './utils'
import { WebPage } from './WebPage.collection'

@Collection({
  name: 'TextBlock',
})
export class TextBlock {
  __typename: 'TextBlock' = 'TextBlock'

  @Property({
    type: 'text',
    vectorize: false,
    required: true,
    tokenization: 'field',
    description: 'The source identifier',
  })
  sourceId!: string

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
    type: 'int',
    required: true,
  })
  order!: number

  @Property({
    type: 'text',
  })
  tagName!: string

  @Property({
    type: 'text',
    array: true,
  })
  classNames?: string[]

  @Property({
    type: 'text',
    vectorize: true,
  })
  text!: string

  @Property({
    type: 'text',
    vectorize: false,
  })
  html!: string

  @Property({
    type: 'cref',
  })
  @ReferenceProperty({
    type: () => [
      {
        collection: GoogleDoc,
        property: 'document',
      },
      {
        collection: TextDocument,
        property: 'document',
      },
      {
        collection: WebPage,
        property: 'document',
      },
    ],
    onUpdate: 'UPDATE_REFERENCE',
    onDelete: 'REMOVE_REFERENCE',
  })
  document!: Array<GoogleDoc | TextDocument>
}

export const TextBlockCollection = new RecordCollection<TextBlock>(TextBlock)
