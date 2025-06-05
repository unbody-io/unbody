import { getMetadataObject } from '../helpers/metadata.helpers'
import { Collection, CollectionType } from './Collection.decorator'
import { symbols } from './symbols'

export type PropertyAttributes = Record<string, any>

export const PropertyAttributes =
  (attributes: PropertyAttributes): PropertyDecorator =>
  (target, propertyKey) => {
    Reflect.defineMetadata(
      symbols.property.attributes,
      { ...attributes },
      target,
      propertyKey,
    )
  }

PropertyAttributes.getAttributes = (
  collection: CollectionType,
  propertyName: string,
): PropertyAttributes => {
  return (
    getMetadataObject(Collection.getPrototype(collection), propertyName)[
      symbols.property.attributes
    ] || {}
  )
}

PropertyAttributes.setAttributes = (
  collection: CollectionType,
  propertyName: string,
  attributes: PropertyAttributes,
) => {
  Reflect.defineMetadata(
    symbols.property.attributes,
    { ...attributes },
    Collection.getPrototype(collection),
    propertyName,
  )
}

PropertyAttributes.getAttribute = (
  collection: CollectionType,
  propertyName: string,
  attribute: string,
) => {
  return PropertyAttributes.getAttributes(collection, propertyName)?.[attribute]
}

PropertyAttributes.setAttribute = (
  collection: CollectionType,
  propertyName: string,
  attribute: string,
  value: any,
) => {
  PropertyAttributes.setAttributes(collection, propertyName, {
    ...(PropertyAttributes.getAttributes(collection, propertyName) || {}),
    [attribute]: value,
  })
}

PropertyAttributes.deleteAttribute = (
  collection: CollectionType,
  propertyName: string,
  attribute: string,
) => {
  const attributes = {
    ...(PropertyAttributes.getAttributes(collection, propertyName) || {}),
  }
  delete attributes[attribute]
  PropertyAttributes.setAttributes(collection, propertyName, attributes)
}

PropertyAttributes.deleteAttributes = (
  collection: CollectionType,
  propertyName: string,
) => {
  PropertyAttributes.setAttributes(collection, propertyName, {})
}
