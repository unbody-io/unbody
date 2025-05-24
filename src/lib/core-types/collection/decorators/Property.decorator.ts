import {
  BlobPropertyConfig,
  BooleanPropertyConfig,
  CrossReferencePropertyConfig,
  DatePropertyConfig,
  GeoCoordinatesPropertyConfig,
  IntPropertyConfig,
  NumberPropertyConfig,
  ObjectPropertyConfig,
  PhoneNumberPropertyConfig,
  TextPropertyConfig,
  UUIDPropertyConfig,
} from '../collection.types'
import { getMetadataObject } from '../helpers/metadata.helpers'
import { Collection, CollectionType } from './Collection.decorator'
import { PropertyAttributes } from './PropertyAttributes.decorator'
import {
  ReferencePropertyMetadata,
  getReferencePropertyMetadata,
} from './ReferenceProperty.decorator'
import { symbols } from './symbols'

export type PropertyOptions =
  | Omit<IntPropertyConfig, 'name'>
  | Omit<NumberPropertyConfig, 'name'>
  | Omit<TextPropertyConfig, 'name'>
  | Omit<UUIDPropertyConfig, 'name'>
  | Omit<DatePropertyConfig, 'name'>
  | Omit<BooleanPropertyConfig, 'name'>
  | Omit<ObjectPropertyConfig, 'name'>
  | Omit<GeoCoordinatesPropertyConfig, 'name'>
  | Omit<CrossReferencePropertyConfig, 'name' | 'refs'>
  | Omit<PhoneNumberPropertyConfig, 'name'>
  | Omit<BlobPropertyConfig, 'name'>

export type PropertyMetadata = {
  name: string
  options: PropertyOptions
  referenceOptions?: ReferencePropertyMetadata['options']

  attributes: Record<string, any>
}

export const Property =
  (options: PropertyOptions): PropertyDecorator =>
  (target, propertyKey) => {
    const propKeys =
      Reflect.getOwnMetadata(symbols.class.propertyKeys, target) ?? []
    propKeys.push(propertyKey)

    Reflect.defineMetadata(symbols.class.propertyKeys, propKeys, target)

    Reflect.defineMetadata(
      symbols.property.options,
      { ...options, name: propertyKey },
      target,
      propertyKey,
    )
  }

Property.getMetadata = (
  collection: CollectionType,
  propertyName: string,
): PropertyMetadata => {
  const referenceOptions = getReferencePropertyMetadata(
    collection,
    propertyName,
  )

  const metadata = {
    name: propertyName,
    options: {
      ...getMetadataObject(Collection.getPrototype(collection), propertyName)[
        symbols.property.options
      ],
    },
    ...(referenceOptions ? { referenceOptions: referenceOptions.options } : {}),
    attributes: PropertyAttributes.getAttributes(collection, propertyName),
  }

  return metadata
}

Property.hasProperty = (
  collection: CollectionType,
  propertyName: string,
): boolean => {
  return (
    Reflect.getMetadata(
      symbols.property.options,
      Collection.getPrototype(collection),
      propertyName,
    ) !== undefined
  )
}

Property.deleteProperty = (
  collection: CollectionType,
  propertyName: string,
) => {
  const propKeys =
    Reflect.getMetadata(
      symbols.class.propertyKeys,
      Collection.getPrototype(collection),
    ) ?? []

  Reflect.defineMetadata(
    symbols.class.propertyKeys,
    propKeys.filter((key: string) => key !== propertyName),
    Collection.getPrototype(collection),
  )

  Reflect.deleteMetadata(
    symbols.property.options,
    Collection.getPrototype(collection),
    propertyName,
  )
  Reflect.deleteMetadata(
    symbols.property.referenceOptions,
    Collection.getPrototype(collection),
    propertyName,
  )
}

export const getPropertyMetadata = (
  collection: CollectionType,
  propertyName: string,
): PropertyMetadata => Property.getMetadata(collection, propertyName)

export const deletePropertyMetadata = (
  collection: CollectionType,
  propertyName: string,
) => Property.deleteProperty(collection, propertyName)
