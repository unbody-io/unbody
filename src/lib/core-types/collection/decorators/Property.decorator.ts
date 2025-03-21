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
import { CollectionType } from './Collection.decorator'
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
  schemaClass: CollectionType,
  propertyName: string,
): PropertyMetadata => {
  const referenceOptions = getReferencePropertyMetadata(
    schemaClass,
    propertyName,
  )

  const metadata = {
    name: propertyName,
    options: {
      ...getMetadataObject(schemaClass.prototype, propertyName)[
        symbols.property.options
      ],
    },
    ...(referenceOptions ? { referenceOptions: referenceOptions.options } : {}),
    attributes: PropertyAttributes.getAttributes(schemaClass, propertyName),
  }

  return metadata
}

Property.hasProperty = (
  schemaClass: CollectionType,
  propertyName: string,
): boolean => {
  return (
    Reflect.getMetadata(
      symbols.property.options,
      schemaClass.prototype,
      propertyName,
    ) !== undefined
  )
}

Property.deleteProperty = (
  schemaClass: CollectionType,
  propertyName: string,
) => {
  const propKeys =
    Reflect.getMetadata(symbols.class.propertyKeys, schemaClass.prototype) ?? []

  Reflect.defineMetadata(
    symbols.class.propertyKeys,
    propKeys.filter((key: string) => key !== propertyName),
    schemaClass.prototype,
  )

  Reflect.deleteMetadata(
    symbols.property.options,
    schemaClass.prototype,
    propertyName,
  )
  Reflect.deleteMetadata(
    symbols.property.referenceOptions,
    schemaClass.prototype,
    propertyName,
  )
}

export const getPropertyMetadata = (
  schemaClass: CollectionType,
  propertyName: string,
): PropertyMetadata => Property.getMetadata(schemaClass, propertyName)

export const deletePropertyMetadata = (
  schemaClass: CollectionType,
  propertyName: string,
) => Property.deleteProperty(schemaClass, propertyName)
