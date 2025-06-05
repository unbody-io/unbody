import { Octokit } from 'octokit'

import {
  GithubCommentMetadata,
  GithubIssueCommentMetadata,
  GithubIssueThreadMetadata,
  GithubPullRequestReviewCommentMetadata,
  GithubPullRequestReviewThreadMetadata,
  GithubPullRequestThreadMetadata,
  GithubThreadMetadata,
} from '../data.types'
import {
  FetchNodeResIssue,
  FetchNodeResIssueComment,
  FetchNodeResPullRequest,
  FetchNodeResPullRequestReviewComment,
  FetchNodeResPullRequestReviewThread,
} from './fetchNode.util'
import { findPullRequestReviewCommentThreadId } from './findPullRequestReviewCommentThreadId'

export const generateNodeMetadata = async (
  data:
    | FetchNodeResIssue
    | FetchNodeResIssueComment
    | FetchNodeResPullRequest
    | FetchNodeResPullRequestReviewThread
    | FetchNodeResPullRequestReviewComment,
  client: Octokit['graphql'],
): Promise<GithubCommentMetadata | GithubThreadMetadata> => {
  const id = data.id

  const prefix = id.split('_')[0]

  if (prefix === 'I') {
    const issue = data as FetchNodeResIssue

    const metadata: GithubIssueThreadMetadata = {
      id: issue.id,
      url: issue.url,
      title: issue.title,
      number: issue.number,

      author: issue.author,
      state: issue.state,
      stateReason: issue.stateReason,
      assignees: issue.assignees.nodes,
      authorAssociation: issue.authorAssociation,

      labels: issue.labels.nodes.map((node) => ({
        id: node.id,
        color: node.color,
        name: node.name,
        url: node.url,
      })),

      reactions: issue.reactionGroups.map((group) => ({
        key: group.content,
        total: group.reactors.totalCount,
      })),

      locked: issue.locked,
      pinned: issue.isPinned,
      closedAt: issue.closedAt,
      createdAt: issue.createdAt,
      modifiedAt: issue.updatedAt,

      type: 'issue',
    }

    return metadata
  } else if (prefix === 'PR') {
    const pullRequest = data as FetchNodeResPullRequest

    const metadata: GithubPullRequestThreadMetadata = {
      id: pullRequest.id,
      url: pullRequest.url,
      title: pullRequest.title,
      number: pullRequest.number,

      author: pullRequest.author,
      state: pullRequest.state,
      assignees: pullRequest.assignees.nodes,
      authorAssociation: pullRequest.authorAssociation,
      requestedReviewers: [],

      labels: pullRequest.labels.nodes.map((node) => ({
        id: node.id,
        color: node.color,
        name: node.name,
        url: node.url,
      })),
      reactions: pullRequest.reactionGroups.map((group) => ({
        key: group.content,
        total: group.reactors.totalCount,
      })),

      mergedBy: pullRequest.mergedBy,
      mergeable: pullRequest.mergeable,

      head: {
        name: pullRequest.headRef.name,
        repo: {
          id: pullRequest.headRef.repository.id,
          name: pullRequest.headRef.repository.name,
          owner: pullRequest.headRef.repository.owner.login,
        },
      },

      base: {
        name: pullRequest.baseRef.name,
        repo: {
          id: pullRequest.baseRef.repository.id,
          name: pullRequest.baseRef.repository.name,
          owner: pullRequest.baseRef.repository.owner.login,
        },
      },

      draft: pullRequest.isDraft,
      locked: pullRequest.locked,
      merged: pullRequest.merged,
      additions: pullRequest.additions,
      deletions: pullRequest.deletions,
      changedFiles: pullRequest.changedFiles,
      totalCommentsCount: pullRequest.totalCommentsCount,

      mergedAt: pullRequest.mergedAt,
      closedAt: pullRequest.closedAt,
      createdAt: pullRequest.createdAt,
      modifiedAt: pullRequest.updatedAt,
      type: 'pull_request',
    }

    return metadata
  } else if (prefix === 'IC') {
    const comment = data as FetchNodeResIssueComment

    const metadata: GithubIssueCommentMetadata = {
      id: comment.id,
      url: comment.url,

      author: comment.author,
      authorAssociation: comment.authorAssociation,
      reactions: comment.reactionGroups.map((group) => ({
        key: group.content,
        total: group.reactors.totalCount,
      })),

      threadId: comment.issue.id,
      createdAt: comment.createdAt,
      modifiedAt: comment.updatedAt,
      type: 'issue_comment',
    }

    return metadata
  } else if (prefix === 'PRRT') {
    const thread = data as FetchNodeResPullRequestReviewThread

    const metadata: GithubPullRequestReviewThreadMetadata = {
      id: thread.id,
      url: thread.pullRequest.url,
      author: thread.comments?.nodes[0]?.pullRequestReview?.author || null,
      diffSide: thread.diffSide,
      isResolved: thread.isResolved,
      isOutdated: thread.isOutdated,
      subjectType: thread.subjectType,
      startLine: thread.startLine,
      originalLine: thread.originalLine,
      startDiffSide: thread.startDiffSide,
      originalStartLine: thread.originalStartLine,
      line: thread.line,
      refPath: thread.path,

      threadId: thread.pullRequest.id,

      submittedAt:
        thread.comments?.nodes[0]?.pullRequestReview?.submittedAt || null,
      createdAt:
        thread.comments?.nodes[0]?.pullRequestReview?.createdAt || null,
      modifiedAt:
        thread.comments?.nodes[0]?.pullRequestReview?.updatedAt || null,

      type: 'pull_request_review',
    }

    return metadata
  } else if (prefix === 'PRRC') {
    const comment = data as FetchNodeResPullRequestReviewComment

    const metadata: GithubPullRequestReviewCommentMetadata = {
      id: comment.id,
      url: comment.url,

      author: comment.author,
      authorAssociation: comment.authorAssociation,
      reactions: comment.reactionGroups.map((group) => ({
        key: group.content,
        total: group.reactors.totalCount,
      })),
      diffHunk: comment.diffHunk,
      inReplyToId: comment.replyTo?.id || null,
      inReplyToUrl: comment.replyTo?.url || null,
      outdated: comment.outdated,
      refPath: comment.path,
      subjectType: comment.subjectType,

      threadId:
        (await findPullRequestReviewCommentThreadId({
          id: comment.id,
          client,
        })) || '',
      createdAt: comment.createdAt,
      modifiedAt: comment.updatedAt,
      type: 'pull_request_review_comment',
    }

    return metadata
  }

  throw new Error('generateNodeMetadata: invalid Github node type')
}
