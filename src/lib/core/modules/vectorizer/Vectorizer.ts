import axios from 'axios'
import * as _ from 'lodash'
import { PropertyConfig } from 'src/lib/core-types'
import { ImageVectorizerPluginInstance } from 'src/lib/plugins/instances/ImageVectorizerPlugin'
import { TextVectorizerPluginInstance } from 'src/lib/plugins/instances/TextVectorizerPlugin'
import { Plugins } from '../../plugins/Plugins'
import { ProjectContext } from '../../project-context'

export class Vectorizer {
  private _vectorizedProperties: Record<string, PropertyConfig[]> = {}
  private _textVectorizer: TextVectorizerPluginInstance | null = null
  private _imageVectorizer: ImageVectorizerPluginInstance | null = null

  constructor(
    private _ctx: ProjectContext,
    private plugins: Plugins,
  ) {}

  async vectorizeText(params: { text: string[] }) {
    const vectorizer = await this.getTextVectorizer()
    if (!vectorizer) throw new Error('Vectorizer not found')

    return await vectorizer.vectorize({ text: params.text })
  }

  async vectorizeImage(params: { image: string[] }) {
    const vectorizer = await this.getImageVectorizer()
    if (!vectorizer) throw new Error('Image vectorizer not found')

    const encoded: string[] = []

    for (const image of params.image) {
      if (!!image.match(/^data:image\/.*;base64,/)) {
        const enc = image.replace(/^data:image\/.*;base64,/, '')
        encoded.push(enc)
      } else if (image.startsWith('http://') || image.startsWith('https://')) {
        const response = await axios.get(image, {
          responseType: 'arraybuffer',
        })
        const enc = Buffer.from(response.data, 'binary').toString('base64')
        encoded.push(enc)
      } else {
        encoded.push(image)
      }
    }

    return await vectorizer.vectorize({ image: encoded })
  }

  async vectorizeObjects(record: Record<string, any>) {
    const vectorizeImages = !!this._ctx.settings.imageVectorizer

    const objects = this._ctx.collections.getObjectPaths(record)

    const inputs: {
      path: string
      text: string
    }[] = []
    const images: {
      path: string
      image: string
    }[] = []

    for (const obj of objects) {
      if (obj.type === 'reference') continue
      const { path, collection } = obj

      if (collection === 'ImageBlock' && vectorizeImages) {
        const image = path.length === 0 ? record : _.get(record, path)
        if (image) {
          if (image.blob && image.blob.length > 0) {
            images.push({ path, image: image.blob })
          } else if (
            image.url &&
            typeof image.url === 'string' &&
            (image.url.startsWith('http://') ||
              image.url.startsWith('https://'))
          ) {
            images.push({ path, image: image.url })
          }
        }

        continue
      }

      const text = this.getObjectText(
        path.length === 0 ? record : _.get(record, path),
      )

      if (text && text.length > 0) {
        inputs.push({ path, text })
      }
    }

    if (inputs.length > 0) {
      const textVectorizer = await this.getTextVectorizer()
      if (!textVectorizer) throw new Error('Text vectorizer not found')

      const { embeddings } = await textVectorizer.vectorize({
        text: inputs.map((input) => input.text),
      })

      for (const [index, input] of inputs.entries()) {
        const embedding = embeddings[index]
        const path = input.path
        _.set(
          record,
          path.length === 0 ? 'vectors' : `${path}.vectors`,
          embedding.embedding,
        )
      }
    }

    if (images.length > 0) {
      const { vectors } = await this.vectorizeImage({
        image: images.map((input) => input.image),
      })

      for (const [index, input] of images.entries()) {
        const vector = vectors[index]
        const path = input.path
        _.set(
          record,
          path.length === 0 ? 'vectors' : `${path}.vectors`,
          vector.vector,
        )
      }
    }

    return record
  }

  getObjectText(obj: Record<string, any>) {
    const collection = obj.__typename
    if (!collection) return ''

    const properties = this.getCollectionVectorizedProperties(collection)

    return properties
      .map((prop) => {
        const value = obj[prop.name]
        if (!value) return null

        if (typeof value === 'string') return `${prop.name} ${value}`
        else return `${prop.name} ${JSON.stringify(value)}`
      })
      .filter((v) => v !== null)
      .sort((a, b) => (a.length < b.length ? -1 : 1))
      .join(' ')
  }

  getCollectionVectorizedProperties(collectionName: string) {
    if (this._vectorizedProperties[collectionName]) {
      return this._vectorizedProperties[collectionName]
    }

    const collection = this._ctx.collections.collectionMap[collectionName]
    if (!collection) {
      return []
    }

    const properties = collection.properties.filter((prop) => {
      if (prop.type === 'cref') return false

      if (
        'vectorize' in prop &&
        typeof prop.vectorize === 'boolean' &&
        prop.vectorize === false
      ) {
        return false
      }

      return true
    })

    this._vectorizedProperties[collectionName] = properties
    return this._vectorizedProperties[collectionName]
  }

  async getTextVectorizer() {
    if (this._textVectorizer) return this._textVectorizer

    const plugin = await this.plugins.registry.getTextVectorizer(
      this._ctx.settings.textVectorizer.name,
    )
    if (!plugin) return null

    this._textVectorizer = new TextVectorizerPluginInstance(
      plugin,
      {},
      this.plugins.resources,
    )

    return this._textVectorizer
  }

  async getImageVectorizer() {
    if (this._imageVectorizer) return this._imageVectorizer

    const config = this._ctx.settings.imageVectorizer
    if (!config) return null

    const plugin = await this.plugins.registry.getImageVectorizer(config.name)
    if (!plugin) return null

    this._imageVectorizer = new ImageVectorizerPluginInstance(
      plugin,
      {},
      this.plugins.resources,
    )

    return this._imageVectorizer
  }
}
