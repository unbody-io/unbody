import * as _ from 'lodash'
import { PropertyConfig } from 'src/lib/core-types'
import { TextVectorizerPluginInstance } from 'src/lib/plugins/instances/TextVectorizerPlugin'
import { Plugins } from '../../plugins/Plugins'
import { ProjectContext } from '../../project-context'

export class Vectorizer {
  private _vectorizedProperties: Record<string, PropertyConfig[]> = {}

  constructor(
    private _ctx: ProjectContext,
    private plugins: Plugins,
  ) {}

  async vectorizeText(params: { text: string[] }) {
    const vectorizer = await this.getTextVectorizer()
    if (!vectorizer) throw new Error('Vectorizer not found')

    return await vectorizer.vectorize({ text: params.text })
  }

  async vectorizeObjects(record: Record<string, any>) {
    const objects = this._ctx.collections.getObjectPaths(record)

    const inputs: {
      path: string
      text: string
    }[] = []

    for (const obj of objects) {
      if (obj.type === 'reference') continue
      const { path } = obj
      const text = this.getObjectText(
        path.length === 0 ? record : _.get(record, path),
      )

      if (text && text.length > 0) {
        inputs.push({ path, text })
      }
    }

    const plugin = await this.plugins.registry.getTextVectorizer(
      this._ctx.settings.modules.textVectorizer.name,
    )
    if (!plugin) return record

    const vectorizer = new TextVectorizerPluginInstance(
      plugin,
      {},
      this.plugins.resources,
    )

    const { embeddings } = await vectorizer.vectorize({
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
    const plugin = await this.plugins.registry.getTextVectorizer(
      this._ctx.settings.modules.textVectorizer.name,
    )
    if (!plugin) return null

    const vectorizer = new TextVectorizerPluginInstance(
      plugin,
      {},
      this.plugins.resources,
    )

    return vectorizer
  }
}
