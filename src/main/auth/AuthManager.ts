import { RingCentralClient } from './RingCentral'
import { OAuth } from './OAuth'
import { CallbackServer } from './CallbackServer'
import { TokenStore } from './TokenStore'
import { Logger } from '../utils/Logger'
import { AppError } from '../utils/ErrorHandler'
import { UserProfile } from '../../types/user'

export class AuthManager {
  private client: RingCentralClient | null = null
  private callbackServer: CallbackServer | null = null
  private codeVerifier: string = ''
  private oauthState: string = ''

  public initialize(config: { clientId?: string; clientSecret?: string; serverUrl?: string }) {
    const serverUrl = config.serverUrl || process.env.RINGCENTRAL_SERVER_URL || 'https://platform.devtest.ringcentral.com'
    const clientId = config.clientId || process.env.RINGCENTRAL_CLIENT_ID || ''
    const clientSecret = config.clientSecret || process.env.RINGCENTRAL_CLIENT_SECRET || ''

    this.client = new RingCentralClient({ clientId, clientSecret, serverUrl })
    Logger.info(`AuthManager initialized for server: ${serverUrl}`)
  }

  public async loginWithJwt(params: { clientId?: string; clientSecret?: string; serverUrl?: string; jwt: string }) {
    this.initialize({
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      serverUrl: params.serverUrl
    })

    if (!this.client) {
      throw new AppError('Failed to initialize RingCentral client', 'CLIENT_INIT_FAILED')
    }

    const tokens = await this.client.exchangeJwtForToken(params.jwt)
    return tokens
  }

  public async loginWithDirectToken(params: { clientId?: string; clientSecret?: string; serverUrl?: string; accessToken: string; refreshToken?: string }) {
    this.initialize({
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      serverUrl: params.serverUrl
    })

    if (!this.client) {
      throw new AppError('Failed to initialize RingCentral client', 'CLIENT_INIT_FAILED')
    }

    const tokens = await this.client.saveDirectToken(params.accessToken, params.refreshToken)
    return tokens
  }

  public getClient(): RingCentralClient {
    if (!this.client) {
      throw new AppError('RingCentral credentials not configured in settings or environment', 'NO_CLIENT_CONFIG')
    }
    return this.client
  }

  public async startLoginFlow(): Promise<{ authUrl: string }> {
    this.codeVerifier = OAuth.generateCodeVerifier()
    const codeChallenge = OAuth.generateCodeChallenge(this.codeVerifier)
    this.oauthState = Math.random().toString(36).substring(2)

    this.callbackServer = new CallbackServer()
    const redirectUri = await this.callbackServer.start((code, state) => {
      this.handleOAuthCallback(code, state, redirectUri)
    })

    const clientId = process.env.RINGCENTRAL_CLIENT_ID || ''
    const serverUrl = process.env.RINGCENTRAL_SERVER_URL || 'https://platform.devtest.ringcentral.com'

    const authUrl = OAuth.buildAuthUrl({
      serverUrl,
      clientId,
      redirectUri,
      state: this.oauthState,
      codeChallenge
    })

    return { authUrl }
  }

  private async handleOAuthCallback(code: string, state: string, redirectUri: string) {
    if (state !== this.oauthState) {
      Logger.error('OAuth state mismatch error')
      return
    }

    try {
      if (this.client) {
        await this.client.exchangeCodeForToken(code, this.codeVerifier, redirectUri)
        Logger.info('Successfully authenticated via OAuth callback')
      }
    } catch (err) {
      Logger.error('Failed to handle OAuth callback:', err)
    }
  }

  public async logout(): Promise<void> {
    await TokenStore.clearTokens()
    if (this.callbackServer) {
      this.callbackServer.stop()
    }
    Logger.info('User logged out successfully')
  }

  public async validateToken(): Promise<boolean> {
    const tokens = await TokenStore.getTokens()
    if (!tokens) return false
    return Date.now() < tokens.expiresAt
  }
}
