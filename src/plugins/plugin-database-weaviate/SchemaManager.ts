import { CollectionConfig, PropertyConfig } from 'src/lib/core-types'
import weaviate, { CollectionConfigCreate, DataType } from 'weaviate-client'
import { WeaviateV3 } from './client.types'
import { Config, Context } from './plugin.types'

export class SchemaManager {
  constructor(
    private config: Config,
    private client: WeaviateV3,
    private ctx: Context,
  ) {}

  createCollections = async () => {
    for (const collection of this.ctx.collections) {
      await this.createCollection(collection)
    }

    for (const collection of this.ctx.collections) {
      await this.createCollectionReferenceProperties(collection)
    }
  }

  createCollection = async (collection: CollectionConfig) => {
    const config = this.weaviateCollectionConfig(collection)
    await this.client.collections.create({
      ...config,
      references: [],
    })
  }

  createCollectionReferenceProperties = async (
    collection: CollectionConfig,
  ) => {
    const config = this.weaviateCollectionConfig(collection)
    const references = config.references || []
    for (const ref of references) {
      await this.client.collections.use(config.name).config.addReference(ref)
    }
  }

  deleteAllSchemas = async () => {
    await this.client.collections.deleteAll()
  }

  weaviateCollectionConfig = (collection: CollectionConfig) => {
    const config: CollectionConfigCreate = {
      name: collection.name,
      description: collection.description || '',
      invertedIndex: weaviate.configure.invertedIndex({
        indexNullState: true,
        indexTimestamps: true,
        indexPropertyLength: true,
      }),
      vectorizers: {
        ...({} as any),
        vectorizer: {
          name: 'text2vec-huggingface',
          config: {
            endpointURL:
              this.config.modules?.textVectorizer?.config?.endpointURL,
          },
        },
        vectorIndex: weaviate.configure.vectorIndex.hnsw({}),
      },
      properties: [],
      references: [],
    }

    if (
      this.config.modules?.imageVectorizer &&
      collection.name === 'ImageBlock'
    ) {
      const module = this.config.modules.imageVectorizer
      const vectorizer = {
        name: module.name,
        config: module.config,
      }
      config.vectorizers = {
        vectorIndex: weaviate.configure.vectorIndex.hnsw({}),
        vectorizer,
      } as any

      if (this.config.modules.imageVectorizer?.multimodal) {
        const textProps = collection.properties
          .filter((prop) => prop.type === 'text' && prop.vectorize !== false)
          .map((prop) => prop.name)
        const imageProps = collection.properties
          .filter((prop) => prop.type === 'blob')
          .map((prop) => prop.name)

        vectorizer.config = {
          ...vectorizer.config,
          textFields: textProps,
          imageFields: imageProps,
        }
      }
    }

    if (this.config.modules?.generative) {
      config.generative = {
        name: 'generative-unbody',
        config: {
          endpointURL: this.config.modules?.generative?.config?.endpointURL,
        },
      }
    }

    if (this.config.modules?.reranker) {
      config.reranker = {
        name: this.config.modules.reranker.name,
        config: this.config.modules.reranker.config,
      }
    }

    const properties = collection.properties

    const _getPropertyType = (prop: PropertyConfig) => {
      const isArray = prop.array
      switch (prop.type) {
        case 'blob':
          return weaviate.configure.dataType.BLOB
        case 'boolean':
          return isArray
            ? weaviate.configure.dataType.BOOLEAN_ARRAY
            : weaviate.configure.dataType.BOOLEAN
        case 'date':
          return isArray
            ? weaviate.configure.dataType.DATE_ARRAY
            : weaviate.configure.dataType.DATE
        case 'geoCoordinates':
          return weaviate.configure.dataType.GEO_COORDINATES
        case 'int':
          return isArray
            ? weaviate.configure.dataType.INT_ARRAY
            : weaviate.configure.dataType.INT
        case 'number':
          return isArray
            ? weaviate.configure.dataType.NUMBER_ARRAY
            : weaviate.configure.dataType.NUMBER
        case 'phoneNumber':
          return weaviate.configure.dataType.PHONE_NUMBER
        case 'text':
          return isArray
            ? weaviate.configure.dataType.TEXT_ARRAY
            : weaviate.configure.dataType.TEXT
        case 'uuid':
          return isArray
            ? weaviate.configure.dataType.UUID_ARRAY
            : weaviate.configure.dataType.UUID
        case 'object':
          return isArray
            ? weaviate.configure.dataType.OBJECT_ARRAY
            : weaviate.configure.dataType.OBJECT
        case 'cref':
          return prop.refs.map((ref) => ref.collection)
        default: {
          const _type = (prop as PropertyConfig).type
          throw new Error(`Unknown property type: "${_type}"`)
        }
      }
    }

    for (const property of properties) {
      if (property.type === 'cref') {
        config.references!.push({
          name: property.name,
          targetCollections: property.refs.map((ref) => ref.collection),
        })
      } else {
        config.properties!.push({
          name: property.name,
          dataType: _getPropertyType(property) as DataType,
          description: property.description || '',
          ...(property.type === 'text'
            ? {
                indexSearchable: true,
              }
            : {}),
          ...(property.type === 'int' ||
          property.type === 'number' ||
          property.type === 'date'
            ? {
                indexRangeFilters: true,
              }
            : {}),
          ...('tokenization' in property
            ? { tokenization: property.tokenization || 'word' }
            : {}),
          skipVectorization:
            'vectorize' in property && property.vectorize === false,
          ...(property.type === 'object'
            ? ({
                nestedProperties: property.properties.map((nested) => ({
                  name: nested.name,
                  description: nested.description || '',
                  dataType: _getPropertyType(nested) as DataType,
                })),
              } as any)
            : {}),
        })
      }
    }

    return config
  }
}
