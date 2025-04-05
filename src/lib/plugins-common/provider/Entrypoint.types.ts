export type EntrypointFormOptions = {
  type: 'form'
  schema: Record<string, any> // JSON Schema
}

export type EntrypointListOption = {
  id: string
  name: string
  selectable: boolean
  expandable: boolean

  description?: string

  url?: string
  typeLabel?: string
  typeDescription?: string

  extra?: Record<string, any>
  options?: EntrypointFormOptions
}

export type EntrypointListOptions = {
  type: 'list'
  options: EntrypointListOption[]
}

export type EntrypointFormInput = {
  type: 'form'
  fields: Record<string, any>
}

export type EntrypointInput =
  | EntrypointFormInput
  | {
      type: 'option'
      option: Omit<EntrypointListOption, 'options'> & {
        options?: EntrypointFormInput
      }
    }

export type EntrypointOptions = EntrypointListOptions | EntrypointFormOptions
