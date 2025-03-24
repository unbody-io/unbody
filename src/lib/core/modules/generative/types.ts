export type GenerateTextParams = {
  prompt?: string
  properties?: string[]

  model: string
  params: Record<string, any>
  data: Record<string, any> | Array<any>
  vars: {
    name: string
    formatter: string
    expression: string
  }[]
  messages: Array<
    | {
        type?: 'text'
        name?: string
        role?: string
        content: string
      }
    | {
        type: 'image'
        name?: string
        role?: string
        content: {
          url: string
        }
      }
  >

  responseFormat?: {
    type: 'json_object' | 'json_schema'
    schema?: Record<string, any>
  }
}
