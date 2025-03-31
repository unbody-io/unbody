import { UnbodyProjectSettings } from 'src/lib/core-types'
import { AutoEnhancer } from './AutoEnhancer'

const DEFAULT_TYPES = [
  'photograph',
  'diagram',
  'presentation',
  'painting',
  'drawing',
  'technical_drawing',
  'screenshot',
  'ui',
  'wireframe',
  'invoice',
  'recipe',
  'map',
  'chart',
  'infographic',
  'illustration',
  'blueprint',
  'certificate',
  'brochure',
  'marketing_material',
  'advertisement',
  'business_card',
  'newsletter',
  'menu',
  'report',
  'manual',
  'poster',
  'flyer',
  'resume',
  'cover_letter',
  'contract',
  'form',
  'spreadsheet',
  'letter',
  'email',
  'memo',
  'agenda',
  'press_release',
  'proposal',
  'white_paper',
  'case_study',
  'comic',
  'icon',
  'logo',
  'meme',
  'animation',
  'gif',
  '3d_model',
  'texture',
  'pattern',
  'ticket',
  'passport',
  'id_card',
  'badge',
  'greeting_card',
  'invitation',
  'label',
  'packaging',
  'catalog',
  'user_manual',
  'instructions',
  'flowchart',
  'mind_map',
  'storyboard',
  'sketch',
  'thumbnail',
  'cover_art',
  'album_art',
  'book_cover',
  'magazine_cover',
  'prototype',
  'stock_photo',
  'document',
  'textbook',
]

const DEFAULT_PROMPT = `For the given image, provide the following information:
- caption: generate a caption for the image
- text: extract any text present in the image. In case of a document, the extracted text must maintain the original layout of the document.
- types: classify the image into one or more of the predefined types: ${DEFAULT_TYPES.map((t) => `"${t}"`).join(',')}
`

export class AutoVision extends AutoEnhancer {
  get name() {
    return 'AutoVision'
  }

  get enabled() {
    return this.collection === 'ImageBlock' && !!this.settings.autoVision?.name
  }

  get pipelines() {
    const settings = this.settings.autoVision
    if (!settings) return []

    const pipelines: UnbodyProjectSettings.Enhancement.Pipeline[] = []

    pipelines.push({
      name: 'auto_enhancement',
      collection: this.collection,
      if: this.cond(
        (ctx) =>
          typeof ctx.record.url === 'string' &&
          !!ctx.record.url.match(/^http(s)?:\/\/.+/)?.[0],
      ),
      steps: [
        {
          name: 'autovision',
          action: {
            name: settings.name,
            args: {
              ...Object.fromEntries(
                Object.entries(settings.options || {}).map(([key, value]) => [
                  key,
                  this.arg(value),
                ]),
              ),
              temperature: this.arg(0.7),
              model: this.arg(settings.options?.model || 'openai-gpt-4o'),
              prompt: this.arg(settings.options?.prompt || DEFAULT_PROMPT),
              schema: this.arg((ctx, { z }) => {
                return z.object({
                  caption: z.string().nullable().default(''),
                  text: z.string().nullable().default(''),
                  types: z.array(z.string()).nullable().default([]),
                })
              }),
              images: this.arg((ctx) => [
                {
                  url: ctx.record.url,
                },
              ]),
            },
          },
          output: {
            autoOCR: this.arg((ctx) => ctx.result.json.text || ''),
            autoCaption: this.arg((ctx) => ctx.result.json.caption || ''),
            autoTypes: this.arg((ctx) => ctx.result.json.types || []),
          },
        },
      ],
    })

    return pipelines
  }
}
