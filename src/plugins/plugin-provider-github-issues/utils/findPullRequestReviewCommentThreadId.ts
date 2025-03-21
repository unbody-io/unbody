import { Octokit } from 'octokit'
import { graphqlUtils } from './graphql.utils'

export const findPullRequestReviewCommentThreadId = async ({
  id,
  client,
}: {
  id: string
  client: Octokit['graphql']
}) => {
  const query = `
query ($id: ID!) {
  node(id: $id){
    ... on PullRequestReviewComment {
      pullRequest {
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
  }
}`

  const { node } = await graphqlUtils.call<{
    node: {
      pullRequest: {
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
    }
  }>(() =>
    client(query, {
      id,
    }),
  )

  const threads = node.pullRequest.reviewThreads.nodes

  return threads.find((thread) =>
    thread.comments.nodes.find((comment) => comment.id === id),
  )?.id
}
