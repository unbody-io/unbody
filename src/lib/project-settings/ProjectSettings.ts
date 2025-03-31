import { AutoEntities } from './AutoEntities'
import { AutoKeywords } from './AutoKeywords'
import { AutoSummary } from './AutoSummary'
import { AutoTopics } from './AutoTopics'
import { AutoVision } from './AutoVision'
import { CustomSchema } from './CustomSchema'
import { Enhancement } from './Enhancement'
import { Generative } from './Generative'
import { ImageVectorizer } from './ImageVectorizer'
import { PdfParser } from './PdfParser'
import { QnA } from './QnA'
import { Reranker } from './Reranker'
import { Spellcheck } from './Spellcheck'
import { TextVectorizer } from './TextVectorizer'
import { CoreTypes, UnbodyProjectSettingsDoc } from '../core-types'
type Module =
  | typeof TextVectorizer
  | typeof ImageVectorizer
  | typeof QnA
  | typeof Generative
  | typeof Reranker
  | typeof Spellcheck
  | typeof PdfParser
  | typeof AutoSummary
  | typeof AutoEntities
  | typeof AutoKeywords
  | typeof AutoTopics
  | typeof AutoVision
  | typeof CustomSchema
  | typeof Enhancement

const moduleKeys = [
  'textVectorizer',
  'imageVectorizer',
  'qnaProvider',
  'generative',
  'reranker',
  'spellcheck',
  'pdfParser',
  'autoSummary',
  'autoEntities',
  'autoKeywords',
  'autoTopics',
  'autoVision',
  'enhancement',
  'customSchema',
]

const module2Key = (module: any) => {
  switch (module) {
    case TextVectorizer:
      return 'textVectorizer'
    case ImageVectorizer:
      return 'imageVectorizer'
    case QnA:
      return 'qnaProvider'
    case Generative:
      return 'generative'
    case Reranker:
      return 'reranker'
    case Spellcheck:
      return 'spellcheck'

    case PdfParser:
      return 'pdfParser'

    case AutoSummary:
      return 'autoSummary'
    case AutoEntities:
      return 'autoEntities'
    case AutoKeywords:
      return 'autoKeywords'
    case AutoTopics:
      return 'autoTopics'
    case AutoVision:
      return 'autoVision'

    case CustomSchema:
      return 'customSchema'
    case Enhancement:
      return 'enhancement'

    default:
      throw new Error('Invalid module')
  }
}

const key2Module = (key: string) => {
  if (!moduleKeys.includes(key)) {
    throw new Error('Invalid module key')
  }

  switch (key) {
    case 'textVectorizer':
      return TextVectorizer
    case 'imageVectorizer':
      return ImageVectorizer
    case 'qnaProvider':
      return QnA
    case 'generative':
      return Generative
    case 'reranker':
      return Reranker
    case 'spellcheck':
      return Spellcheck

    case 'pdfParser':
      return PdfParser

    case 'autoSummary':
      return AutoSummary
    case 'autoEntities':
      return AutoEntities
    case 'autoKeywords':
      return AutoKeywords
    case 'autoTopics':
      return AutoTopics
    case 'autoVision':
      return AutoVision

    case 'customSchema':
      return CustomSchema
    case 'enhancement':
      return Enhancement
    default:
      throw new Error('Invalid module')
  }
}

const defaultFileParsers = {
  'image/.*': [{ name: 'file-parser-image' }],
  'text/markdown': [{ name: 'file-parser-markdown' }],
  'application/vnd.google-apps.document': [{ name: 'file-parser-google-doc' }],
}

export class ProjectSettings {
  private textVectorizer: TextVectorizer = new TextVectorizer(
    TextVectorizer.OpenAI.Ada002,
  )
  private imageVectorizer: ImageVectorizer | null = null
  private generative: Generative = new Generative(Generative.OpenAI.GPT4o)
  private reranker: Reranker | null = null
    // = new Reranker(Reranker.Cohere.MultilingualV3)

  private autoSummary: AutoSummary | null = null
  private autoVision: AutoVision | null = null

  private customSchema: CustomSchema = new CustomSchema()
  private enhancement: Enhancement = new Enhancement()
  private fileParsers: Record<
    string,
    CoreTypes.ProjectSettings.ModuleConfig[]
  > = defaultFileParsers

  constructor() {
    this.set(new TextVectorizer(TextVectorizer.Contextionary.Default))
  }

  get<T extends Module = Module>(module: T) {
    const key = module2Key(module)
    return (this as any)[key] as InstanceType<T>
  }

  set(value: InstanceType<Module>) {
    const key = module2Key(value.constructor)
    ;(this as any)[key] = value

    return this
  }

  toJSON = (): UnbodyProjectSettingsDoc => {
    return {
      textVectorizer: this.textVectorizer.toJSON(),
      fileParsers: this.fileParsers,
      enhancement: { pipelines: [] },
      customSchema: { collections: [] },
      imageVectorizer: this.imageVectorizer?.toJSON(),
      reranker: this.reranker?.toJSON(),
      generative: this.generative?.toJSON(),
      autoSummary: this.autoSummary?.toJSON(),
      autoVision: this.autoVision?.toJSON(),
    }
  }

  static fromJSON = (data: any) => {
    const settings = new ProjectSettings()
    const keys = Object.keys(data || {}).filter((key) =>
      moduleKeys.includes(key),
    )

    for (const key of keys) {
      const value = data[key]
      const module = key2Module(key)
      if (module) {
        settings.set((module as any).fromJSON(value))
      }
    }

    return settings
  }
}
