import { escapeRegExp } from './escapeRegExp.util'

export const wildcardToRegExp = (str: string) =>
  new RegExp('^' + str.split(/\*+/).map(escapeRegExp).join('.*') + '$')
