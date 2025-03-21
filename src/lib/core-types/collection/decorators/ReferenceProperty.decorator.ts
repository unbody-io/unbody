import { getMetadataObject } from '../helpers/metadata.helpers'
import { CollectionType } from './Collection.decorator'
import { symbols } from './symbols'

export type ReferencePropertyOptions = {
  type: () => {
    collection: CollectionType
    property?: string

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
  }[]
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

export const ReferenceProperty =
  (options: ReferencePropertyOptions): PropertyDecorator =>
  (target, propertyKey) => {
    const _opts: ReferencePropertyOptions = {
      type: options.type,
      onDelete: options?.onDelete || 'NO_ACTION',
      onUpdate: options?.onUpdate || 'NO_ACTION',
    }

    Reflect.defineMetadata(
      symbols.property.referenceOptions,
      _opts,
      target,
      propertyKey,
    )
  }

export type ReferencePropertyMetadata = {
  options: ReferencePropertyOptions
}

export const getReferencePropertyMetadata = (
  schemaClass: CollectionType,
  propertyName: string,
): ReferencePropertyMetadata | undefined => {
  const options = getMetadataObject(schemaClass.prototype, propertyName)[
    symbols.property.referenceOptions
  ]

  if (options)
    return {
      options,
    }

  return undefined
}
