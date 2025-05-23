import { createAppAuth } from '@octokit/auth-app'
import * as crypto from 'crypto'
import { ObjectId } from 'mongodb'
import { App, Octokit, RequestError } from 'octokit'
import { settle } from 'src/lib/core-utils'
import * as uuid from 'uuid'
import { z } from 'zod'
import {
  PluginContext,
  PluginLifecycle,
  WebhookConsumer,
} from '../../lib/plugins-common'
import {
  ConnectParams,
  ConnectResult,
  EntrypointListOption,
  GetRecordMetadataParams,
  GetRecordMetadataResult,
  GetRecordParams,
  GetRecordResult,
  HandleEntrypointUpdateParams,
  HandleEntryPointUpdateResult,
  HandleSourceUpdateParams,
  HandleSourceUpdateResult,
  IndexingEvent,
  InitSourceParams,
  InitSourceResult,
  ListEntrypointOptionsParams,
  ListEntrypointOptionsResult,
  ProcessRecordParams,
  ProcessRecordResult,
  ProviderPlugin,
  RegisterObserverParams,
  RegisterObserverResult,
  UnregisterObserverParams,
  UnregisterObserverResult,
  ValidateEntrypointParams,
  ValidateEntrypointResult,
  VerifyConnectionParams,
  VerifyConnectionResult,
} from '../../lib/plugins-common/provider'
import {
  Webhook,
  WebhookEvent,
} from '../../lib/plugins-common/resources/webhook-registry'
import { GithubIssuesEntities, GithubIssuesEntity } from './data.types'
import {
  Change,
  Config,
  Context,
  EventDocument,
  SourceCredentials,
  SourceData,
  SourceEntrypoint,
  SourceState,
} from './plugin.types'
import { fetchNode } from './utils/fetchNode.util'
import {
  fetchNodeContent,
  FetchNodeContentResIssueComment,
} from './utils/fetchNodeContent.util'
import { fetchRepoRelatedNodes } from './utils/fetchRepoNodes.util'
import { generateNodeMetadata } from './utils/generateMetadata.util'
import {
  parseIssueBody,
  processIssueContent,
} from './utils/processIssueContent.utils'

const configSchema = z
  .object({
    clientSecret: z
      .object({
        appId: z.string(),
        clientId: z.string(),
        privateKey: z.string(),
        clientSecret: z.string(),
      })
      .required(),

    redirectUrl: z.string().optional(),
  })
  .required()

export class GithubIssuesProvider
  implements
    PluginLifecycle<PluginContext, Config>,
    ProviderPlugin<Context>,
    WebhookConsumer<Context>
{
  config!: Config
  private app!: App

  schemas: ProviderPlugin['schemas'] = {
    config: configSchema,
  }

  constructor() {}

  init = async () => {}

  initialize = async (config: Config) => {
    this.config = config
    this.app = new App({
      appId: this.config.clientSecret.appId,
      privateKey: this.config.clientSecret.privateKey,
      oauth: {
        clientId: this.config.clientSecret.clientId,
        clientSecret: this.config.clientSecret.clientSecret,
      },
    })
  }

  bootstrap = async (ctx: PluginContext) => {
    const database = await ctx.getResource('database')
    const eventsCollection = await database.createCollection('events', {})

    await eventsCollection.createIndex({
      sourceId: 1,
    })

    await eventsCollection.createIndex(
      {
        timestamp: 1,
      },
      {
        expireAfterSeconds: 60 * 60 * 24 * 14,
      },
    )
  }

  destroy = async (ctx: PluginContext) => {}

  listEntrypointOptions = async (
    ctx: Context,
    params: ListEntrypointOptionsParams,
  ): Promise<ListEntrypointOptionsResult> => {
    const client = await this._getClient(ctx.source)

    const options: EntrypointListOption[] = []

    if (!params.parent) {
      let page = 0

      while (true) {
        page++

        const {
          data: { installations },
        } = await client.rest.apps.listInstallationsForAuthenticatedUser({
          page,
          per_page: 100,
        })

        if (installations.length === 0) break

        options.push(
          ...installations.map(
            (installation) =>
              ({
                id: installation.id.toString(),
                name:
                  (installation.account as any).login ||
                  (installation.account as any).slug,
                selectable: false,
                expandable: true,
                description: '',
                typeLabel: installation.target_type,
                typeDescription: installation.target_type,
                url: installation.html_url,
                extra: {
                  installationId: installation.id,
                  accountId: installation.account?.id,
                },
              }) as EntrypointListOption,
          ),
        )
      }
    } else {
      const { installationId, accountId } = params.parent.extra || {}

      if (!installationId || !accountId) throw new Error('Invalid parent')

      let page = 0

      while (true) {
        page++

        const {
          data: { repositories },
        } = await client.rest.apps.listInstallationReposForAuthenticatedUser({
          page,
          per_page: 100,
          installation_id: parseInt(installationId, 10),
        })

        if (repositories.length === 0) break

        options.push(
          ...repositories.map(
            (repository) =>
              ({
                id: repository.id.toString(),
                name: repository.name,
                selectable: true,
                expandable: false,
                description: '',
                typeLabel: 'Repository',
                typeDescription: 'GitHub Repository',
                url: repository.html_url,
                extra: {
                  accountId,
                  installationId,
                  repo: repository.name,
                  owner: repository.owner.login,
                },
              }) as EntrypointListOption,
          ),
        )
      }
    }

    return {
      type: 'list',
      options,
    }
  }

  handleEntrypointUpdate = async (
    ctx: Context,
    params: HandleEntrypointUpdateParams,
  ): Promise<HandleEntryPointUpdateResult<SourceEntrypoint>> => {
    const { entrypoint } = params

    if (
      !entrypoint ||
      entrypoint.type !== 'option' ||
      !entrypoint.option?.id ||
      !entrypoint.option?.extra?.installationId ||
      !entrypoint.option?.extra?.accountId
    )
      throw new ProviderPlugin.Exceptions.InvalidEntrypoint(
        'Invalid entrypoint',
      )

    const client = await this._getClient(ctx.source)

    const handleError = (err: Error) => {
      if (err instanceof RequestError) {
        if (err.status === 404)
          throw new ProviderPlugin.Exceptions.EntrypointAccessDenied(
            err.message,
          )
      }

      throw err
    }

    {
      const [_res, err] = await settle(() =>
        this.app.octokit.rest.apps.getRepoInstallation({
          owner: entrypoint.option.extra?.owner,
          repo: entrypoint.option.extra?.repo,
        }),
      )

      if (err) handleError(err)

      const res = _res as any

      if (
        res?.data?.id !== parseInt(entrypoint.option.extra.installationId, 10)
      )
        throw new ProviderPlugin.Exceptions.InvalidEntrypoint(
          'Invalid installation ID',
        )

      if (res?.data?.app_id !== parseInt(this.config.clientSecret.appId, 10))
        throw new ProviderPlugin.Exceptions.InvalidEntrypoint('Invalid App ID')
    }

    const [_res, err] = await settle(() =>
      client.rest.repos.get({
        owner: entrypoint.option.extra?.owner,
        repo: entrypoint.option.extra?.repo,
      }),
    )

    const res = _res as any

    if (err) handleError(err)

    if (res?.data?.id !== parseInt(entrypoint.option.id, 10))
      throw new ProviderPlugin.Exceptions.InvalidEntrypoint(
        'Invalid repository ID',
      )

    return {
      entrypoint: {
        id: parseInt(entrypoint.option.id, 10),
        repo: entrypoint.option.extra.repo,
        owner: entrypoint.option.extra.owner,
        installationId: parseInt(entrypoint.option.extra.installationId, 10),
      },
    }
  }

  validateEntrypoint = async (
    ctx: Context,
    params: ValidateEntrypointParams<SourceEntrypoint | undefined>,
  ): Promise<ValidateEntrypointResult<SourceEntrypoint>> => {
    const { entrypoint } = ctx.source

    if (!entrypoint || !entrypoint.id || !entrypoint.installationId)
      throw new ProviderPlugin.Exceptions.InvalidEntrypoint(
        'Invalid entrypoint',
      )

    const client = await this._getClient(ctx.source)

    const handleError = (err: Error) => {
      if (err instanceof RequestError) {
        if (err.status === 404)
          throw new ProviderPlugin.Exceptions.EntrypointAccessDenied(
            err.message,
          )
      }

      throw err
    }

    {
      const [_res, err] = await settle(() =>
        this.app.octokit.rest.apps.getRepoInstallation({
          owner: entrypoint.owner,
          repo: entrypoint.repo,
        }),
      )

      if (err) handleError(err)

      const res = _res as any

      if (res?.data?.id !== entrypoint.installationId)
        throw new ProviderPlugin.Exceptions.InvalidEntrypoint(
          'Invalid installation ID',
        )

      if (res?.data?.app_id !== parseInt(this.config.clientSecret.appId, 10))
        throw new ProviderPlugin.Exceptions.InvalidEntrypoint('Invalid App ID')
    }

    const [_res, err] = await settle(() =>
      client.rest.repos.get({
        owner: entrypoint.owner,
        repo: entrypoint.repo,
      }),
    )

    const res = _res as any

    if (err) handleError(err)

    if (res?.data?.id !== entrypoint.id)
      throw new ProviderPlugin.Exceptions.InvalidEntrypoint(
        'Invalid repository ID',
      )

    return {
      entrypoint,
    }
  }

  connect = async (
    ctx: Context,
    params: ConnectParams,
  ): Promise<ConnectResult> => {
    const { url } = this.app.oauth.getWebFlowAuthorizationUrl({
      login: ' ',
      ...(params.state
        ? {
            state: new URLSearchParams(params.state || {}).toString(),
          }
        : {}),
      redirectUrl: params.redirectUrl,
    })

    return {
      redirectUrl: url,
    }
  }

  verifyConnection = async (
    ctx: Context,
    params: VerifyConnectionParams,
  ): Promise<VerifyConnectionResult<SourceCredentials>> => {
    if (params.payload) {
      const [res, err] = await settle(() =>
        this.app.oauth.createToken({
          code: params.payload!.code,
          state: params.payload!.state,
          redirectUrl: params.payload!.redirectUrl,
        }),
      )

      if (err) {
        const error = err as RequestError
        if (
          error.response?.status &&
          error.response?.status >= 400 &&
          error.response?.status < 500
        )
          throw new ProviderPlugin.Exceptions.InvalidConnection(error.message)

        throw err
      }

      const { authentication } = res

      return {
        isValid: true,
        credentials: {
          type: authentication.type,
          token: authentication.token,
          tokenType: authentication.tokenType,
          clientType: authentication.clientType,
        },
      }
    }

    if (ctx.source.credentials?.token) {
      const client = await this._getClient(ctx.source)
      const [res, err] = await settle(() =>
        client.rest.apps.listInstallations({}),
      )
      if (err) {
        const error = err as RequestError
        if (
          error.response?.status &&
          error.response?.status >= 400 &&
          error.response?.status < 500
        )
          return {
            isValid: false,
          }

        throw err
      }

      return {
        isValid: true,
      }
    }

    return {
      isValid: false,
    }
  }

  initSource = async (
    ctx: Context,
    params: InitSourceParams,
  ): Promise<InitSourceResult<SourceState>> => {
    const installation = await this._getInstallation(ctx.source)
    const { issues, pullRequests } = await fetchRepoRelatedNodes({
      repo: ctx.source.entrypoint.repo,
      owner: ctx.source.entrypoint.owner,
      client: installation.graphql,
    })

    await this.getRecord(ctx, { recordId: 'IC_kwDOLSIwQc6f8CgY' })

    const events: IndexingEvent[] = []

    for (const issue of issues) {
      events.push({
        recordType: '',
        recordId: issue.id,
        eventName: 'created',
      })

      for (const comment of issue.comments) {
        events.push({
          recordId: comment.id,
          eventName: 'created',
          recordType: '',
          dependsOn: [issue.id],
        })
      }
    }

    for (const pullRequest of pullRequests) {
      events.push({
        recordType: '',
        recordId: pullRequest.id,
        eventName: 'created',
      })

      for (const comment of pullRequest.comments) {
        events.push({
          recordId: comment.id,
          eventName: 'created',
          recordType: '',
          dependsOn: [pullRequest.id],
        })
      }

      for (const reviewThread of pullRequest.reviewThreads) {
        events.push({
          recordId: reviewThread.id,
          eventName: 'created',
          recordType: '',
          dependsOn: [pullRequest.id],
        })

        for (const comments of reviewThread.comments) {
          events.push({
            recordId: comments.id,
            eventName: 'created',
            recordType: '',
            dependsOn: [reviewThread.id],
          })
        }
      }
    }

    return {
      status: 'ready',
      events: events,
      sourceState: {
        head: null as any,
        lastEventTimestamp: new Date().toJSON(),
      },
    }
  }

  handleSourceUpdate = async (
    ctx: Context,
    params: HandleSourceUpdateParams,
  ): Promise<HandleSourceUpdateResult<SourceState>> => {
    const installation = await this._getInstallation(ctx.source)

    const { head, lastEventTimestamp } = ctx.source.state
    const eventsCollection = await this._eventsCollection(ctx)

    const changes: EventDocument[] = []
    let cursor: ObjectId | null = null
    {
      while (true) {
        const res = await eventsCollection
          .find(
            {
              sourceId: ctx.source.id,
              timestamp: {
                $gt: +new Date(lastEventTimestamp || 0),
              },
              ...(cursor
                ? {
                    _id: {
                      $gt: cursor,
                    },
                  }
                : {}),
            },
            {
              sort: {
                _id: 'asc',
              },
              limit: 100,
            },
          )
          .toArray()

        const _res = res as any
        cursor = _res[_res.length - 1]?._id

        changes.push(
          ...res.map(
            (r) =>
              ({
                _id: r._id.toHexString(),
                sourceId: r.id,
                payload: r.payload,
                timestamp: r.timestamp,
              }) as EventDocument,
          ),
        )

        if (res.length === 0) break
      }
    }

    const states: Record<
      string,
      {
        deleted?: boolean
        patched?: boolean
        updated?: boolean
        created?: boolean
        entity: GithubIssuesEntity
        threadId?: string
      }
    > = {}
    let lastUpdate =
      changes[0]?.timestamp ||
      (lastEventTimestamp ? +new Date(lastEventTimestamp) : undefined)

    for (const change of changes) {
      const {
        payload: { action, entity, id },
      } = change
      if (!states[id]) {
        states[id] = {
          entity,
        }
      }

      if (!lastUpdate || change.timestamp > lastUpdate)
        lastUpdate = change.timestamp

      const state = states[id]
      switch (entity) {
        case 'issue': {
          if (action === 'opened' || action === 'edited') state.updated = true
          else if (action === 'deleted') state.deleted = true
          else state.patched = true

          break
        }

        case 'pull_request': {
          if (action === 'opened' || action === 'edited') state.updated = true
          else state.patched = true

          break
        }

        case 'issue_comment': {
          if (action === 'created') state.created = true
          else if (action === 'deleted') state.deleted = true
          else if (action === 'edited') state.updated = true
          else state.patched = true

          break
        }

        case 'pull_request_review_thread': {
          state.patched = true

          break
        }

        case 'pull_request_review_comment': {
          if (action === 'created') state.created = true
          else if (action === 'edited') state.updated = true
          else if (action === 'deleted') state.deleted = true
          else state.patched = true

          break
        }
      }
    }

    const events: IndexingEvent[] = []

    const entries = Object.entries(states)
    for (const [id, state] of entries) {
      if (state.deleted) {
        events.push({
          recordType: '',
          recordId: id,
          eventName: 'deleted',
          dependsOn: [],
        })
      } else {
        const metadata = await generateNodeMetadata(
          await fetchNode({
            id,
            client: installation.graphql,
          }),
          installation.graphql,
        )

        if (
          metadata.type === 'pull_request_review' ||
          metadata.type === 'issue_comment' ||
          metadata.type === 'pull_request_review_comment'
        )
          state.threadId = metadata.threadId

        events.push({
          metadata,
          recordType: '',
          eventName: state.created
            ? 'created'
            : state.updated
              ? 'updated'
              : 'patched',
          recordId: id,
          dependsOn: state.threadId ? [state.threadId] : [],
        })
      }
    }

    return {
      events,
      status: 'ready',
      sourceState: {
        head: cursor ? cursor.toHexString() : head,
        lastEventTimestamp: lastUpdate
          ? new Date(lastUpdate).toJSON()
          : lastEventTimestamp,
      },
    }
  }

  getRecordMetadata = async (
    ctx: Context,
    params: GetRecordMetadataParams,
  ): Promise<GetRecordMetadataResult> => {
    const installation = await this._getInstallation(ctx.source)

    const node = await fetchNode({
      id: params.recordId,
      client: installation.graphql,
    })

    const metadata = await generateNodeMetadata(node, installation.graphql)

    return {
      metadata,
    }
  }

  getRecord = async (
    ctx: Context,
    params: GetRecordParams,
  ): Promise<GetRecordResult> => {
    const installation = await this._getInstallation(ctx.source)

    const node = await fetchNode({
      client: installation.graphql,
      id: params.recordId,
    })
    const metadata = await generateNodeMetadata(node, installation.graphql)

    const nodeContent = await fetchNodeContent({
      id: params.recordId,
      client: installation.graphql,
    })

    const content = nodeContent as FetchNodeContentResIssueComment

    const { html, attachments } = content.bodyHTML
      ? parseIssueBody(content.bodyHTML)
      : { html: '', attachments: [] }

    return {
      result: {
        metadata,
        content: {
          ...content,
          bodyHTML: html,
        },
        attachments: attachments.map((attachment) => ({
          id: attachment.id,
          contentType: 'image/png',
          filename: attachment.id + '.png',
          file: {
            isExternal: true,
            url: attachment.url,
          },
        })),
        recordType: '',
        type: 'json',
      },
      status: 'ready',
    }
  }

  processRecord = async (
    ctx: Context,
    params: ProcessRecordParams,
  ): Promise<ProcessRecordResult> => {
    if (params.metadata.type !== GithubIssuesEntities.PullRequestReviewThread) {
      const { blocks, html } = processIssueContent(
        params.content.bodyHTML,
        params.attachments.processed,
      )

      return {
        record: {
          ...params.metadata,
          ...params.content,
          bodyHTML: html,
          blocks: blocks,
        },
      }
    }

    return {
      record: {
        ...params.metadata,
        ...params.content,
      },
    }
  }

  registerObserver = async (
    ctx: Context,
    params: RegisterObserverParams,
  ): Promise<RegisterObserverResult> => {
    const installation = await this._getInstallation(ctx.source)

    const webhookRegistry = await ctx.getResource('webhookRegistry')
    const webhook = await webhookRegistry.create({
      scope: 'source',
      key: 'repository-webhook',
      description: 'Repository Webhook',
      metadata: {},
    })
    const secret = (await webhookRegistry.getSecret(webhook)).secret

    try {
      const { data: githubWebhook } =
        await installation.rest.repos.createWebhook({
          repo: ctx.source.entrypoint.repo,
          owner: ctx.source.entrypoint.owner,
          events: [
            'issues',
            'pull_request',
            'pull_request_review',
            'pull_request_review_comment',
            'pull_request_review_thread',
          ],
          config: {
            secret,
            url: webhook.url,
            content_type: 'application/json',
          },
        })

      await webhookRegistry.updateById(webhook.id, {
        metadata: {
          webhook: githubWebhook,
          repo: ctx.source.entrypoint.repo,
          owner: ctx.source.entrypoint.owner,
          installationId: ctx.source.entrypoint.installationId,
        },
      })
    } catch (error) {
      await webhookRegistry.deleteById(webhook.id)
      throw error
    }

    return {}
  }

  unregisterObserver = async (
    ctx: Context,
    params: UnregisterObserverParams,
  ): Promise<UnregisterObserverResult> => {
    const webhookRegistry = await ctx.getResource('webhookRegistry')
    const webhook = await webhookRegistry.get('repository-webhook', 'source')
    if (!webhook) return {}
    await webhookRegistry.deleteById(webhook.id)
    return {}
  }

  onWebhookEvent = async (
    ctx: Context,
    webhook: Webhook,
    event: WebhookEvent,
  ) => {
    const webhookRegistry = await ctx.getResource('webhookRegistry')
    const eventsCollection = await this._eventsCollection(ctx)

    if (webhook.scope === 'source') {
      const secret = await webhookRegistry.getSecret(webhook)
      const signature = crypto
        .createHmac('sha256', secret.secret)
        .update(event.rawBody)
        .digest('hex')
      const trusted = Buffer.from(`sha256=${signature}`, 'ascii')
      const untrusted = Buffer.from(
        event.headers['x-hub-signature-256'],
        'ascii',
      )
      if (!crypto.timingSafeEqual(trusted, untrusted)) return

      const payload = JSON.parse(event.rawBody)

      const _event = event.headers['x-github-event']
      const action = payload.action
      const timestamp = +new Date()

      let changeEvent: Change | undefined = undefined

      switch (_event) {
        case 'issues': {
          changeEvent = {
            action,
            entity: GithubIssuesEntities.Issue,
            id: payload.issue.node_id,
            timestamp,
          }

          break
        }

        case 'pull_request': {
          changeEvent = {
            action,
            entity: GithubIssuesEntities.PullRequest,
            id: payload.pull_request.node_id,
            timestamp,
          }

          break
        }
        case 'issue_comment': {
          changeEvent = {
            action,
            entity: GithubIssuesEntities.IssueComment,
            id: payload.comment.node_id,
            issueId: payload.issue.node_id,
            timestamp,
          }

          break
        }
        case 'pull_request_review_comment': {
          changeEvent = {
            action,
            id: payload.comment.node_id,
            entity: GithubIssuesEntities.PullRequestReviewComment,
            pullRequestId: payload.pull_request.node_id,
            timestamp,
          }

          break
        }

        case 'pull_request_review_thread': {
          changeEvent = {
            action,
            id: payload.thread.node_id,
            entity: GithubIssuesEntities.PullRequestReviewThread,
            pullRequestId: payload.pull_request.node_id,
            timestamp,
          }

          break
        }
      }

      if (changeEvent) {
        await eventsCollection.insertOne({
          sourceId: ctx.source.id,
          payload: changeEvent,
          timestamp,
        })

        await ctx.dispatchEvent(
          new ProviderPlugin.Events.SourceUpdated({
            idempotencyKey: uuid.v5(event.timestamp.toJSON(), uuid.v5.URL),
            sourceId: ctx.source.id,
          }),
        )
      }
    }
  }

  private _eventsCollection = async (ctx: Context) => {
    return ctx.getResource('database').then((db) => db.getCollection('events'))
  }

  private _getClient = async (source: SourceData) => {
    return new Octokit({
      auth: source.credentials.token,
    })
  }

  private _getInstallation = async (source: SourceData) => {
    if (!source.credentials?.token)
      throw new ProviderPlugin.Exceptions.InvalidConnection('Invalid token')
    if (!source.entrypoint?.repo || !source.entrypoint?.owner)
      throw new ProviderPlugin.Exceptions.InvalidEntrypoint(
        'Invalid entrypoint',
      )

    return new Octokit({
      auth: {
        appId: this.config.clientSecret.appId,
        privateKey: this.config.clientSecret.privateKey,
        installationId: source.entrypoint.installationId,
      },
      authStrategy: createAppAuth,
    })
  }
}
