import htmlParser from 'node-html-parser'
import { ImageBlockCollection, TextBlockCollection } from 'src/lib/collections'
import { JsonRecord } from 'src/lib/collections/types'
import * as uuid from 'uuid'

export const parseIssueBody = (bodyHtml: string) => {
  const parsed = htmlParser.parse(bodyHtml)
  const attachments: {
    id: string
    url: string
  }[] = []

  parsed.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src')
    if (!src) return

    const url = new URL(src)
    if (!url.origin.includes('githubusercontent.com')) return

    const id = uuid.v4()

    img.setAttribute('--data-attachment-id', id)

    attachments.push({
      id: id,
      url: src,
    })
  })

  return {
    html: parsed.outerHTML,
    attachments,
  }
}

export const processIssueContent = (
  bodyHtml: string,
  attachments: {
    id: string
    url: string
    processed: JsonRecord<'ImageBlock'>
  }[],
) => {
  const parsed = htmlParser.parse(bodyHtml)

  parsed.querySelectorAll('img').forEach((img) => {
    const id = img.getAttribute('--data-attachment-id')
    if (!id) return

    const attachment = attachments.find((a) => a.id === id)
    if (!attachment) return

    img.setAttribute('src', attachment.url)
  })

  const blocks: Array<JsonRecord<'TextBlock'> | JsonRecord<'ImageBlock'>> = []

  parsed.childNodes.forEach((node) => {
    if (node instanceof htmlParser.TextNode) {
      blocks.push(
        TextBlockCollection.createPayload({
          tagName: 'p',
          classNames: [],
          text: node.rawText,
          html: `<p>${node.rawText}</p>`,
        }),
      )
    } else if (node instanceof htmlParser.HTMLElement) {
      const tagName = node.tagName.toLowerCase()
      if (
        (tagName === 'img' && !!node.getAttribute('data-attachment-id')) ||
        (node.querySelector('img') &&
          !!node.querySelector('img')?.getAttribute('data-attachment-id'))
      ) {
        const img = (tagName === 'img' ? node : node.querySelector('img'))!
        const id = img.getAttribute('data-attachment-id')
        const alt = img.getAttribute('alt') || node.textContent || ''
        const attachment = attachments.find((a) => a.id === id)
        if (attachment) {
          img.setAttribute('src', attachment.url)
          img.removeAttribute('data-attachment-id')
          blocks.push(
            ImageBlockCollection.createPayload({
              ...attachment.processed,
              alt,
              url: attachment.url,
            }),
          )
        }
      } else {
        if (tagName === 'img') {
          blocks.push(
            ImageBlockCollection.createPayload({
              url: node.getAttribute('src') || '',
              alt: node.getAttribute('alt') || '',
              width: parseInt(node.getAttribute('width') || '0'),
              height: parseInt(node.getAttribute('height') || '0'),
            }),
          )

          return
        }

        blocks.push(
          TextBlockCollection.createPayload({
            tagName,
            classNames: Array.from(node.classList.values()),
            text: node.textContent,
            html: node.outerHTML,
          }),
        )
      }
    }
  })

  return {
    html: parsed.outerHTML,
    blocks,
  }
}
