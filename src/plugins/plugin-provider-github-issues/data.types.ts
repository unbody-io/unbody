export const GithubIssuesEntities = {
  Issue: 'issue' as 'issue',
  IssueComment: 'issue_comment' as 'issue_comment',
  PullRequest: 'pull_request' as 'pull_request',
  PullRequestReviewThread:
    'pull_request_review_thread' as 'pull_request_review_thread',
  PullRequestReviewComment:
    'pull_request_review_comment' as 'pull_request_review_comment',
}

export type GithubIssuesEntity =
  (typeof GithubIssuesEntities)[keyof typeof GithubIssuesEntities]

export type GithubIssueLabelData = {
  id: string
  url: string
  name: string
  color: string
}

export type GithubIssueReactionsData = {
  key: string
  total: number
}[]

export type GithubUserData = {
  id: string
  url: string
  login: string
  avatarUrl: string
}

export type GithubCommentMetadataBase = {
  id: string
  url: string
  author: GithubUserData
  authorAssociation: string
  reactions: GithubIssueReactionsData

  threadId: string // id of the issue, pull request or review

  diffHunk?: string | null
  refPath?: string | null
  inReplyToId?: string | null
  inReplyToUrl?: string | null
  subjectType?: string | null
  outdated?: boolean

  modifiedAt: string
  createdAt: string
}

export type GithubIssueCommentMetadata = GithubCommentMetadataBase & {
  type: 'issue_comment'
}

export type GithubPullRequestCommentMetadata = GithubCommentMetadataBase & {
  type: 'issue_comment'
}

export type GithubPullRequestReviewCommentMetadata =
  GithubCommentMetadataBase & {
    type: 'pull_request_review_comment'
  }

export type GithubCommentMetadata =
  | GithubIssueCommentMetadata
  | GithubPullRequestCommentMetadata
  | GithubPullRequestReviewCommentMetadata

export type GithubThreadMetadataBase = {
  id: string
  url: string
  author: GithubUserData

  createdAt: string
  modifiedAt: string
}

export type GithubIssueThreadMetadata = GithubThreadMetadataBase & {
  title: string
  number: number

  state: string
  stateReason: string | null
  assignees: GithubUserData[]
  labels: GithubIssueLabelData[]
  reactions: GithubIssueReactionsData
  authorAssociation: string
  locked: boolean
  pinned: boolean

  closedAt: string | null

  type: 'issue'
}

export type GithubPullRequestThreadMetadata = GithubThreadMetadataBase & {
  title: string
  number: number

  state: string
  locked: boolean
  draft: boolean
  mergeCommitSha?: string | null
  assignees: GithubUserData[]
  requestedReviewers: GithubUserData[]
  labels: GithubIssueLabelData[]
  reactions: GithubIssueReactionsData

  head: {
    name: string
    repo: {
      id: string
      name: string
      owner: string
    }
  }

  base: {
    name: string
    repo: {
      id: string
      name: string
      owner: string
    }
  }

  authorAssociation: string
  activeLockReason?: string | null
  merged?: boolean
  mergeable: string
  mergedBy?: GithubUserData | null
  totalCommentsCount: number
  additions: number
  deletions: number
  changedFiles: number

  closedAt?: string | null
  mergedAt?: string | null

  type: 'pull_request'
}

export type GithubPullRequestReviewThreadMetadata = GithubThreadMetadataBase & {
  diffSide: string
  isResolved: boolean
  isOutdated: boolean
  subjectType: string
  startLine: number
  startDiffSide: string
  originalLine: number
  originalStartLine: number
  line: number
  refPath: string

  threadId: string // pull request thread id = pull request id

  submittedAt: string

  type: 'pull_request_review'
}

export type GithubThreadMetadata =
  | GithubIssueThreadMetadata
  | GithubPullRequestThreadMetadata
  | GithubPullRequestReviewThreadMetadata
