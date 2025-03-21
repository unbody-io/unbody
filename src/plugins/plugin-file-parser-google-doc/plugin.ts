import * as css from 'css'
import { createReadStream, createWriteStream } from 'fs'
import { mkdir, readFile } from 'fs/promises'
import * as _ from 'lodash'
import * as htmlParser from 'node-html-parser'
import { HTMLElement } from 'node-html-parser'
import * as path from 'path'
import * as sanitizeHtml from 'sanitize-html'
import { Transformer } from 'sanitize-html'
import _slugify from 'slugify'
import {
  GoogleDocCollection,
  ImageBlockCollection,
  TextBlockCollection,
} from 'src/lib/collections'
import { JsonRecord } from 'src/lib/collections/types'
import { settleSync } from 'src/lib/core-utils'
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
import * as unzipper from 'unzipper'
import * as uuid from 'uuid'
import { z } from 'zod'
import { Config, Context } from './plugin.types'

export const slugify = (
  text: string,
  options?: Parameters<typeof _slugify>[1] | {},
) =>
  _slugify(text, { strict: true, trim: true, lower: true, ...(options ?? {}) })

export class GoogleDocFileParser implements PluginLifecycle, FileParserPlugin {
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

    const dir = await unzipper.Open.buffer(fileBuffer)

    const res = (await Promise.all(
      dir.files.map((file) => {
        return new Promise(async (resolve, reject) => {
          const filePath = file.path
          const dir = path.dirname(filePath)
          await mkdir(path.join(ctx.tempDir, dir), { recursive: true })
          file
            .stream()
            .pipe(createWriteStream(path.join(ctx.tempDir, file.path)))
            .on('finish', () =>
              resolve({
                filename: path.join(ctx.tempDir, file.path),
              }),
            )
            .on('error', reject)
        })
      }),
    )) as { filename: string }[]

    const htmlFile = res.find((file) =>
      file.filename.endsWith('.html'),
    )!.filename
    const images = res
      .filter((file) => file.filename !== htmlFile)
      .map((file) => ({
        id: uuid.v4(),
        filename: file.filename,
      }))

    const rawHtml = await readFile(htmlFile, 'utf-8')
    const sanitized = await sanitizerGDocHTML(rawHtml, images)
    const parsed = await parseSanitizedGDocHTML(sanitized, images)

    const fileStorage = await ctx.getResource('fileStorage')

    const attachments: ParseFileResult['attachments'] = await Promise.all(
      images.map(async (image) => {
        const key = uuid.v4()

        await fileStorage.upload(key, createReadStream(image.filename), {
          contentType: 'image/jpeg',
        })

        return {
          id: image.id,
          contentType: 'image/jpeg',
          filename: image.filename,
          file: {
            key: key,
            isExternal: false,
          },
        } as ParseFileResult['attachments'][0]
      }),
    )

    return {
      record: parsed,
      attachments: attachments,
    }
  }

  processFileRecord = async (
    ctx: FileParserPluginContext,
    params: ProcessFileRecordParams,
  ): Promise<ProcessFileRecordResult> => {
    const record = params.record as JsonRecord<'GoogleDoc'>
    record.blocks = (record.blocks || [])
      .map((block) => {
        if (block.__typename === 'ImageBlock') {
          const processed = params.attachments.processed.find(
            (attachment) => attachment.id === block.originalName,
          )
          if (!processed) return null as any

          const { url, processed: image } = processed
          return {
            ...block,
            ...image,
            url,
          }
        }

        return block
      })
      .filter(Boolean)
      .map((block, index) => {
        block.order = index
        return block
      })

    return {
      record: record,
    }
  }
}

const cssProperties: {
  name: string
  type: string[]
  tags: string[]
  excludeValues: string[]
}[] = [
  {
    name: 'color',
    type: ['var'],
    tags: ['span'],
    excludeValues: [],
  },
  {
    name: 'font-size',
    type: ['var'],
    tags: ['span'],
    excludeValues: ['normal', 'none', 'inherit', 'default'],
  },
  {
    name: 'font-weight',
    type: ['class'],
    tags: ['span'],
    excludeValues: ['normal', 'none', 'inherit', 'default'],
  },
  {
    name: 'text-decoration',
    type: ['class'],
    tags: ['span'],
    excludeValues: ['normal', 'none', 'inherit', 'default'],
  },
  {
    name: 'font-style',
    type: ['class'],
    tags: ['span'],
    excludeValues: ['normal', 'none', 'inherit', 'default'],
  },
  {
    name: 'font-family',
    type: ['var'],
    tags: ['span'],
    excludeValues: ['normal', 'none', 'inherit', 'default'],
  },
  {
    name: 'text-align',
    type: ['class'],
    tags: ['h1', 'h2', 'h3', 'h4', 'div', 'p'],
    excludeValues: ['normal', 'none', 'inherit', 'default'],
  },
  {
    name: 'margin-left',
    type: ['var', 'helper-class'],
    tags: ['h1', 'h2', 'h3', 'h4', 'div', 'p'],
    excludeValues: ['normal', 'none', 'inherit', 'default'],
  },
]

const translateInlineStyles = (html: HTMLElement) => {
  const clone = html.clone() as HTMLElement

  const tags = new Set(cssProperties.flatMap((prop) => prop.tags))
  const elements = clone.querySelectorAll(Array.from(tags).join(', '))

  for (const element of elements) {
    const tagName = element.tagName.toLowerCase()
    const style = element.getAttribute('style') || ''
    const parsed = css.parse(`.c { ${_.unescape(style)} }`, { silent: true })

    if (!parsed.stylesheet || parsed.stylesheet.rules?.length === 0) continue

    const rule = parsed.stylesheet.rules[0]
    if (!('declarations' in rule)) continue

    const declarations = (rule.declarations || []) as css.Declaration[]

    const newStyle: string[] = []
    const classNames: string[] = []

    for (const { property, value } of declarations) {
      const config = cssProperties.find((prop) => prop.name === property)

      if (
        !config ||
        !value ||
        config.excludeValues.includes(value) ||
        !config.tags.includes(tagName)
      )
        continue

      if (config.type.includes('var'))
        newStyle.push(`--u-${property}: ${value};`)
      if (config.type.includes('class'))
        classNames.push(`u-${property}-${value}`)
      if (config.type.includes('helper-class'))
        classNames.push(`u-with-${property}`)
    }

    element.setAttribute('data-unbody-style', newStyle.join(''))
    element.setAttribute(
      'data-unbody-class',
      classNames.length > 0 ? classNames.join(' ') : '',
    )
  }

  clone.querySelectorAll('*').map((el) => {
    const unbodyStyles = el.getAttribute('data-unbody-style') || ''
    const unbodyClassNames = el.getAttribute('data-unbody-class') || ''

    el.hasAttribute('style') && el.removeAttribute('style')
    el.hasAttribute('data-unbody-style') &&
      el.removeAttribute('data-unbody-style')
    el.hasAttribute('data-unbody-class') &&
      el.removeAttribute('data-unbody-class')

    if (unbodyStyles.length > 0) el.setAttribute('style', unbodyStyles)

    Array.from(el.classList.values()).forEach((cls) => {
      if (!['title', 'subtitle'].includes(cls)) el.classList.remove(cls)
    })

    if (unbodyClassNames.length > 0) {
      unbodyClassNames.split(' ').forEach((cls) => el.classList.add(cls))
    }
  })

  return clone
}

const translateStyles = (html: HTMLElement): HTMLElement => {
  // const [transformed, result] = translateGlobalStyles(html)
  // if (transformed) return result

  return translateInlineStyles(html)
}

const removeComments = (html: HTMLElement) => {
  const clone = html.clone() as HTMLElement

  clone.querySelectorAll('sup > a').forEach((a) => {
    const href = a.getAttribute('href') || ''
    if (href.startsWith('#cmnt')) {
      a.parentNode.parentNode.removeChild(a.parentNode!)

      const comment = clone.querySelector(href)
      if (!comment) return

      const commentRoot = comment.parentNode.parentNode
      commentRoot.parentNode.removeChild(commentRoot)
    }
  })

  return clone
}

export const sanitizerGDocHTML = async (
  htmlRawContent: string,
  images: { id: string; filename: string }[] = [],
): Promise<string> => {
  const transFormInlineImage: Transformer = (_, attribs) => {
    const { alt, title = '', src } = attribs

    if (!src) {
      return {
        tagName: '',
        attribs: {},
      }
    }

    const name = path.basename(src!)
    const image = images.find((img) => path.basename(img.filename) === name)

    if (!image) return { tagName: '', attribs: {} }

    return {
      tagName: 'img',
      attribs: {
        src: image.id,
        alt,
        title,
      },
    } as any
  }

  const transformAnchorElements: Transformer = (_, attribs) => {
    const { href, ...rest } = attribs

    const [url] = settleSync(() => new URL(href))
    const q = url && url.searchParams.get('q')
    const [newUrl] = settleSync(() => q && new URL(q))

    return {
      tagName: 'a',
      attribs: {
        href: newUrl ? newUrl.toString() : href || '',
        ...rest,
      },
    } as any
  }

  const sanitized = sanitizeHtml(htmlRawContent, {
    allowVulnerableTags: true,
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      'html',
      'head',
      'body',
      'style',
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
    transformTags: {
      img: transFormInlineImage,
      a: transformAnchorElements,
    },
  })

  return sanitized
}

export const parseSanitizedGDocHTML = async (
  sanitizedHtml: string,
  images: { id: string; filename: string }[],
) => {
  let parsed = htmlParser.parse(sanitizedHtml, {
    blockTextElements: {
      style: true,
    },
    comment: false,
  })
  parsed = removeComments(parsed)
  parsed = translateStyles(parsed)

  parsed = parsed.querySelector('body') as HTMLElement

  let titleElement: { blockIndex: number; element: HTMLElement } | undefined
  let subtitleElement: { blockIndex: number; element: HTMLElement } | undefined

  const blocks: Array<JsonRecord<'TextBlock'> | JsonRecord<'ImageBlock'>> = []
  const blockElements: HTMLElement[] = []
  let index = -1

  for (const childNode of parsed.childNodes) {
    if (childNode instanceof htmlParser.HTMLElement) {
      const imageNode = childNode.querySelector('img')
      const image =
        imageNode &&
        images.find((img) => img.id === imageNode.getAttribute('src'))

      if (!image && childNode.textContent?.trim?.()?.length === 0) continue

      index++
      blockElements.push(childNode)

      const parsedImage: any = image ? { ...image } : null

      if (!!parsedImage) {
        const caption = imageNode!.parentNode.textContent
        if (caption && caption.length > 0) {
          parsedImage.alt = caption
        }

        blocks.push(
          ImageBlockCollection.createPayload({
            ...parsedImage,
            alt: imageNode!.getAttribute('alt') || '',
            title: imageNode!.getAttribute('title') || '',
            originalName: image!.id,
          }),
        )
      } else {
        const footnotes: any[] = []

        if (!titleElement && childNode.classList.contains('title')) {
          titleElement = { blockIndex: index, element: childNode }
        }

        if (!subtitleElement && childNode.classList.contains('subtitle')) {
          subtitleElement = { blockIndex: index, element: childNode }
        }

        childNode.querySelectorAll('sup > a').forEach((a) => {
          const href = a.getAttribute('href')
          const id = a.getAttribute('id')
          if (!href || !id || !href.includes('ftnt') || href.includes('_ref'))
            return

          const index = Number.parseInt(href.slice('#ftnt'.length), 10)
          const footnoteElement = parsed.querySelector(href)
          if (!footnoteElement) return

          const parentClone = footnoteElement.parentNode.clone() as HTMLElement
          parentClone.removeChild(parentClone.querySelector(href)!)

          const footnote = {
            index,
            id: href,
            refId: id,
            refValue: a.innerText,
            valueHTML: parentClone.innerHTML,
            valueText: parentClone.innerText,
          }

          footnotes.push(footnote)
        })

        blocks.push(
          TextBlockCollection.createPayload({
            tagName: childNode.rawTagName,
            classNames: childNode.classList
              ? Array.from(childNode.classList.values())
              : [],
            html: childNode.outerHTML,
            text: childNode.textContent,
          }),
        )
      }
    }
  }

  const toc: {
    level: number
    tag: string
    title: string
    href: string
    blockIndex?: number
  }[] = []

  if (titleElement) {
    const { blockIndex, element } = titleElement
    const id = slugify(element.innerText)
    element.setAttribute('id', id)

    const block = blocks[blockIndex] as JsonRecord<'TextBlock'>

    block.html = element.outerHTML
    block.text = element.text

    toc.push({
      tag: element.rawTagName as any,
      level: 0,
      blockIndex,
      title: element.innerText,
      href: `#${id}`,
    })
  }

  blocks.forEach((block, index) => {
    if (
      block.__typename === 'TextBlock' &&
      block.tagName &&
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(block.tagName)
    ) {
      const element = blockElements[index]
      const id = slugify(block.text!)
      element.setAttribute('id', id)
      const level = Number.parseInt(block.tagName.slice(1), 10)

      block.html = element.outerHTML
      block.text = element.text

      toc.push({
        level,
        tag: block.tagName,
        title: block.text,
        blockIndex: index,
        href: `#${id}`,
      })
    }
  })

  const title =
    toc.find((item) => item.level === 0 || item.level === 1)?.title ?? ''
  const subtitle = (subtitleElement && subtitleElement.element.text) || ''
  const summaryBlock = blocks.find(
    (block, index) =>
      block.__typename === 'TextBlock' &&
      block.tagName === 'p' &&
      blockElements[index] !== titleElement?.element &&
      blockElements[index] !== subtitleElement?.element,
  )
  const summary =
    (summaryBlock && (summaryBlock as JsonRecord<'TextBlock'>).text) || ''

  const html = parsed.innerHTML
  const text = parsed.structuredText

  const mentions: { name: string; emailAddress: string }[] = []
  parsed.querySelectorAll('a').forEach((el) => {
    const href = el.getAttribute('href')
    if (href && href.startsWith('mailto:')) {
      mentions.push({
        name: el.innerText,
        emailAddress: href.replace('mailto:', ''),
      })
    }
  })

  const payload = GoogleDocCollection.createPayload({})
  payload.blocks = blocks.map((block, index) => ({
    ...block,
    order: index,
  })) as any
  payload.mentions = JSON.stringify(mentions)
  payload.title = title
  payload.subtitle = subtitle
  payload.summary = summary
  payload.html = html
  payload.text = text

  return payload
}
