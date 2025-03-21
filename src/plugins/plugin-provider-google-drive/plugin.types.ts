import {
  ProviderContextSourceData,
  ProviderPluginContext,
} from '../../lib/plugins-common/provider'

export type ClientSecret = {
  web: {
    client_id: string
    project_id: string
    auth_uri: string
    token_uri: string
    auth_provider_x509_cert_url: string
    client_secret: string
    redirect_uris: string[]
    javascript_origins: string[]
  }
}

export type Config = {
  scopes?: string[]
  redirectUri?: string
  clientSecret: ClientSecret
}

export type SourceEntrypoint = {
  id: string
  name: string
  driveId: string
}

export type SourceCredentials = {
  refreshToken: string
}

export type SourceState = {
  lastEventTimestamp?: string
}

export type SourceData = ProviderContextSourceData<
  SourceEntrypoint,
  SourceCredentials,
  SourceState
>

export type Context = ProviderPluginContext<SourceData>
