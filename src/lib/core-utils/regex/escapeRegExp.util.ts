export const escapeRegExp = (str: string) =>
  str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
