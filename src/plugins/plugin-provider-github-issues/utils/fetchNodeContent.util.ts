import { Octokit } from 'octokit'
import { graphqlUtils } from './graphql.utils'

export const fetchNodeContent = async <T = any>({
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
      title
      body
      bodyHTML
      bodyText 

      comments(first: 100){
        nodes{
          bodyText

          author {
            login
          }
          authorAssociation
        }
      }
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
      body
      bodyHTML
      bodyText 
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
      title
      body
      bodyHTML
      bodyText 
      comments(first: 100){
        nodes{
          bodyText

          author {
            login
          }
          authorAssociation
        }
      }
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

      comments(first: 100){
        nodes {
          body
          bodyHTML
          bodyText

          author {
            login
          }
          authorAssociation
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
      body
      bodyHTML
      bodyText
    }
  }
}`

      break
    }
  }

  const { node } = await graphqlUtils.call(() =>
    client<{ node: T }>(query, {
      ...variables,
    }),
  )

  return node
}

export type FetchNodeContentResIssue = {
  id: string
  title: string

  body: string
  bodyHTML: string
  bodyText: string

  comments: {
    nodes: {
      bodyText: string

      author: {
        login: string
      }
      authorAssociation: string
    }[]
  }
}

export type FetchNodeContentResPullRequest = {
  id: string
  title: string

  body: string
  bodyHTML: string
  bodyText: string

  comments: {
    nodes: {
      bodyText: string

      author: {
        login: string
      }
      authorAssociation: string
    }[]
  }
}

export type FetchNodeContentResPullRequestReviewThread = {
  id: string

  comments: {
    nodes: {
      bodyText: string

      author: {
        login: string
      }
      authorAssociation: string
    }[]
  }
}

export type FetchNodeContentResPullRequestReviewComment = {
  id: string
  body: string
  bodyHTML: string
  bodyText: string
}

export type FetchNodeContentResIssueComment = {
  id: string
  body: string
  bodyHTML: string
  bodyText: string
}
