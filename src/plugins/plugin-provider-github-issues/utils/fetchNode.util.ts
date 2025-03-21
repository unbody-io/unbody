import { Octokit } from 'octokit'

export const fetchNode = async <T = any>({
  id,
  client,
}: {
  id: string
  client: Octokit['graphql']
}) => {
  const type = id.split('_')[0]

  let query = ``
  const variables: Record<string, any> = {
    id,
  }

  switch (type) {
    case 'I': {
      query = `
query ($id: ID!) {
  node(id: $id){
    ... on Issue {
      id
      url
      author {
        login
        avatarUrl
        url
        ... on Node {
          id
        }
      }
        
      title
      number
      
      closed
      closedAt
      state
      stateReason
      assignees(first: 50){
        nodes{
          login
          avatarUrl
          url
          ... on Node {
            id
          }
        }
      }
      labels(first: 50){
        nodes{
          id
          url
          name
          color
          description
        }
      }
      reactionGroups {
        createdAt
        content
        reactors(first: 0){
          totalCount
        }
      }
      authorAssociation
      locked
      isPinned
      
      createdAt
      updatedAt
    }
  }
}`

      break
    }

    case 'IC': {
      query = `
query ($id: ID!) {
  node(id: $id){
    ... on IssueComment {
      id
      url
      issue{
        id
      }
      author {
        login
        url
        avatarUrl
        ... on Node {
          id
        }
      }
      authorAssociation
      reactionGroups {
        createdAt
        content
        reactors(first: 0) {
          totalCount
        }
      }
      createdAt
      updatedAt
    }
  }
}`

      break
    }

    case 'PR': {
      query = `
query ($id: ID!) {
  node(id: $id){
    ... on PullRequest {
      id
      url
      author {
        login
        avatarUrl
        url
        ... on Node {
          id
        }
      }
      title
      number
      isDraft 
      closed
      locked
      closedAt
      mergedAt
      authorAssociation
      mergedBy {
        login
        avatarUrl
        url
        ... on Node {
          id
        }
      }
      headRef {
        name
        repository {
          id
          name
          owner {
            login
          }
        }
      }
      baseRef {
        name
        repository {
          id
          name
          owner {
            login
          }
        }
      }
      state
      assignees(first: 50) {
        nodes {
          login
          avatarUrl
          url
          ... on Node {
            id
          }
        }
      }
      labels(first: 50) {
        nodes {
          id
          url
          name
          color
          description
        }
      }
      reactionGroups {
        createdAt
        content
        reactors(first: 0) {
          totalCount
        }
      }
      merged
      mergeable
      totalCommentsCount
      commits(first: 0) {
        totalCount
      }
      additions
      deletions
      changedFiles
      maintainerCanModify
      createdAt
      updatedAt
    }
  }
}`

      break
    }

    case 'PRRT': {
      query = `
query ($id: ID!) {
  node(id: $id){
    ... on PullRequestReviewThread {
      id
      diffSide
      isResolved
      isOutdated
      subjectType
      startLine
      startDiffSide
      originalLine
      originalStartLine
      line
      path
      pullRequest {
        id
        url
      }
      comments(first: 1){
        nodes{
          pullRequestReview{
            url
            submittedAt
            createdAt
            updatedAt
            author{
              login
              url
              avatarUrl
              ... on Node {
                id
              }
            }
          }
        }
      }
    }
  }
}`

      break
    }

    case 'PRRC': {
      query = `
      query ($id: ID!) {
  node(id: $id){
    ... on PullRequestReviewComment {
      id
      url
      author {
        login
        url
        avatarUrl
      }
      diffHunk
      path
      authorAssociation
      replyTo {
        id
        url
      }
      subjectType
      outdated 
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
      reactionGroups {
        createdAt
        content
        reactors(first: 0) {
          totalCount
        }
      }
      createdAt
      updatedAt
    }
  }
}`

      break
    }
  }

  const { node } = await client<{ node: T }>(query, {
    ...variables,
  })

  return node
}

export type FetchNodeResIssue = {
  id: string
  url: string
  author: {
    id: string
    login: string
    avatarUrl: string
    url: string
  }

  title: string
  number: number

  closed: boolean
  closedAt: string | null
  state: string
  stateReason: string
  assignees: {
    nodes: {
      id: string
      login: string
      avatarUrl: string
      url: string
    }[]
  }
  labels: {
    nodes: {
      id: string
      url: string
      name: string
      color: string
      description: string
    }[]
  }
  reactionGroups: {
    content: string
    reactors: {
      totalCount: number
    }
  }[]
  authorAssociation: string
  locked: boolean
  isPinned: boolean

  createdAt: string
  updatedAt: string
}

export type FetchNodeResPullRequest = {
  id: string
  url: string
  author: {
    id: string
    login: string
    avatarUrl: string
    url: string
  }
  title: string
  number: number
  isDraft: boolean
  closed: boolean
  locked: boolean
  closedAt: string | null
  mergedAt: string | null
  authorAssociation: string
  mergedBy: {
    id: string
    login: string
    avatarUrl: string
    url: string
  }
  headRef: {
    name: string
    repository: {
      id: string
      name: string
      owner: {
        login: string
      }
    }
  }
  baseRef: {
    name: string
    repository: {
      id: string
      name: string
      owner: {
        login: string
      }
    }
  }
  state: string
  assignees: {
    nodes: {
      id: string
      login: string
      avatarUrl: string
      url: string
    }[]
  }
  labels: {
    nodes: {
      id: string
      url: string
      name: string
      color: string
      description: string
    }[]
  }
  reactionGroups: {
    content: string
    reactors: {
      totalCount: number
    }
  }[]
  merged: boolean
  mergeable: string
  commits: {
    totalCount: number
  }
  additions: number
  deletions: number
  changedFiles: number
  totalCommentsCount: number
  maintainerCanModify: boolean
  createdAt: string
  updatedAt: string
}

export type FetchNodeResPullRequestReviewThread = {
  id: string
  diffSide: string
  isResolved: boolean
  isOutdated: boolean
  subjectType: string
  startLine: number
  startDiffSide: string
  originalLine: number
  originalStartLine: number
  line: number
  path: string
  pullRequest: {
    id: string
    url: string
  }
  comments: {
    nodes: {
      pullRequestReview: {
        url: string
        submittedAt: string
        createdAt: string
        updatedAt: string

        author: {
          id: string
          login: string
          url: string
          avatarUrl: string
        }
      }
    }[]
  }
}

export type FetchNodeResPullRequestReviewComment = {
  id: string
  url: string
  author: {
    id: string
    login: string
    url: string
    avatarUrl: string
  }
  diffHunk: string
  path: string
  authorAssociation: string
  replyTo: {
    id: string
    url: string
  }
  subjectType: string
  outdated: boolean
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
  reactionGroups: {
    content: string
    reactors: {
      totalCount: number
    }
  }[]
  createdAt: string
  updatedAt: string
}

export type FetchNodeResIssueComment = {
  id: string
  url: string
  issue: {
    id: string
  }
  author: {
    id: string
    login: string
    url: string
    avatarUrl: string
  }
  reactionGroups: {
    content: string
    reactors: {
      totalCount: number
    }
  }[]
  authorAssociation: string
  createdAt: string
  updatedAt: string
}
