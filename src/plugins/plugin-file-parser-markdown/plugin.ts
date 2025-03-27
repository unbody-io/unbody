import * as fm from 'front-matter'
import * as marked from 'marked'
import * as mimeTypes from 'mime-types'
import * as htmlParser from 'node-html-parser'
import * as path from 'path'
import _slugify from 'slugify'
import { JsonRecord } from 'src/lib/collections/types'
import { isInvalidDate, settleSync } from 'src/lib/core-utils'
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
import { z } from 'zod'
import { Config, Context } from './plugin.types'

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']

export const slugify = (
  text: string,
  options?: Parameters<typeof _slugify>[1] | {},
) =>
  _slugify(text, { strict: true, trim: true, lower: true, ...(options ?? {}) })

const extractFrontMatter = (markdown: string) => {
  const [res, err] = settleSync(() => (fm as any as Function)(markdown))

  if (err) {
    console.error(err)
  }

  if (res) {
    return {
      body: res.body,
      attributes: res.attributes as Record<string, any>,
    }
  }

  return {
    attributes: {},
    body: markdown,
  }
}

const getAttribute = <T = any>(
  attributes: Record<string, any>,
  keys: string | string[],
  validate: (value: any) => boolean,
  transform: (value: any) => T,
  defaultValue: T | undefined = undefined,
) => {
  const value = (typeof keys === 'string' ? [keys] : keys)
    .map((key) => attributes[key])
    .find((val) => validate(val))
  if (value) return transform(value)
  else return defaultValue
}

const metadataFromAttributes = (attributes: Record<string, any>) => {
  const title = attributes?.title
  const subtitle = attributes?.subtitle
  const description = attributes?.description
  const summary = attributes?.summary

  const createdAt = getAttribute(
    attributes,
    ['createdAt', 'created_at'],
    (val) => !isInvalidDate(new Date(val)),
    (val) => new Date(val).toJSON(),
  )

  const modifiedAt = getAttribute(
    attributes,
    ['modifiedAt', 'modified_at'],
    (val) => !isInvalidDate(new Date(val)),
    (val) => new Date(val).toJSON(),
  )

  const authors = getAttribute(
    attributes,
    ['author', 'authors'],
    (val) => !!val,
    (val) => (Array.isArray(val) ? val : [val]),
  )

  const tags = getAttribute(
    attributes,
    ['tag', 'tags'],
    (val) => !!val,
    (val) =>
      (Array.isArray(val) ? val : [val]).filter(
        (tag) => typeof tag === 'string' && tag.length > 0,
      ),
  )

  return {
    title,
    subtitle,
    summary,
    description,
    authors: authors ? authors.join(', ') : '',
    tags,
    modifiedAt,
    createdAt,
  }
}

export class MarkdownFileParser implements PluginLifecycle, FileParserPlugin {
  private config: Config

  schemas: FileParserPlugin['schemas'] = {
    config: z.object({}),
    parseFileOptions: z.object({}),
  }

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

    const markdown = fileBuffer.toString('utf-8')
    const { attributes, body } = extractFrontMatter(markdown)
    const htmlString = await marked.parse(body, {})
    const parsed = htmlParser.parse(htmlString, {
      blockTextElements: {
        pre: true,
      },
    })

    const blocks: JsonRecord<'TextBlock' | 'ImageBlock'>[] = []
    const elements: htmlParser.HTMLElement[] = []

    for (const element of parsed.childNodes) {
      if (!(element instanceof htmlParser.HTMLElement)) continue

      elements.push(element)
      if (element.childNodes.length === 1 && !!element.querySelector('img')) {
        const img = element.querySelector('img')!!
        const { src, alt, title } = img.attributes

        blocks.push({
          __typename: 'ImageBlock',
          url: src,
          alt: alt || '',
          title: title || '',
          ext: path.extname(src),
          mimeType: mimeTypes.lookup(src) || '',
          originalName: path.basename(src),
          height: 0,
          width: 0,
          size: 0,
        })
      } else {
        let current = element

        if (element.tagName.toLowerCase() === 'pre') {
          const child = htmlParser.parse(current.innerHTML)?.childNodes?.[0]
          if (
            child instanceof htmlParser.HTMLElement &&
            child.tagName.toLowerCase() === 'code'
          ) {
            current = child
          }
        }

        const tagName = current.tagName.toLowerCase()
        if (HEADING_TAGS.includes(tagName)) {
          if (!element.id) {
            element.setAttribute('id', slugify(current.text))
          }
        }

        blocks.push({
          tagName: tagName,
          html: current.outerHTML,
          text: current.textContent,
          classNames: Array.from(current.classList.values()),
          __typename: 'TextBlock',
        })
      }
    }

    const doc: JsonRecord<'TextDocument'> = {
      __typename: 'TextDocument',
    }

    doc.text = parsed.structuredText
    doc.html = parsed.innerHTML

    const tableOfContents = elements
      .map((element, index) => {
        if (!(element instanceof htmlParser.HTMLElement)) return null

        const tagName = element.tagName.toLowerCase()
        if (HEADING_TAGS.includes(tagName)) {
          const id = element.getAttribute('id')
          return {
            href: `#${id}`,
            blockIndex: index,
            title: element.text,
            tag: tagName,
            level: Number.parseInt(tagName[1], 10),
          }
        }
      })
      .filter((item) => !!item)

    const metadata = metadataFromAttributes(attributes)
    const sortedTableOfContents = [...tableOfContents].sort((a, b) =>
      a.level < b.level ? -1 : 1,
    )
    const titleToCItem = sortedTableOfContents[0]
    const subtitleToCItem = sortedTableOfContents[1]
    const descriptionBlock = blocks.find(
      (block) => block.__typename === 'TextBlock' && block.tagName === 'p',
    )

    doc.title = metadata.title || titleToCItem?.title || ''
    doc.subtitle = metadata.subtitle || subtitleToCItem?.title || ''
    doc.description =
      metadata.description ||
      (descriptionBlock?.__typename === 'TextBlock'
        ? descriptionBlock.text
        : '')
    doc.summary = metadata.summary || ''
    doc.authors = metadata.authors || ''
    doc.createdAt = metadata.createdAt || params.metadata?.createdAt || null
    doc.modifiedAt = metadata.modifiedAt || params.metadata?.modifiedAt || null
    doc.tags = metadata.tags || []
    doc.toc = JSON.stringify(tableOfContents)
    doc.blocks = blocks.map((block, index) => ({
      ...block,
      order: index,
    })) as any

    return {
      record: doc,
      attachments: [],
    }
  }

  processFileRecord = async (
    ctx: FileParserPluginContext,
    params: ProcessFileRecordParams,
  ): Promise<ProcessFileRecordResult> => {
    const record = params.record as JsonRecord<'TextDocument'>

    return {
      record: record,
    }
  }
}
