import { TokenStore } from './TokenStore'
import { Logger } from '../utils/Logger'
import { AppError } from '../utils/ErrorHandler'

export interface RingCentralConfig {
  clientId: string
  clientSecret: string
  serverUrl: string
}

export class RingCentralClient {
  private config: RingCentralConfig

  constructor(config: RingCentralConfig) {
    this.config = config
  }

  private getBasicAuthHeader(): string {
    const creds = `${this.config.clientId}:${this.config.clientSecret}`
    return `Basic ${Buffer.from(creds).toString('base64')}`
  }

  public async exchangeCodeForToken(code: string, codeVerifier: string, redirectUri: string) {
    const url = `${this.config.serverUrl.replace(/\/$/, '')}/restapi/oauth/token`
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.getBasicAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new AppError(`Token exchange failed: ${errText}`, 'OAUTH_EXCHANGE_ERROR', response.status)
    }

    const data = await response.json()
    const expiresAt = Date.now() + (data.expires_in * 1000)

    const tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      tokenType: data.token_type || 'Bearer',
      scope: data.scope || ''
    }

    await TokenStore.saveTokens(tokens)
    return tokens
  }

  public async refreshAccessToken() {
    const tokens = await TokenStore.getTokens()
    if (!tokens || !tokens.refreshToken) {
      throw new AppError('No refresh token available', 'NO_REFRESH_TOKEN')
    }

    const url = `${this.config.serverUrl.replace(/\/$/, '')}/restapi/oauth/token`
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.getBasicAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    })

    if (!response.ok) {
      await TokenStore.clearTokens()
      throw new AppError('Token refresh failed. Please login again.', 'REFRESH_FAILED', response.status)
    }

    const data = await response.json()
    const expiresAt = Date.now() + (data.expires_in * 1000)

    const updated = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || tokens.refreshToken,
      expiresAt,
      tokenType: data.token_type || 'Bearer',
      scope: data.scope || tokens.scope
    }

    await TokenStore.saveTokens(updated)
    Logger.info('Tokens successfully refreshed')
    return updated
  }

  public async fetchApi(endpoint: string, options: RequestInit = {}): Promise<unknown> {
    let tokens = await TokenStore.getTokens()
    if (!tokens) {
      throw new AppError('User not authenticated', 'UNAUTHENTICATED')
    }

    // Auto-refresh token if expiring within 60 seconds
    if (Date.now() >= tokens.expiresAt - 60000) {
      tokens = await this.refreshAccessToken()
    }

    const url = `${this.config.serverUrl.replace(/\/$/, '')}/restapi/v1.0/${endpoint.replace(/^\//, '')}`
    const headers = {
      'Authorization': `Bearer ${tokens.accessToken}`,
      'Accept': 'application/json',
      ...(options.headers || {})
    }

    const response = await fetch(url, { ...options, headers })

    if (response.status === 401) {
      // Try refresh once on 401
      tokens = await this.refreshAccessToken()
      const retryHeaders = {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Accept': 'application/json',
        ...(options.headers || {})
      }
      const retryResponse = await fetch(url, { ...options, headers: retryHeaders })
      if (!retryResponse.ok) {
        throw new AppError(`RingCentral API Error ${retryResponse.status}: ${await retryResponse.text()}`, 'API_ERROR', retryResponse.status)
      }
      return retryResponse.json()
    }

    if (!response.ok) {
      throw new AppError(`RingCentral API Error ${response.status}: ${await response.text()}`, 'API_ERROR', response.status)
    }

    return response.json()
  }
}
