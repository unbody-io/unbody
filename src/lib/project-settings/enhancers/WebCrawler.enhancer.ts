import { EnhancerArgs, GraphQLRecordType } from '../Enhancement.types'
import { Enhancer } from '../Enhancer'

export type WebCrawlerEnhancerArgs = {
  url: string
  maxPages?: number
  maxDepth?: number
  jsEnabled?: boolean
}

export type WebCrawlerEnhancerResult = {
  websites: GraphQLRecordType[]
}

export class WebCrawlerEnhancer extends Enhancer<
  WebCrawlerEnhancerArgs,
  WebCrawlerEnhancerResult,
  {}
> {
  name = 'enh-actions/web-crawler'

  constructor(args: EnhancerArgs<WebCrawlerEnhancerArgs>) {
    super(args)
  }
}
