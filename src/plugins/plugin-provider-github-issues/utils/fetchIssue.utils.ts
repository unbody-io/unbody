import { Octokit } from 'octokit'
import { graphqlUtils } from './graphql.utils'

export const fetchIssueCommentIds = async ({
  id,
  client,
}: {
  id: string
  client: Octokit['graphql']
}) => {
  const query = `
  query ($id: ID!, $first: Int!, $after: String) {
    node(id: $id) {
      ... on Issue {
        comments(first: $first, after: $after) {
          nodes {
            id
          }
          totalCount
          pageInfo {
            endCursor
          }
        }
      }
    }
  }
  `

  const ids: string[] = []
  let cursor: string | null = null

  while (true) {
    const res = await graphqlUtils.call<{
      node: {
        comments: {
          nodes: {
            id: string
          }[]
          totalCount: number
          pageInfo: {
            endCursor: string
          }
        }
      }
    }>(() => client(query, { id, first: 100, after: cursor }))

    res.node.comments.nodes.forEach((node: any) => {
      ids.push(node.id)
    })

    if (
      res.node.comments.nodes.length === 0 ||
      ids.length >= res.node.comments.totalCount
    ) {
      break
    }

    cursor = res.node.comments.pageInfo.endCursor
  }

  return ids
}

export const fetchIssueRelatedNodes = async ({
  id,
  client,
}: {
  id: string
  client: Octokit['graphql']
}) => {
  const comments = await fetchIssueCommentIds({ id, client })

  return {
    comments,
  }
}
