import { EnhancementPipeline } from './EnhancementPipeline'
import { EnhancementPipelineStep } from './EnhancementPipelineStep'
import { EntityExtractorEnhancer } from './enhancers/EntityExtractor.enhancer'
import { KeywordExtractorEnhancer } from './enhancers/KeywordExtractor.enhancer'
import { RetrieverEnhancer } from './enhancers/Retriever.enhancer'
import { StructuredGeneratorEnhancer } from './enhancers/StructuredGenerator.enhancer'
import { SummarizerEnhancer } from './enhancers/Summarizer.enhancer'
import { TextGeneratorEnhancer } from './enhancers/TextGenerator.enhancer'
import { TextSplitterEnhancer } from './enhancers/TextSplitter.enhancer'
import { TopicExtractorEnhancer } from './enhancers/TopicExtractor.enhancer'
import { WebCrawlerEnhancer } from './enhancers/WebCrawler.enhancer'

export class Enhancement {
  static Pipeline = EnhancementPipeline
  static Step = EnhancementPipelineStep

  static Action = {
    Retriever: RetrieverEnhancer,
    TextSplitter: TextSplitterEnhancer,
    TextGenerator: TextGeneratorEnhancer,
    StructuredGenerator: StructuredGeneratorEnhancer,

    Summarizer: SummarizerEnhancer,
    KeywordExtractor: KeywordExtractorEnhancer,
    TopicExtractor: TopicExtractorEnhancer,
    EntityExtractor: EntityExtractorEnhancer,
    WebCrawler: WebCrawlerEnhancer,
  }

  public name = 'enhancement'
  public options: {
    pipelines: EnhancementPipeline[]
  } = {
    pipelines: [],
  }

  constructor(pipelines: EnhancementPipeline[] = []) {
    this.options.pipelines = pipelines
  }

  add = (...pipeline: EnhancementPipeline[]) => {
    for (const p of pipeline) {
      this.remove(p.name)
      this.options.pipelines.push(p)
    }

    return this
  }

  remove = (pipeline: string | EnhancementPipeline) => {
    const name = typeof pipeline === 'string' ? pipeline : pipeline.name
    this.options.pipelines = this.options.pipelines.filter(
      (pipeline) => pipeline.name !== name,
    )

    return this
  }

  toJSON = () => {
    return {
      name: this.name,
      options: {
        pipelines: this.options.pipelines.map((pipeline) => pipeline.toJSON()),
      },
    }
  }

  static fromJSON = (data: any) => {
    if (!data?.options?.pipelines || !Array.isArray(data.options.pipelines)) {
      throw new Error('Invalid enhancement configuration')
    }

    return new Enhancement(
      data.options.pipelines.map((pipeline: any) =>
        Enhancement.Pipeline.fromJSON(pipeline),
      ),
    )
  }
}
