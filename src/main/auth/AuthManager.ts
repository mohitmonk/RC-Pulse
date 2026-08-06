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

  public initialize(config: { clientId: string; clientSecret: string; serverUrl: string }) {
    if (config.clientId && config.clientSecret) {
      this.client = new RingCentralClient(config)
      Logger.info('AuthManager initialized with RingCentral API client')
    }
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
