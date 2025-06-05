import { Collection, CollectionMetadata } from '../core-types'

export class RecordCollection<T extends { __typename: string }> {
  private name: string
  private options: CollectionMetadata['options']
  private properties: CollectionMetadata['properties']

  constructor(collectionClass: { new (): any }) {
    const { name, options, properties } =
      Collection.getMetadata(collectionClass)

    this.name = name
    this.options = options
    this.properties = properties
  }

  createPayload = (json: Partial<T>): T => {
    const payload: Record<string, any> = {}

    for (const prop of this.properties) {
      const { name } = prop
      const value = (json as Record<string, unknown>)[name]
      payload[name] = value
    }

    payload['__typename'] = this.name

    return payload as T
  }
}
