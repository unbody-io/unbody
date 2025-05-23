import { Collection, Property, ReferenceProperty } from '../core-types'
import { RecordCollection } from './utils'
import { WebPage } from './WebPage.collection'

@Collection({
  name: 'Website',
})
export class Website {
  __typename: 'Website' = 'Website'

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
    type: 'text',
    vectorize: false,
    required: true,
  })
  url!: string

  @Property({
    type: 'text',
    vectorize: false,
    required: true,
    tokenization: 'field',
  })
  originalName!: string

  @Property({
    type: 'text',
    required: true,
    vectorize: false,
    tokenization: 'field',
  })
  mimeType!: string

  @Property({
    type: 'text',
    tokenization: 'field',
    vectorize: false,
    required: true,
  })
  ext!: string

  @Property({
    type: 'int',
    required: true,
  })
  size!: number

  @Property({
    type: 'text',
    array: true,
    required: true,
    vectorize: false,
    tokenization: 'field',
  })
  path!: string[]

  @Property({
    type: 'text',
    array: false,
    required: true,
    vectorize: false,
    tokenization: 'field',
  })
  pathString!: string

  @Property({
    type: 'text',
    required: true,
  })
  slug!: string

  @Property({
    type: 'text',
    required: true,
  })
  title!: string

  @Property({
    type: 'text',
    required: true,
  })
  description!: string

  @Property({
    type: 'text',
  })
  locale?: string

  @Property({
    type: 'text',
  })
  type?: string

  @Property({
    type: 'text',
    array: true,
    required: true,
  })
  keywords!: string[]

  @Property({
    type: 'text',
    vectorize: false,
    required: false,
  })
  properties?: string

  @Property({
    type: 'cref',
    required: false,
  })
  @ReferenceProperty({
    type: () => [
      {
        collection: WebPage,
        property: 'document',
      },
    ],
    onDelete: 'CASCADE',
    onUpdate: 'UPDATE_REFERENCE',
  })
  pages!: Array<WebPage>

  @Property({
    type: 'text',
    required: false,
    vectorize: true,
  })
  autoSummary?: string
}

export const WebsiteCollection = new RecordCollection<Website>(Website)
