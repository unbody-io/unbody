import { UnbodyProjectSettings } from 'src/lib/core-types'
import { Collections } from 'src/lib/core/project-context'
import { AutoEnhancer } from './AutoEnhancer'

export class AutoSummary extends AutoEnhancer {
  static COLLECTIONS = Collections.BUILTIN_COLLECTIONS.map(
    (collection) => collection.name,
  ).filter((collection) => !['TextBlock', 'ImageBlock'].includes(collection))

  get name() {
    return 'AutoSummary'
  }

  get enabled() {
    return (
      AutoSummary.COLLECTIONS.includes(this.collection) &&
      !!this.settings.autoSummary?.name
    )
  }

  get pipelines() {
    return []
  }

  get steps() {
    const steps: UnbodyProjectSettings.Enhancement.Step[] = []

    const settings = this.settings.autoSummary
    if (!settings) return []

    steps.push({
      name: 'autosummary',
      action: {
        name: settings.name,
        args: {
          ...Object.fromEntries(
            Object.entries(settings.options || {}).map(([key, value]) => [
              key,
              this.arg(value),
            ]),
          ),
          model: this.arg(settings.options?.model || 'openai-gpt-4o'),
          metadata: this.arg((ctx) => {
            const collection = ctx.vars.collection
            const record = ctx.record as any
            let metadata: Record<string, any> = {}

            switch (collection) {
              case 'TextDocument':
                metadata = {
                  id: record.id,
                  title: record.title,
                  name: record.originalName,
                  mimeType: record.mimeType,
                  type: 'document',
                }
                break
              case 'GoogleDoc':
                metadata = {
                  id: record.id,
                  title: record.title,
                  name: record.originalName,
                  type: 'google_doc',
                }
                break
              default:
                return ''
            }

            return JSON.stringify(metadata)
          }),
          text: this.arg((ctx) => {
            const collection = ctx.vars.collection
            switch (collection) {
              case 'TextDocument':
              case 'GoogleDoc': {
                const record = ctx.record as any
                const text = record?.text || ''
                const images = (record?.blocks || [])
                  .filter(
                    (b) =>
                      b.__typename === 'ImageBlock' &&
                      typeof b.autoOCR === 'string',
                  )
                  .map((b) => b.autoOCR)
                  .join('\n\n')
                return [text, images].filter((x) => x.length > 0).join('\n\n')
              }

              default:
                return ctx.record.text || ''
            }
          }),
        },
      },
      output: {
        autoSummary: this.arg((ctx) => ctx.result.summary || ''),
      },
    })

    return steps
  }
}
