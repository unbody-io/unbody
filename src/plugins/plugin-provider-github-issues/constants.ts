import { GithubIssuesEntities, GithubIssuesEntity } from './data.types'

export const ENTITY_ID_PREFIX_MAP: Record<string, GithubIssuesEntity> = {
  I: GithubIssuesEntities.Issue,
  IC: GithubIssuesEntities.IssueComment,
  PR: GithubIssuesEntities.PullRequest,
  PRRT: GithubIssuesEntities.PullRequestReviewThread,
  PRRC: GithubIssuesEntities.PullRequestReviewComment,
}
