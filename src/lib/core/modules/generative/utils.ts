import * as yup from 'yup'
import { GenerateTextParams } from './types'

const promptValidationSchema = yup.object({
  prompt: yup.string().optional(),
  properties: yup.array().of(yup.string()).optional(),

  model: yup.string(),
  params: yup.mixed().optional().default({}),
  data: yup.mixed().default([]),
})

const validationSchema = yup.object({
  model: yup.string(),
  params: yup.mixed().optional().default({}),
  data: yup.mixed().default([]),
  vars: yup
    .array()
    .of(
      yup.object({
        name: yup.string().required(),
        expression: yup.string().required(),
        formatter: yup.string().required().oneOf(['jq', 'jsonpath']),
      }),
    )
    .optional()
    .default([]),
  messages: yup
    .array()
    .required()
    .min(1)
    .of(
      yup.object({
        name: yup.string().optional(),
        role: yup
          .string()
          .optional()
          .oneOf(['user', 'system', 'assistant'])
          .default('user'),
        type: yup.string().optional().oneOf(['text', 'image']).default('text'),
        content: yup
          .string()
          .required()
          .when('type', {
            is: 'image',
            then: () =>
              yup.object({
                url: yup.string().required(),
              }),
          }),
      }),
    ),
  responseFormat: yup
    .object({
      type: yup.string().required().oneOf(['json_object', 'json_schema']),
      schema: yup.object().when('type', {
        is: 'json_object',
        then: () => yup.object({}).optional().strict(true),
        otherwise: () => yup.object({}).required().strict(true),
      }),
    })
    .optional()
    .default(undefined),
})

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
  transformed.data = transformData(params?.data || [])

  const reqType = transformed.prompt ? 'prompt' : 'messages'

  if (
    reqType === 'prompt' &&
    transformed.messages &&
    Array.isArray(transformed.messages)
  ) {
    throw new Error(`"prompt" and "messages" can't be used together`)
  }

  if (
    reqType === 'messages' &&
    transformed.messages &&
    Array.isArray(transformed.messages)
  ) {
    transformed.messages = transformed.messages.map(
      (msg: string | Record<string, any>) => {
        if (typeof msg === 'string')
          return {
            type: 'text',
            content: msg,
          }

        if (!msg.type || msg.type === 'text') {
          return {
            ...msg,
            type: 'text',
            content: msg.content as any as string,
          }
        }

        if (msg.type === 'image') {
          return {
            ...msg,
            type: 'image',
            content: {
              url: msg.content?.url || (msg.content as string),
            },
          }
        }

        return {
          ...msg,
          type: msg.type || 'text',
          role: msg.role || 'user',
          content: msg.content as any as string,
        }
      },
    )
  }

  return (
    reqType === 'prompt' ? promptValidationSchema : validationSchema
  ).validateSync(transformed, {
    stripUnknown: true,
    abortEarly: false,
    recursive: true,
  })
}
