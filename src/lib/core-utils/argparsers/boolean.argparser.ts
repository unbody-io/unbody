export const parseBooleanArg = (arg: any): boolean | null => {
  let _arg: string = ''

  if (typeof arg === 'undefined' || arg === null) return null
  if (typeof arg === 'boolean') return arg
  if (typeof arg === 'number') _arg = arg.toString()
  if (typeof arg === 'string') _arg = arg.toLowerCase().trim()

  if (['1', 'true', 't', 'y', 'yes', 'on'].includes(_arg)) return true
  else if (['0', 'false', 'f', 'n', 'no', 'off'].includes(_arg)) return false

  return null
}
