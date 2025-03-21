export class DatabaseConnectionException extends Error {
  code = 'DatabaseConnectionException'

  constructor(message: string) {
    super(`DatabaseConnectionException: ${message}`)
  }
}

export class DatabaseOperationException extends Error {
  code = 'DatabaseOperationException'

  constructor(message: string) {
    super(`DatabaseOperationException: ${message}`)
  }
}
