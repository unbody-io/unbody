export class InvalidEntrypointException extends Error {
  code = 'InvalidEntrypointException'

  constructor(message: string) {
    super(`InvalidEntrypointException: ${message}`)
  }
}

export class EntrypointAccessDeniedException extends Error {
  code = 'EntrypointAccessDeniedException'

  constructor(message: string) {
    super(`EntrypointAccessDeniedException: ${message}`)
  }
}

export class InvalidConnectionException extends Error {
  code = 'InvalidConnectionException'

  constructor(message: string) {
    super(`InvalidConnectionException: ${message}`)
  }
}

export class NotConnectedException extends Error {
  code = 'NotConnectedException'

  constructor(message: string) {
    super(`NotConnectedException: ${message}`)
  }
}

export class FileNotFoundException extends Error {
  code = 'FileNotFoundException'

  constructor(message: string) {
    super(`FileNotFoundException: ${message}`)
  }
}

export class ProviderRequestException extends Error {
  code = 'ProviderRequestException'

  constructor(message: string) {
    super(`ProviderRequestException: ${message}`)
  }
}
