
export interface ErrorMessage {
  type: "error"
  error: Error
  suggestion?: string
}

export interface WarningMessage {
  type: "warning"
  warning: string
}

export type UserMessage = ErrorMessage | WarningMessage

export function error(m: Omit<ErrorMessage, "type">): ErrorMessage {
  return { type: "error" as const, ...m }
}

export function warning(message: string): WarningMessage {
  return { type: "warning" as const, warning: message }
}

