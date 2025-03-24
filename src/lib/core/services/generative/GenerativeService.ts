import { settle } from 'src/lib/core-utils'
import {
  GenerativeImageMessage,
  GenerativeTextMessage,
} from 'src/lib/plugins-common/generative'
import { Modules } from '../../modules'
import { GenerateTextParams } from '../../modules/generative/types'
import { Plugins } from '../../plugins'
import { ProjectContext } from '../../project-context'

export class GenerativeService {
  constructor(
    private _ctx: ProjectContext,
    private _plugins: Plugins,
    private _modules: Modules,
  ) {}

  async generateText(params: {
    signal: AbortSignal
    params: GenerateTextParams
  }) {
    const module = this._modules.generative

    const [validated, validationError] = await settle(() =>
      module.validateParams(params.params),
    )
    if (validationError)
      throw new Error(`validation error: ${validationError.message}`)

    const [vars, varsError] = await settle(() =>
      module.processVars(params.params),
    )

    if (varsError)
      throw new Error(`failed to process vars: ${varsError.message}`)

    const messages = await module.processMessages(params.params, vars)
    const generative = await module.getGenerative({ model: validated.model })
    const [res, err] = await settle(() =>
      generative.generateText({
        signal: params.signal,
        messages: messages.map((msg) => {
          if (msg.type === 'image') {
            return {
              type: 'image',
              name: msg.name,
              role: msg.role || 'user',
              content: {
                url: msg.content.url,
              },
            } as GenerativeImageMessage
          }

          return {
            type: 'text',
            name: msg.name,
            content: msg.content,
            role: msg.role || 'user',
          } as GenerativeTextMessage
        }),
        options: {
          ...validated.params,
        },
      }),
    )

    if (err) throw new Error(err.message)

    return {
      content: res.content,
      usageMetadata: res.metadata.usage,
      finishReason: res.metadata.finishReason,
    }
  }
}
