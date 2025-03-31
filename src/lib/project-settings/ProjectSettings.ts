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
  'generativeSearch',
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
      return 'generativeSearch'
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
    case 'generativeSearch':
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

export class ProjectSettings {
  private textVectorizer: TextVectorizer | null = null
  private imageVectorizer: ImageVectorizer | null = null
  private qnaProvider: QnA | null = null
  private generativeSearch: Generative | null = null
  private reranker: Reranker | null = null
  private spellcheck: Spellcheck | null = null

  private pdfParser: PdfParser | null = null

  private autoSummary: AutoSummary | null = null
  private autoEntities: AutoEntities | null = null
  private autoKeywords: AutoKeywords | null = null
  private autoTopics: AutoTopics | null = null
  private autoVision: AutoVision | null = null

  private customSchema: CustomSchema | null = null
  private enhancement: Enhancement | null = null

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

  toJSON = () => {
    const json: Record<string, any> = {}

    for (const key of moduleKeys) {
      const conf = (this as any)[key] as any
      if (conf) {
        json[key] = conf.toJSON()
      }
    }

    return json
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
