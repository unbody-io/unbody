import { Transform } from 'class-transformer'

export const TrimString = () =>
  Transform(({ value }) => (value === null ? null : value.trim()))
