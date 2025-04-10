import { MemoryStorage } from '@crawlee/memory-storage'
import {
  Configuration,
  createPlaywrightRouter,
  Dataset,
  PlaywrightCrawler,
} from 'crawlee'
import * as crypto from 'crypto'
import * as htmlParser from 'node-html-parser'
import * as uuid from 'uuid'
import { SourceEntrypoint } from './plugin.types'

const hashPageContent = async (content: string) =>
  crypto.createHash('sha256').update(content).digest('hex')

export const extractMetadata = (html: htmlParser.HTMLElement | string) => {
  if (typeof html === 'string') {
    html = htmlParser.parse(html)
  }

  const head = html.querySelector('head') as htmlParser.HTMLElement
  if (!head) return {}

  const title = head.querySelector('title')?.text
  const meta = Object.fromEntries(
    head.childNodes
      .filter(
        (n) =>
          n instanceof htmlParser.HTMLElement &&
          n.tagName.toLowerCase() === 'meta',
      )
      .map((node) => [
        (node as htmlParser.HTMLElement).getAttribute('name') ||
          (node as htmlParser.HTMLElement).getAttribute('property'),
        (node as htmlParser.HTMLElement).getAttribute('content') || '',
      ])
      .filter(([key]) => !!key),
  )

  const locale = meta['og:locale'] || ''
  const type = meta['og:type'] || ''
  const url = meta['og:url'] || ''
  const keywords = (meta.keywords || '')
    .split(',')
    .map((keyword: string) => {
      return keyword.trim()
    })
    .filter((keyword: string) => keyword && keyword.length > 0)

  return {
    title,
    description: meta.description || meta['og:description'] || '',
    locale: locale,
    type: type,
    url: url,
    keywords: keywords,
    properties: meta,
  }
}

export namespace Crawler {
  export type PageData = {
    id: string
    url: string
    html: string
    title: string
    hash: string
    isRoot?: boolean
    metadata: PageMetadata
  }
  export type PageMetadata = {
    title: string
    description: string
    locale: string
    type: string
    url: string
    keywords: string[]
    properties: {
      [key: string]: any
    }
  }
}

export class Crawler {
  dataset: Dataset | undefined

  constructor(
    private crawlerId: string,
    private config: SourceEntrypoint,
  ) {}

  async crawl() {
    const maxDepth = this.config.maxDepth
    const maxPages = this.config.maxPages

    const router = createPlaywrightRouter({})
    const storageClient = new MemoryStorage({ persistStorage: false })

    router.addDefaultHandler(async (ctx) => {
      const id = uuid.v5(
        `${this.crawlerId}:${ctx.request.loadedUrl}`,
        uuid.v5.URL,
      )
      const url = ctx.page.url()
      const title = await ctx.page.title()
      const html = await ctx.page.content()
      const hash = await hashPageContent(html)
      const metadata = extractMetadata(html)

      await ctx.pushData({
        id,
        url,
        html,
        title,
        hash,
        metadata,
        isRoot: true,
      })

      let loadedUrl = ctx.request.loadedUrl
      if (loadedUrl.endsWith('/')) {
        loadedUrl = loadedUrl.slice(0, -1)
      }

      if (maxPages > 1)
        await ctx.enqueueLinks({
          globs: [`${loadedUrl}*`, `${loadedUrl}/**/*`],
          label: 'subpage',
          userData: {
            depth: 1,
          },
        })
    })

    router.addHandler('subpage', async (ctx) => {
      const depth = ctx.request.userData?.depth || 1
      const id = uuid.v5(
        `${this.crawlerId}:${ctx.request.loadedUrl}`,
        uuid.v5.URL,
      )

      if (depth <= maxDepth) {
        const url = ctx.page.url()
        const title = await ctx.page.title()
        const html = await ctx.page.content()
        const metadata = extractMetadata(html)
        await ctx.pushData({
          id,
          url,
          html,
          title,
          metadata,
          hash: await hashPageContent(html),
        })
      }

      if (depth < maxDepth) {
        let loadedUrl = ctx.request.loadedUrl
        if (loadedUrl.endsWith('/')) {
          loadedUrl = loadedUrl.slice(0, -1)
        }
        await ctx.enqueueLinks({
          globs: [`${loadedUrl}*`, `${loadedUrl}/**/*`],
          label: 'subpage',
          userData: {
            depth: depth + 1,
          },
        })
      }
    })

    const crawler = new PlaywrightCrawler(
      {
        maxConcurrency: 10,
        requestHandler: router,
        maxRequestsPerCrawl: maxPages,
      },
      new Configuration({
        storageClient,
      }),
    )

    await crawler.run([this.config.url], {})

    this.dataset = await Dataset.open('default', {
      storageClient,
    })
  }

  async getData(limit = 10) {
    if (!this.dataset) {
      throw new Error('Dataset not found')
    }

    return (() => {
      let hasNext = true
      let offset = 0

      return {
        hasNext: () => hasNext,
        next: async (): Promise<Crawler.PageData[]> => {
          if (!hasNext) {
            return []
          }

          const data = await this.dataset!.getData({
            clean: true,
            offset,
            limit,
          })

          const items = data.items
          hasNext = offset + items.length < data.total
          offset += items.length

          return items.map((item) => {
            return {
              id: item.id,
              url: item.url,
              html: item.html,
              hash: item.hash,
              title: item.title,
              isRoot: item.isRoot,
              metadata: item.metadata,
            }
          })
        },
      }
    })()
  }
}
