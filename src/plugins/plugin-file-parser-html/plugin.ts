import * as marked from 'marked'
import * as htmlParser from 'node-html-parser'
import * as path from 'path'
import * as sanitizeHtml from 'sanitize-html'
import _slugify from 'slugify'
import { ImageBlock, TextBlock } from 'src/lib/collections'
import { JsonRecord } from 'src/lib/collections/types'
import { PluginLifecycle } from 'src/lib/plugins-common'
import {
  FileParserPlugin,
  FileParserPluginContext,
  ParseFileParams,
  ParseFileResult,
  ProcessFileRecordParams,
  ProcessFileRecordResult,
} from 'src/lib/plugins-common/file-parser'
import { buffer } from 'stream/consumers'
import * as Turndown from 'turndown'
import { Config, Context, ParseFileOptions } from './plugin.types'
import { schemas } from './schemas'

// @ts-ignore
import * as turndownPluginGfm from 'turndown-plugin-gfm'

const turndown = new Turndown({
  headingStyle: 'atx',
  fence: '```',
  emDelimiter: '_',
  strongDelimiter: '**',
  linkStyle: 'inlined',
  linkReferenceStyle: 'full',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
})

turndown.use([turndownPluginGfm.tables, turndownPluginGfm.strikethrough])

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']

export const slugify = (
  text: string,
  options?: Parameters<typeof _slugify>[1] | {},
) =>
  _slugify(text, { strict: true, trim: true, lower: true, ...(options ?? {}) })

export class HTMLFileParser implements PluginLifecycle, FileParserPlugin {
  private config: Config

  schemas: FileParserPlugin['schemas'] = schemas

  constructor() {}

  initialize = async (config: Config) => {
    this.config = config
  }

  bootstrap = async (ctx: Context) => {}

  destroy = async (ctx: Context) => {}

  parseFile = async (
    ctx: FileParserPluginContext,
    params: ParseFileParams,
  ): Promise<ParseFileResult> => {
    const fileBuffer = Buffer.isBuffer(params.file)
      ? params.file
      : await buffer(params.file)

    const rawHtml = fileBuffer.toString('utf-8')
    const rawParsed = await this._preprocess(
      rawHtml,
      (params.options || {}) as ParseFileOptions,
    )
    const sanitized = await this._sanitize(rawParsed.outerHTML)
    const metadata = this._extractMetadata(rawHtml)
    const text = turndown.turndown(sanitized)
    const html = await marked.marked(text, {})
    const parsed = htmlParser.parse(html, {
      blockTextElements: {
        pre: true,
      },
    })

    const blocks: JsonRecord<'TextBlock' | 'ImageBlock'>[] = []
    for (const element of parsed.childNodes) {
      if (!(element instanceof htmlParser.HTMLElement)) continue

      if (
        element.tagName.toLowerCase() === 'img' ||
        (element.childNodes.length === 1 && !!element.querySelector('img'))
      ) {
        const img =
          element.tagName.toLowerCase() === 'img'
            ? element
            : (element.querySelector('img') as htmlParser.HTMLElement)
        const src = img.getAttribute('src') || ''
        if (!src) continue

        const originalName = path.basename(src)
        const ext = path.extname(originalName)
        const alt = img.getAttribute('alt') || ''
        const title = img.getAttribute('title') || ''
        const width = img.getAttribute('width') || null
        const height = img.getAttribute('height') || null
        const caption = element.structuredText || ''

        blocks.push({
          __typename: 'ImageBlock',
          url: src,
          alt,
          title,
          width: width as any,
          height: height as any,
          ext,
          originalName,
          caption,
        } satisfies JsonRecord<'ImageBlock'>)
      } else {
        const tagName = element.tagName.toLowerCase()
        let el = element

        if (tagName === 'pre') {
          const parsedChild = htmlParser.parse(element.innerHTML)
            ?.childNodes?.[0]
          if (
            parsedChild instanceof htmlParser.HTMLElement &&
            parsedChild.tagName.toLowerCase() === 'code'
          ) {
            el = parsedChild
          }
        }

        if (HEADING_TAGS.includes(tagName)) {
          if (!element.id) {
            element.setAttribute('id', slugify(element.text))
          }
        }

        const block: JsonRecord<'TextBlock'> = {
          __typename: 'TextBlock',
          html: el.outerHTML,
          text: el.textContent,
          tagName: el.tagName.toLowerCase(),
          classNames: Array.from(el.classList.values()),
        }

        blocks.push(block)
      }
    }

    return {
      record: {
        __typename: 'WebPage',
        ...metadata,
        text: text,
        html: parsed.outerHTML,
        properties: JSON.stringify(metadata.properties || {}),
        blocks: blocks.map((block, index) => ({
          ...block,
          order: index,
        })) as Array<TextBlock | ImageBlock>,
      } satisfies JsonRecord<'WebPage'>,
      attachments: [],
    }
  }

  processFileRecord = async (
    ctx: FileParserPluginContext,
    params: ProcessFileRecordParams,
  ): Promise<ProcessFileRecordResult> => {
    const record = params.record as JsonRecord<'WebPage'>

    return {
      record: record,
    }
  }

  private _preprocess = async (html: string, options: ParseFileOptions) => {
    const { contentOnly } = options
    const contentSelectors = [...(options.contentSelectors || [])]

    const parsed = htmlParser.parse(html, {
      blockTextElements: {
        pre: true,
      },
    })

    parsed.querySelectorAll('a').forEach((element) => {
      if (element.textContent && !element.querySelector('img')) {
        const text = element.textContent
        element.set_content(text)
      }
    })

    if (contentOnly) {
      if (contentSelectors.length === 0) {
        contentSelectors.push('main')
      }

      let content: htmlParser.HTMLElement | null = null

      for (const selector of contentSelectors) {
        content = parsed.querySelector(selector)

        if (content) break
      }

      if (content) {
        parsed.querySelector('body')?.set_content(content)
      } else {
        const body = parsed.querySelector('body')

        if (body) {
          body
            .querySelectorAll('header, footer, nav, aside')
            .forEach((element) => {
              element.remove()
            })
        }
      }
    }

    return parsed
  }

  private _extractMetadata = (html: htmlParser.HTMLElement | string) => {
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

  private _sanitize = async (htmlRawContent: string): Promise<string> => {
    const sanitized = sanitizeHtml(htmlRawContent, {
      allowVulnerableTags: true,
      allowedTags: [
        ...sanitizeHtml.defaults.allowedTags,
        'html',
        'head',
        'body',
        'img',
        'figcaption',
        'figure',
        'picture',
        'source',
        'iframe',
        'canvas',
        'h1',
        'h2',
      ],
      allowedAttributes: {
        a: ['href', 'name', 'target', 'title', 'id', 'style'],
        img: ['src', 'alt', 'title', 'srcset', 'data-*', 'style'],
        div: ['data-*', 'style'],
        canvas: ['data-*', 'width', 'height', 'style'],
        ul: ['*', 'style'],
        ol: ['*', 'style'],
        li: ['*', 'style'],
        span: ['style', 'class'],
        p: ['style', 'class'],
        h1: ['style', 'class'],
        h2: ['style', 'class'],
        h3: ['style', 'class'],
        h4: ['style', 'class'],
        h5: ['style', 'class'],
        h6: ['style', 'class'],
      },
      allowedClasses: {
        p: ['*'],
        a: ['*'],
        img: ['*'],
        span: ['*'],
        div: ['*'],
      },
    })

    return sanitized
  }
}
