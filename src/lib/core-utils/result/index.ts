export type Result<T, E> = { ok: false; error: E } | { ok: true; value: T }

export namespace Result {
  export const ok = <T, E>(value: T): Result<T, E> => ({ ok: true, value })
  export const err = <T, E>(error: E): Result<T, E> => ({ ok: false, error })

  export const match = <T, E, R>(
    result: Result<T, E>,
    {
      ok: onOk,
      err: onErr,
    }: {
      ok: (value: T) => R
      err: (error: E) => R
    },
  ): R => {
    if (result.ok) {
      return onOk(result.value)
    }

    return onErr(result.error)
  }
}
