export type EntrypointFormField = {
  key: string
  label: string
  description?: string

  type:
    | 'string'
    | 'text'
    | 'number'
    | 'boolean'
    | 'select'
    | 'url'
    | 'date'
    | 'time'
    | 'datetime'

  values?: {
    label: string
    value: string
  }[]

  required?: boolean
  defaultValue?: string | number | boolean
}

export type EntrypointFormOptions = {
  type: 'form'
  fields: EntrypointFormField[]
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
