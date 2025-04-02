import { z } from 'zod'
import { GenerateTextParams } from './types'

const promptSchema = z.object({
  type: z.literal('prompt'),
  prompt: z.string().optional(),
  properties: z.array(z.string()).optional(),
  model: z.string().optional(),
  params: z.record(z.any()).optional().default({}),
  data: z
    .union([z.array(z.record(z.any())), z.record(z.any())])
    .optional()
    .default([])
    .transform((data) => transformData(data)),
})

const validationSchema = z.object({
  type: z.literal('messages'),
  model: z.string().optional(),
  params: z.record(z.any()).optional().default({}),
  data: z
    .union([z.array(z.record(z.any())), z.record(z.any())])
    .optional()
    .default([])
    .transform((data) => transformData(data)),
  vars: z
    .array(
      z.object({
        name: z.string(),
        expression: z.string(),
        formatter: z.enum(['jq', 'jsonpath']),
      }),
    )
    .optional()
    .default([]),
  messages: z
    .array(
      z.union([
        z.string(),
        z.object({
          name: z.string().optional(),
          role: z
            .enum(['user', 'system', 'assistant'])
            .optional()
            .default('user'),
          type: z.enum(['text', 'image']).optional().default('text'),
          content: z
            .union([z.string(), z.object({ url: z.string() })])
            .default(''),
        }),
      ]),
    )
    .min(1)
    .transform((messages, ctx) => {
      return messages.map((msg, index) => {
        if (typeof msg === 'string') {
          return {
            name: undefined,
            role: 'user' as 'user',
            type: 'text' as 'text',
            content: msg,
          }
        }

        if (!msg.type || msg.type === 'text') {
          if (typeof msg.content !== 'string') {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Message content must be a string`,
              path: [index, 'content'],
              fatal: true,
            })
          }

          return {
            ...msg,
            type: 'text' as 'text',
            content: typeof msg.content === 'string' ? msg.content : '',
          }
        }

        if (msg.type === 'image') {
          return {
            ...msg,
            type: 'image' as 'image',
            content: {
              url:
                typeof msg.content === 'string' ? msg.content : msg.content.url,
            },
          }
        }

        return {
          name: msg.name || undefined,
          type: msg.type || 'text',
          role: msg.role || 'user',
          content: typeof msg.content === 'string' ? msg.content : '',
        }
      })
    }),
  responseFormat: z
    .object({
      type: z.enum(['json_object', 'json_schema', 'text']).default('text'),
      schema: z.record(z.any()).optional().default({}),
    })
    .optional()
    .default({
      type: 'text',
    }),
})

const schema = z.discriminatedUnion('type', [promptSchema, validationSchema])

const transformData = (
  data: any,
): Record<string, any> | Record<string, any>[] => {
  if (!data) return []

  if (Array.isArray(data)) return data.map((item) => transformData(item))

  if (typeof data === 'object') {
    const transformed: Record<string, any> = {}

    for (const [key, value] of Object.entries(data)) {
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        value.some(
          (o) => typeof o === 'object' && ((o.Class && o.Fields) || o.beacon),
        )
      ) {
        transformed[key] = value
          .map((item) => {
            if (item.Class && item.Fields) {
              return {
                __typename: item.Class,
                ...transformData(item.Fields),
              }
            }

            return null
          })
          .filter((item) => !!item)
      } else {
        transformed[key] = value
      }
    }

    return transformed
  }

  return data
}

export const validateParams = (params: GenerateTextParams) => {
  let transformed = params || {}

  const type = transformed.prompt ? 'prompt' : 'messages'
  const valid = schema.parse({ type, ...transformed })

  return valid
}

export type GenerateTextInput = z.infer<typeof schema>
