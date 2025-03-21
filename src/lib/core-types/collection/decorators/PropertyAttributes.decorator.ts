import { getMetadataObject } from '../helpers/metadata.helpers'
import { CollectionType } from './Collection.decorator'
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
  schemaClass: CollectionType,
  propertyName: string,
): PropertyAttributes => {
  return (
    getMetadataObject(schemaClass.prototype, propertyName)[
      symbols.property.attributes
    ] || {}
  )
}

PropertyAttributes.setAttributes = (
  schemaClass: CollectionType,
  propertyName: string,
  attributes: PropertyAttributes,
) => {
  Reflect.defineMetadata(
    symbols.property.attributes,
    { ...attributes },
    schemaClass.prototype,
    propertyName,
  )
}

PropertyAttributes.getAttribute = (
  schemaClass: CollectionType,
  propertyName: string,
  attribute: string,
) => {
  return PropertyAttributes.getAttributes(schemaClass, propertyName)?.[
    attribute
  ]
}

PropertyAttributes.setAttribute = (
  schemaClass: CollectionType,
  propertyName: string,
  attribute: string,
  value: any,
) => {
  PropertyAttributes.setAttributes(schemaClass, propertyName, {
    ...(PropertyAttributes.getAttributes(schemaClass, propertyName) || {}),
    [attribute]: value,
  })
}

PropertyAttributes.deleteAttribute = (
  schemaClass: CollectionType,
  propertyName: string,
  attribute: string,
) => {
  const attributes = {
    ...(PropertyAttributes.getAttributes(schemaClass, propertyName) || {}),
  }
  delete attributes[attribute]
  PropertyAttributes.setAttributes(schemaClass, propertyName, attributes)
}

PropertyAttributes.deleteAttributes = (
  schemaClass: CollectionType,
  propertyName: string,
) => {
  PropertyAttributes.setAttributes(schemaClass, propertyName, {})
}
