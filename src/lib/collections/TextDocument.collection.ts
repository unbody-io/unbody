import { Collection, Property, ReferenceProperty } from '../core-types'
import { ImageBlock } from './ImageBlock.collection'
import { TextBlock } from './TextBlock.collection'
import { RecordCollection } from './utils'

@Collection({
  name: 'TextDocument',
})
export class TextDocument {
  __typename: 'TextDocument' = 'TextDocument'

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
    required: false,
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
    type: 'text',
    required: false,
  })
  slug: string

  @Property({
    type: 'text',
    required: true,
  })
  title: string

  @Property({
    type: 'text',
    required: true,
  })
  subtitle: string

  @Property({
    type: 'text',
  })
  authors: string

  @Property({
    type: 'text',
  })
  summary: string

  @Property({
    type: 'text',
  })
  description: string

  @Property({
    type: 'text',
    array: true,
    required: true,
  })
  tags: string[]

  @Property({
    type: 'text',
    array: false,
    required: false,
  })
  toc: string

  @Property({
    type: 'text',
    required: false,
    vectorize: true,
  })
  text: string

  @Property({
    type: 'text',
    required: false,
    vectorize: false,
  })
  html: string

  @Property({
    type: 'text',
    required: false,
    vectorize: false,
  })
  properties?: string

  @Property({
    type: 'cref',
    required: false,
  })
  @ReferenceProperty({
    type: () => [
      {
        collection: TextBlock,
        property: 'document',
      },
      {
        collection: ImageBlock,
        property: 'document',
      },
    ],
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  blocks: Array<ImageBlock | TextBlock>

  @Property({
    type: 'text',
    required: false,
    vectorize: true,
  })
  autoSummary?: string
}

export const TextDocumentCollection = new RecordCollection<TextDocument>(
  TextDocument,
)
