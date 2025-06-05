import {
  GoogleDoc,
  ImageBlock,
  TextBlock,
  TextDocument,
  WebPage,
  Website,
} from '../../collections'
import {
  Collection,
  CollectionConfig,
  CollectionFactory,
  CollectionType,
  UnbodyProjectSettingsDoc,
} from '../../core-types'

export class Collections {
  static BUILTIN_COLLECTIONS = [
    GoogleDoc,
    TextDocument,
    WebPage,
    Website,
    ImageBlock,
    TextBlock,
  ]

  public collections: CollectionConfig[] = []
  public collectionMap: Record<string, CollectionConfig> = {}

  private _collectionsMap: Record<string, CollectionType> = {}

  constructor(private readonly settings: UnbodyProjectSettingsDoc) {
    this._loadCollections()
  }

  getCollection(name: string) {
    return this.collectionMap[name]
  }

  getObjectPaths = (object: Record<string, any>) => {
    const objects: {
      path: string[]
      collection: string
      type: 'object' | 'reference'
    }[] = []

    const traverse = (obj: any, path: string[] = []) => {
      if (!obj || typeof obj !== 'object') return

      const typename = obj.__typename
      if (!typename) return

      const collection = this.collectionMap[typename]
      if (!collection) return

      if (
        obj.remoteId &&
        Object.keys(obj).every((key) =>
          ['remoteId', 'id', '__typename'].includes(key),
        )
      ) {
        objects.push({
          collection: obj.__typename,
          path: path,
          type: 'reference',
        })
        return
      }

      objects.push({
        collection: collection.name,
        path: path,
        type: 'object',
      })

      for (const property of collection.properties) {
        if (property.type !== 'cref') continue

        const value = obj[property.name]
        if (!value) continue

        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            traverse(value[i], [...path, property.name, i.toString()])
          }
        }
      }
    }

    traverse(object)

    return objects.map((obj) => ({
      ...obj,
      path: obj.path.join('.'),
    }))
  }

  private _loadCollections() {
    for (const collection of Collections.BUILTIN_COLLECTIONS) {
      const meta = Collection.getMetadata(collection)

      const factory = new CollectionFactory({
        name: meta.name,
        description: meta.options.description,
      })

      for (const property of meta.properties) {
        if (property.options.type !== 'cref')
          factory.addProperty(property.name, property.options)
      }

      const extend = (this.settings.customSchema?.extend || []).find(
        (col) => col.name === meta.name,
      )

      if (extend) {
        const properties = extend.properties.filter(
          (prop) => prop.type !== 'cref',
        )
        for (const property of properties) {
          factory.addProperty(property.name, property)
        }
      }

      this._collectionsMap[meta.name] = factory.collection
    }

    for (const collection of this.settings.customSchema?.collections || []) {
      const factory = new CollectionFactory({
        name: collection.name,
        description: collection.description,
      })

      for (const property of collection.properties) {
        if (property.type === 'cref') continue

        factory.addProperty(property.name, property)
      }

      this._collectionsMap[collection.name] = factory.collection
    }

    for (const collection of Collections.BUILTIN_COLLECTIONS) {
      const meta = Collection.getMetadata(collection)

      const extend = (this.settings.customSchema?.extend || []).find(
        (col) => col.name === meta.name,
      )
      const extendedReferences = (extend?.properties || []).filter(
        (prop) => prop.type === 'cref',
      )

      const existingReferences = meta.properties.filter(
        (prop) => prop.options.type === 'cref',
      )

      for (const ref of existingReferences) {
        const extended = extendedReferences.find(
          (prop) => prop.name === ref.name,
        )

        const CollectionClass = this._collectionsMap[meta.name]
        if (!CollectionClass)
          throw new Error(
            'Collection class not found for ' +
              meta.name +
              '. Collection Map may not be initialized correctly.',
          )

        const factory = CollectionFactory.fromCollection(CollectionClass)

        factory.addProperty(ref.name, ref.options, ref.attributes, {
          type: () => {
            const existingRefOptions = ref.referenceOptions
            const existingTypes = existingRefOptions?.type() || []

            return [
              ...existingTypes.map((ref) => ({
                collection: Collection.getName(ref.collection),
                property: ref.property,
              })),
              ...(extended ? extended.refs : []),
            ].map(({ collection, property }) => {
              const targetCollectionClass = this._collectionsMap[collection]
              if (!targetCollectionClass)
                throw new Error(
                  `Collection "${collection}" not found in collections map.`,
                )

              return {
                collection: targetCollectionClass,
                property,
              }
            })
          },
          onUpdate: ref.referenceOptions?.onUpdate,
          onDelete: ref.referenceOptions?.onDelete,
        })

        this._collectionsMap[meta.name] = factory.collection
      }
    }

    for (const collection of this.settings.customSchema?.collections || []) {
      const CollectionClass = this._collectionsMap[collection.name]
      if (!CollectionClass)
        throw new Error(
          `Collection "${collection.name}" not found in collections map.`,
        )

      const factory = CollectionFactory.fromCollection(CollectionClass)

      const referenceProperties = collection.properties.filter(
        (prop) => prop.type === 'cref',
      )

      for (const ref of referenceProperties) {
        factory.addProperty(
          ref.name,
          ref,
          {},
          {
            type: () =>
              ref.refs.map(({ collection, property }) => {
                const targetCollectionClass = this._collectionsMap[collection]
                if (!targetCollectionClass)
                  throw new Error(
                    `Collection "${collection}" not found in collections map.`,
                  )

                return {
                  collection: targetCollectionClass,
                  property,
                }
              }),
            onUpdate: ref.onUpdate,
            onDelete: ref.onDelete,
          },
        )
      }

      this._collectionsMap[collection.name] = factory.collection
    }

    this.collections = Object.values(this._collectionsMap).map(
      (collection) =>
        CollectionFactory.fromCollection(
          collection,
        ).toJSON() as CollectionConfig,
    )

    this.collectionMap = Object.fromEntries(
      this.collections.map((collection) => [collection.name, collection]),
    )
  }
}
