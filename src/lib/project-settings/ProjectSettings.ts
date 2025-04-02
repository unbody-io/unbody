import { UnbodyProjectSettingsDoc } from '../core-types'
import {
  TextVectorizer,
  ImageVectorizer,
  Generative,
  Enhancer,
} from '../plugins/builtin'

export { TextVectorizer, ImageVectorizer, Generative, Enhancer }

const defaultFileParsers = {
  'image/.*': [{ name: 'file-parser-image' }],
  'text/markdown': [{ name: 'file-parser-markdown' }],
  'application/vnd.google-apps.document': [{ name: 'file-parser-google-doc' }],
}

// Under the hood, AutoSummary and AutoVision are just enhancer plugin presets
export namespace AutoSummary {
  export type Model = Enhancer.Summarizer.Model
  export const OpenAI = Enhancer.Summarizer.OpenAI
}

export namespace AutoVision {
  export type Model = Enhancer.StructuredOutputGenerator.Model
  export const OpenAI = Enhancer.StructuredOutputGenerator.OpenAI
}

export class ProjectSettings {
  private settingsDoc: UnbodyProjectSettingsDoc = {
    fileParsers: defaultFileParsers,
    textVectorizer: { name: TextVectorizer.OpenAI.embedding3Large },
    imageVectorizer: undefined,
    generative: undefined,

    // built-in enhancers
    autoSummary: undefined,
    autoVision: undefined,

    // custom enhancer pipelines (not supported at the moment)
    enhancement: { pipelines: [] },

    // custom schema (not supported at the moment)
    customSchema: { collections: [] },
  }

  withTextVectorizer(
    pluginAlias: TextVectorizer.Alias = TextVectorizer.OpenAI.embedding3Large,
  ) {
    this.settingsDoc.textVectorizer = { name: pluginAlias }
    return this
  }

  withImageVectorizer(
    pluginAlias: ImageVectorizer.Alias = ImageVectorizer.Img2Vec.neural,
  ) {
    this.settingsDoc.imageVectorizer = { name: pluginAlias }
    return this
  }

  withAutoSummary(model: AutoSummary.Model = AutoSummary.OpenAI.gpt4o) {
    this.settingsDoc.autoSummary = {
      name: Enhancer.summarizer,
      options: {
        // plugin-enhancer-summarizer expects model to be prefixed with openai-
        model: `openai-${model}`,
      },
    }
    return this
  }

  withAutoVision(model: AutoVision.Model = AutoVision.OpenAI.gpt4o) {
    this.settingsDoc.autoVision = {
      name: Enhancer.structuredOutputGenerator,
      options: {
        // plugin-enhancer-structured-output-generator expects model to be prefixed with openai-
        model: `openai-${model}`,
      },
    }
    return this
  }

  withGenerative(model: Generative.Model = Generative.OpenAI.gpt4o) {
    this.settingsDoc.generative = {
      name: Generative.openAI,
      options: {
        model: model,
      },
    }
    return this
  }

  toJSON = (): UnbodyProjectSettingsDoc => {
    return this.settingsDoc
  }
}
