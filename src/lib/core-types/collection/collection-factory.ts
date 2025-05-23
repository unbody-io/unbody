import * as _ from 'lodash'
import {
  Collection,
  CollectionOptions,
  CollectionType,
} from './decorators/Collection.decorator'
import {
  Property,
  PropertyMetadata,
  PropertyOptions,
} from './decorators/Property.decorator'
import { PropertyAttributes } from './decorators/PropertyAttributes.decorator'
import {
  ReferenceProperty,
  ReferencePropertyOptions,
} from './decorators/ReferenceProperty.decorator'

export class CollectionFactory {
  private collectionClass: CollectionType

  constructor(config: Omit<CollectionOptions, 'name'> & { name: string }) {
    this.collectionClass = Collection.create(config.name, config)
  }

  public getOptions() {
    return Collection.getOptions(this.collectionClass)
  }

  public setOptions(
    options:
      | CollectionOptions
      | ((options: CollectionOptions) => CollectionOptions),
  ) {
    const current = Collection.getOptions(this.collectionClass)
    const newOptions = _.isFunction(options) ? options(current) : options
    Collection.setOptions(this.collectionClass, newOptions)
  }

  public hasProperty(name: string) {
    return Property.hasProperty(this.collectionClass, name)
  }

  public getProperty(name: string) {
    return Property.getMetadata(this.collectionClass, name)
  }

  public addProperty(
    name: string,
    options: PropertyOptions,
    attributes?: Record<string, any>,
    referenceOptions?: ReferencePropertyOptions,
  ) {
    Property(options)(this.collectionClass.prototype, name)
    if (attributes)
      PropertyAttributes(attributes)(this.collectionClass.prototype, name)
    if (referenceOptions)
      ReferenceProperty(referenceOptions)(this.collectionClass.prototype, name)
  }

  public updateProperty(
    name: string,
    update:
      | ((metadata: PropertyMetadata) => Omit<PropertyMetadata, 'name'>)
      | Omit<PropertyMetadata, 'name'>,
  ) {
    const prop = Property.getMetadata(this.collectionClass, name)
    const newProp = _.isFunction(update) ? update(_.cloneDeep(prop)) : update

    Property.deleteProperty(this.collectionClass, name)
    Property(newProp.options)(this.collectionClass.prototype, name)
    if (newProp.referenceOptions)
      ReferenceProperty(newProp.referenceOptions)(
        this.collectionClass.prototype,
        name,
      )
    PropertyAttributes(newProp.attributes || {})(
      this.collectionClass.prototype,
      name,
    )
  }

  public removeProperty(name: string) {
    Property.deleteProperty(this.collectionClass, name)
  }

  toJSON = () => {
    const metadata = Collection.getMetadata(this.collectionClass)

    return {
      ...metadata.options,
      name: metadata.name,
      properties: metadata.properties.map(({ referenceOptions, ...prop }) => {
        if (prop.options.type !== 'cref') {
          return {
            ...prop.options,
            type: prop.options.type,
          }
        }

        if (!referenceOptions)
          throw new Error(
            `Cross-Reference property ${prop.name} is missing referenceOptions`,
          )

        const refs = referenceOptions.type
          ? referenceOptions.type().map(({ collection, ...rest }) => ({
              collection: Collection.getName(collection),
              ...rest,
            }))
          : []

        return {
          name: prop.name,
          type: 'cref',
          onUpdate: referenceOptions.onUpdate,
          onDelete: referenceOptions.onDelete,
          refs: refs.map((ref) => ({
            onUpdate: referenceOptions.onUpdate,
            onDelete: referenceOptions.onDelete,
            ...ref,
          })),
        }
      }),
    }
  }

  get propertyNames() {
    return Collection.getMetadata(this.collectionClass).properties.map(
      (prop) => prop.name,
    )
  }

  get collection() {
    return this.collectionClass
  }

  static fromCollection(schemaClass: CollectionType) {
    const creator = new CollectionFactory({
      ...Collection.getOptions(schemaClass),
    })

    for (const prop of Collection.getMetadata(schemaClass).properties) {
      creator.addProperty(
        prop.name,
        prop.options,
        prop.attributes,
        prop.referenceOptions,
      )
    }

    return creator
  }
}
