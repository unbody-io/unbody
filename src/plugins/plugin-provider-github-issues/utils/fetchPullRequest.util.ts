import { Octokit } from 'octokit'
import { graphqlUtils } from './graphql.utils'

export const fetchPullRequestCommentIds = async ({
  id,
  client,
}: {
  id: string
  client: Octokit['graphql']
}) => {
  const query = `
  query ($id: ID!, $first: Int!, $after: String) {
    node(id: $id) {
      ... on PullRequest {
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

export const fetchPullRequestRelatedNodes = async ({
  id,
  client,
}: {
  id: string
  client: Octokit['graphql']
}) => {
  const query = `
query ($id: ID!) {
  node(id: $id){
    ... on PullRequest {
      reviewThreads(first: 100) {
        nodes {
          id
          comments(first: 100) {
            nodes {
              id
            }
          }
        }
      }
    }
  }
}`

  const { node } = await graphqlUtils.call<{
    node: {
      reviewThreads: {
        nodes: {
          id: string
          comments: {
            nodes: {
              id: string
            }[]
          }
        }[]
      }
    }
  }>(() =>
    client(query, {
      id,
    }),
  )

  const threads = node.reviewThreads.nodes
  const threadIds = threads.map((thread) => thread.id)
  const reviewCommentIds = threads.flatMap((thread) =>
    thread.comments.nodes.map((comment) => comment.id),
  )
  const commentIds = await fetchPullRequestCommentIds({ id, client })

  return {
    comments: commentIds,
    reviewThreads: threadIds,
    reviewComments: reviewCommentIds,
  }
}
