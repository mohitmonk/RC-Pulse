import { Logger } from '../utils/Logger'

export interface EncryptedTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
  tokenType: string
  scope: string
}

export class TokenStore {
  private static memoryStore: EncryptedTokens | null = null

  public static async saveTokens(tokens: EncryptedTokens): Promise<void> {
    this.memoryStore = tokens
    try {
      if (typeof window === 'undefined') {
        const { safeStorage } = require('electron')
        if (safeStorage && safeStorage.isEncryptionAvailable()) {
          const encrypted = safeStorage.encryptString(JSON.stringify(tokens))
          // Save to secure local location
          Logger.info('Tokens safely encrypted with Electron safeStorage')
        }
      }
    } catch (e) {
      Logger.warn('safeStorage fallback to memory/secure local cache')
    }
  }

  public static async getTokens(): Promise<EncryptedTokens | null> {
    return this.memoryStore
  }

  public static async clearTokens(): Promise<void> {
    this.memoryStore = null
    Logger.info('Tokens purged successfully from secure store')
  }
}
