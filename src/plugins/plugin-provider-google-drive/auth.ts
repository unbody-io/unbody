import type { GenerateAuthUrlOpts, OAuth2Client } from 'google-auth-library'
import { google } from 'googleapis'
import { ClientSecret, SourceCredentials } from './plugin.types'

export const getOAuth2Client = (
  clientSecret: ClientSecret,
  credentials?: SourceCredentials | null,
) => {
  const auth = new google.auth.OAuth2({
    clientId: clientSecret.web.client_id,
    clientSecret: clientSecret.web.client_secret,
    redirectUri: clientSecret.web.redirect_uris?.[0] ?? '',
  })

  credentials &&
    auth.setCredentials({
      refresh_token: credentials.refreshToken,
    })

  return auth
}

export class GoogleOAuth {
  client: OAuth2Client
  defaultAuthUrlOptions?: GenerateAuthUrlOpts

  constructor(
    clientSecret: ClientSecret,
    credentials?: SourceCredentials | null,
    options?: { defaultAuthUrlOptions?: GenerateAuthUrlOpts },
  ) {
    this.client = getOAuth2Client(clientSecret, credentials)

    if (options?.defaultAuthUrlOptions) {
      this.defaultAuthUrlOptions = options.defaultAuthUrlOptions
    }
  }

  generateAuthUrl = async (params?: GenerateAuthUrlOpts) => {
    const opts = Object.assign({}, this.defaultAuthUrlOptions, params)
    return this.client.generateAuthUrl(opts)
  }

  getToken = (params: string | { code: string; redirectUri?: string }) => {
    if (typeof params === 'string')
      return this.client.getToken({
        code: params,
      })

    return this.client.getToken({
      code: params.code,
      redirect_uri: params.redirectUri,
    })
  }

  getTokenInfo = (params: { token: string }) =>
    this.client.getTokenInfo(params.token)
}
