import {
  ProviderContextSourceData,
  ProviderPluginContext,
} from '../../lib/plugins-common/provider'
import { GithubIssuesEntities } from './data.types'

export type ClientSecret = {
  appId: string
  privateKey: string
  clientId: string
  clientSecret: string
  redirectUrl?: string
}

export type Config = {
  clientSecret: ClientSecret
}

export type SourceEntrypoint = {
  id: number // repository id
  installationId: number

  repo: string
  owner: string
}

export type SourceCredentials = {
  type: string
  token: string
  tokenType: string
  clientType: string
}

export type SourceState = {
  head?: string
  lastEventTimestamp?: string | null
}

export type SourceData = ProviderContextSourceData<
  SourceEntrypoint,
  SourceCredentials,
  SourceState
>

export type Context = ProviderPluginContext<SourceData>

export type Change = {
  id: string
  timestamp: number
} & (
  | {
      id: string // payload.issue.node_id
      entity: typeof GithubIssuesEntities.Issue
      action:
        | 'assigned'
        | 'closed'
        | 'deleted'
        | 'demilestoned'
        | 'edited'
        | 'labeled'
        | 'locked'
        | 'milestoned'
        | 'opened'
        | 'pinned'
        | 'reopened'
        | 'transferred'
        | 'unassigned'
        | 'unlabeled'
        | 'unlocked'
        | 'unpinned'
    }
  | {
      id: string // payload.comment.node_id
      entity: typeof GithubIssuesEntities.IssueComment
      action: 'created' | 'deleted' | 'edited'

      issueId: string // payload.issue.node_id
    }
  | {
      id: string // payload.pull_request.node_id
      entity: typeof GithubIssuesEntities.PullRequest
      action:
        | 'assigned'
        | 'auto_merge_disabled'
        | 'auto_merge_enabled'
        | 'closed'
        | 'converted_to_draft'
        | 'demilestoned'
        | 'dequeued'
        | 'edited'
        | 'enqueued'
        | 'labeled'
        | 'locked'
        | 'milestoned'
        | 'opened'
        | 'ready_for_review'
        | 'reopened'
        | 'review_request_removed'
        | 'review_requested'
        | 'synchronize'
        | 'unassigned'
        | 'unlabeled'
        | 'unlocked'
    }
  | {
      id: string // payload.comment.node_id

      entity: typeof GithubIssuesEntities.PullRequestReviewComment
      action: 'created' | 'deleted' | 'edited'

      pullRequestId: string // payload.pull_request.node_id
    }
  | {
      id: string // thread.node_id

      entity: typeof GithubIssuesEntities.PullRequestReviewThread
      action: 'resolved' | 'unresolved'

      pullRequestId: string // payload.pull_request.node_id
    }
)

export type EventObj = {
  sourceId: string
  payload: Change
  timestamp: number
}

export type EventDocument = {
  _id: string
} & EventObj
