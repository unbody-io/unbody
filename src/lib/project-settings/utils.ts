export const serializeComputedArg = (value: string | Function) => {
  const serialized = typeof value === 'string' ? value : value.toString()
  const matches = serialized.match(/^(\s|\n)*function[\s]*\(/)
  if (matches?.[0]) {
    return serialized.replace(matches[0], 'function evalArg(')
  }
  return serialized
}
