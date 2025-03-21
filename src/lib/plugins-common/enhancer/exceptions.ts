export class InvalidFileInputException extends Error {
  code = 'InvalidFileInputException'

  constructor(message: string) {
    super(`InvalidFileInputException: ${message}`)
  }
}

export class InvalidParserOptionsException extends Error {
  code = 'InvalidParserOptionsException'

  constructor(message: string) {
    super(`InvalidParserOptionsException: ${message}`)
  }
}
