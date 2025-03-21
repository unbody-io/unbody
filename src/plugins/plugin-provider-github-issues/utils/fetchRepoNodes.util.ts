import { Octokit } from 'octokit'

const fetchAllPullRequests = async ({
  client,
  owner,
  repo,
}: {
  client: Octokit['graphql']
  owner: string
  repo: string
}) => {
  const allNodes: string[] = []

  const prs: {
    id: string
    commentsTotalCount: number
    reviewThreadsTotalCount: number
    comments: { id: string }[]
    reviewThreads: { id: string; comments: { id: string }[] }[]
  }[] = []

  {
    const query = `
    query ($owner: String!, $repo: String!, $first: Int!, $after: String) {
      repository(owner: $owner, name: $repo) {
        pullRequests(first: $first, after: $after) {
          totalCount
          nodes {
            id
            comments(first: 1) {
              totalCount
            }
            reviewThreads(first: 1) {
              totalCount
            }
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
  `

    let cursor: string | null = null
    while (true) {
      const {
        repository: {
          pullRequests: {
            nodes,
            pageInfo: { hasNextPage },
            pageInfo,
          },
        },
      } = await client<{
        repository: {
          pullRequests: {
            nodes: {
              id: string
              comments: {
                totalCount: number
              }
              reviewThreads: {
                totalCount: number
              }
            }[]
            pageInfo: {
              endCursor: string
              hasNextPage: boolean
            }
          }
        }
      }>(query, {
        owner,
        repo,
        first: 100,
        after: cursor,
      })

      nodes.forEach((node) => {
        prs.push({
          id: node.id,
          commentsTotalCount: node.comments.totalCount,
          reviewThreadsTotalCount: node.reviewThreads.totalCount,
          comments: [],
          reviewThreads: [],
        })
      })

      if (!hasNextPage) break

      const info = pageInfo as any
      cursor = info.endCursor
    }
  }

  {
    const batch1 = prs.filter((pr) => pr.commentsTotalCount <= 100)

    const batchSize = 5
    let batchNumber = 0

    while (true) {
      const batch = batch1.slice(
        batchNumber * batchSize,
        (batchNumber + 1) * batchSize,
      )
      batchNumber += 1

      if (batch.length === 0) break

      const query = `
    query ($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on PullRequest {
          id
          comments(first: 100) {
            nodes {
              id
            }
          }
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
    `

      const { nodes } = await client<{
        nodes: {
          id: string
          comments: {
            nodes: {
              id: string
            }[]
          }
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
        }[]
      }>(query, {
        ids: batch.map((pr) => pr.id),
      })

      nodes.forEach((node) => {
        const issue = prs.find((pr) => pr.id === node.id)!
        issue.comments.push(...node.comments.nodes)
        issue.reviewThreads = node.reviewThreads.nodes.map((thread) => ({
          id: thread.id,
          comments: thread.comments.nodes,
        }))
      })
    }
  }

  return prs
}

const fetchAllIssues = async ({
  client,
  owner,
  repo,
}: {
  client: Octokit['graphql']
  owner: string
  repo: string
}) => {
  const issues: {
    id: string
    commentsTotalCount: number
    comments: {
      id: string
    }[]
  }[] = []

  {
    const query = `
    query ($owner: String!, $repo: String!, $first: Int!, $after: String) {
      repository(owner: $owner, name: $repo) {
        issues(first: $first, after: $after) {
          totalCount
          nodes {
            id
            comments(first: 1) {
              totalCount
            }
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
  `

    let cursor: string | null = null
    while (true) {
      const {
        repository: {
          issues: {
            nodes,
            pageInfo: { hasNextPage },
            pageInfo,
          },
        },
      } = await client<{
        repository: {
          issues: {
            nodes: {
              id: string
              comments: {
                totalCount: number
              }
            }[]
            pageInfo: {
              endCursor: string
              hasNextPage: boolean
            }
          }
        }
      }>(query, {
        owner,
        repo,
        first: 100,
        after: cursor,
      })

      nodes.forEach((node) => {
        issues.push({
          id: node.id,
          commentsTotalCount: node.comments.totalCount,
          comments: [],
        })
      })

      if (!hasNextPage) break

      const info = pageInfo as any
      cursor = info.endCursor
    }
  }

  {
    const batch1 = issues.filter((issue) => issue.commentsTotalCount <= 100)

    const batchSize = 5
    let batchNumber = 0

    while (true) {
      const batch = batch1.slice(
        batchNumber * batchSize,
        (batchNumber + 1) * batchSize,
      )
      batchNumber += 1
      if (batch.length === 0) break

      const query = `
    query ($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Issue {
          id
          comments(first: 100) {
            nodes {
              id
            }
          }
        }
      }
    }
    `

      const { nodes } = await client<{
        nodes: {
          id: string
          comments: {
            nodes: {
              id: string
            }[]
          }
        }[]
      }>(query, {
        ids: batch.map((pr) => pr.id),
      })

      nodes.forEach((node) => {
        const issue = issues.find((issue) => issue.id === node.id)
        issue!.comments.push(...node.comments.nodes)
      })
    }
  }

  return issues
}

export const fetchRepoRelatedNodes = async ({
  repo,
  owner,
  client,
}: {
  client: Octokit['graphql']
  owner: string
  repo: string
}) => {
  const issues = await fetchAllIssues({ client, owner, repo })
  const pullRequests = await fetchAllPullRequests({ client, owner, repo })

  return {
    issues,
    pullRequests,
  }
}
