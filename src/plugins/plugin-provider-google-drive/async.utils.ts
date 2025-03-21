export const settle = async <R, E = Error>(
  promise: (() => Promise<R>) | Promise<R>,
): Promise<[R, undefined] | [undefined, E]> => {
  try {
    const result: R =
      typeof promise === 'function' ? await promise() : await promise
    return [result, undefined]
  } catch (error) {
    return [undefined, error as E]
  }
}

export const settleSync = <R, E = Error>(
  func: () => R,
): [R | undefined, E | undefined] => {
  try {
    return [func(), undefined]
  } catch (error) {
    return [undefined, error as E]
  }
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

export const createPromise = <T = any>() => {
  let resolve: any, reject: any

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  const callback = (data: T, error?: Error) => {
    if (error) return void reject(error)
    resolve(data)
  }

  return {
    reject,
    resolve,
    promise,

    callback,
  }
}
