export class InvalidOptionsException extends Error {
  code = 'InvalidOptionsException'

  constructor(message: string) {
    super(`InvalidOptionsException: ${message}`)
  }
}

export class InputTooLongException extends Error {
  code = 'InputTooLongException'

  constructor(message: string) {
    super(`InputTooLongException: ${message}`)
  }
}
