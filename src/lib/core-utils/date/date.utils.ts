const ms = require('ms')

export const addMilliseconds = (add: number | string, to?: Date) =>
  new Date(+(to ?? new Date()) + (typeof add === 'string' ? ms(add) ?? 0 : add))

export const isInvalidDate = (date: Date) => Number.isNaN(+date)
