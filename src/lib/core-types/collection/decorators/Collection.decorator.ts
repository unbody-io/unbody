import * as _ from 'lodash'
import { CollectionConfig } from '../collection.types'
import { getMetadataObject } from '../helpers/metadata.helpers'
import { getPropertyMetadata, PropertyMetadata } from './Property.decorator'
import { symbols } from './symbols'

export type CollectionOptions = Omit<CollectionConfig, 'properties'>
export type CollectionType = Record<string, any>

export type CollectionMetadata = {
  name: string
  options: CollectionOptions
  properties: PropertyMetadata[]
}

export const Collection =
  (options: CollectionOptions): ClassDecorator =>
  (target) => {
    Reflect.defineMetadata(symbols.class.isClass, true, target)
    Reflect.defineMetadata(
      symbols.class.options,
      { ...options, name: options.name ?? Collection.name },
      target,
    )
  }

Collection.create = (
  name: string,
  options: CollectionOptions,
): CollectionType => {
  @Collection({
    ...options,
    name: name,
  })
  class NewClass {}

  Object.defineProperty(NewClass, 'name', { value: name })

  return NewClass
}

Collection.getName = (collection: CollectionType): string => {
  const { [symbols.class.options]: options } = getMetadataObject(collection)
  return (options as CollectionOptions).name
}

Collection.getMetadata = (collection: CollectionType): CollectionMetadata => {
  const { [symbols.class.options]: options } = getMetadataObject(collection)

  const { [symbols.class.propertyKeys]: propertyKeys } = getMetadataObject(
    collection.prototype,
  )

  return {
    name: options.name,
    options,
    properties: (propertyKeys || []).map((key: string) =>
      getPropertyMetadata(collection, key),
    ),
  }
}

Collection.getOptions = (collection: CollectionType) => {
  const options = Collection.getMetadata(collection).options
  return _.cloneDeep(options)
}

Collection.setOptions = (
  collection: CollectionType,
  options: CollectionOptions,
) => {
  Reflect.defineMetadata(symbols.class.options, options, collection)
}

export const getCollectionName = (collection: CollectionType): string =>
  Collection.getName(collection)

export const getCollectionMetadata = (
  collection: CollectionType,
): CollectionMetadata => Collection.getMetadata(collection)
