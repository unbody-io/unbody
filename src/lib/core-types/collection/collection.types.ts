import { PropertyConfig as _WeaviatePropertyConfig } from 'weaviate-client'

export type WeaviatePropertyConfig = Omit<
  _WeaviatePropertyConfig,
  'name' | 'dataType'
>

export const PropertyTypes = {
  int: 'int' as 'int',
  number: 'number' as 'number',
  text: 'text' as 'text',
  uuid: 'uuid' as 'uuid',
  date: 'date' as 'date',
  boolean: 'boolean' as 'boolean',
  object: 'object' as 'object',
  phoneNumber: 'phoneNumber' as 'phoneNumber',
  geoCoordinates: 'geoCoordinates' as 'geoCoordinates',
  cref: 'cref' as 'cref',
  blob: 'blob' as 'blob',
}

export type PropertyType = (typeof PropertyTypes)[keyof typeof PropertyTypes]

export const TokenizationMethods = {
  word: 'word' as 'word',
  field: 'field' as 'field',
  lowercase: 'lowercase' as 'lowercase',
  whitespace: 'whitespace' as 'whitespace',
}

export type TokenizationMethod =
  (typeof TokenizationMethods)[keyof typeof TokenizationMethods]

export type PropertyConfigBase = {
  name: string
  array?: boolean
  required?: boolean
  description?: string
}

export type PropertyTokenizationConfig = {
  vectorize?:
    | false
    | true
    | {
        vectorizeName?: boolean
      }
  tokenization?: TokenizationMethod
}

export type IntPropertyConfig = PropertyConfigBase & {
  type: typeof PropertyTypes.int
}

export type NumberPropertyConfig = PropertyConfigBase & {
  type: typeof PropertyTypes.number
}

export type TextPropertyConfig = PropertyConfigBase &
  ({
    type: typeof PropertyTypes.text
  } & PropertyTokenizationConfig)

export type UUIDPropertyConfig = PropertyConfigBase & {
  type: typeof PropertyTypes.uuid
}

export type DatePropertyConfig = PropertyConfigBase & {
  type: typeof PropertyTypes.date
}

export type BooleanPropertyConfig = PropertyConfigBase & {
  type: typeof PropertyTypes.boolean
}

export type ObjectPropertyConfig = PropertyConfigBase & {
  type: typeof PropertyTypes.object
  properties: PropertyConfig[]
}

export type PhoneNumberPropertyConfig = PropertyConfigBase & {
  type: typeof PropertyTypes.phoneNumber
}

export type GeoCoordinatesPropertyConfig = PropertyConfigBase & {
  type: typeof PropertyTypes.geoCoordinates
}

export type BlobPropertyConfig = PropertyConfigBase & {
  type: typeof PropertyTypes.blob
}

export type CrossReference = {
  property: string
  collection: string
}

export type CrossReferencePropertyConfig = PropertyConfigBase & {
  type: typeof PropertyTypes.cref
  refs: CrossReference[]

  /**
   * @default 'NO_ACTION'
   * @option 'CASCADE' - Delete the referenced object when the parent object is deleted
   * @option 'REMOVE_REFERENCE' - Remove the reference to the parent object
   * @option 'NO_ACTION' - No action is taken
   */
  onDelete?: 'CASCADE' | 'REMOVE_REFERENCE' | 'NO_ACTION'

  /**
   * @default 'NO_ACTION'
   * @option 'CASCADE' - Update the referenced object when the parent object is updated
   * @option 'UPDATE_REFERENCE' - Update the reference to the parent object
   * @option 'NO_ACTION' - No action is taken
   */
  onUpdate?: 'CASCADE' | 'UPDATE_REFERENCE' | 'NO_ACTION'
}

export const collectionNameRegex = /^[a-z]{1}[a-zA-Z]+$/
export const customCollectionRegex = /^[A-Z]{1}[a-zA-Z]+Collection$/
export const customPropertyRegex = /^[a-z]{1}[a-zA-Z0-9]+$/
export const extraPropertyRegex = /^x[A-Z]{1}[a-zA-Z0-9]+$/

export type PropertyConfig =
  | IntPropertyConfig
  | NumberPropertyConfig
  | TextPropertyConfig
  | UUIDPropertyConfig
  | DatePropertyConfig
  | BooleanPropertyConfig
  | ObjectPropertyConfig
  | GeoCoordinatesPropertyConfig
  | CrossReferencePropertyConfig
  | PhoneNumberPropertyConfig
  | BlobPropertyConfig

export type CollectionConfig = {
  name: string
  description?: string

  properties: PropertyConfig[]
}
