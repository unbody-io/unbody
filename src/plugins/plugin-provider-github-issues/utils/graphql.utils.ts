import { GraphqlResponseError } from '@octokit/graphql'
import { settle } from 'src/lib/core-utils'
import { FileNotFoundException } from 'src/lib/plugins-common/provider'

const call = async <T = any>(fn: () => Promise<T>) => {
  const [res, err] = await settle<T, GraphqlResponseError<T>>(() => fn())

  if (err) {
    if (err instanceof GraphqlResponseError) {
      const types = (err.errors || []).map((error) => error.type)

      if (types.includes('NOT_FOUND'))
        throw new FileNotFoundException(err.message)

      throw err
    } else throw err
  }

  return res
}

export const graphqlUtils = {
  call,
}
