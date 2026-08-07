import fs from 'fs'
import path from 'path'
import { Logger } from '../utils/Logger'

export interface EncryptedTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
  tokenType: string
  scope: string
  serverUrl?: string
  clientId?: string
  clientSecret?: string
  isDemoMode?: boolean
}

const SESSION_FILE_PATH = path.join(process.cwd(), '.rc_pulse_session.json')

export class TokenStore {
  private static memoryStore: EncryptedTokens | null = null

  public static async saveTokens(tokens: EncryptedTokens): Promise<void> {
    const existing = (await this.getTokens()) || {}
    const updated: EncryptedTokens = {
      ...existing,
      ...tokens
    }
    this.memoryStore = updated

    try {
      if (typeof window === 'undefined') {
        fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(updated, null, 2), 'utf-8')
        Logger.info('Tokens saved to disk session cache successfully')
      }
    } catch (e: any) {
      Logger.warn('Failed to save tokens to disk cache:', e.message)
    }
  }

  public static async getTokens(): Promise<EncryptedTokens | null> {
    if (this.memoryStore) {
      return this.memoryStore
    }

    try {
      if (typeof window === 'undefined' && fs.existsSync(SESSION_FILE_PATH)) {
        const data = fs.readFileSync(SESSION_FILE_PATH, 'utf-8')
        if (data) {
          this.memoryStore = JSON.parse(data)
          return this.memoryStore
        }
      }
    } catch (e: any) {
      Logger.warn('Failed to read tokens from session file:', e.message)
    }

    return null
  }

  public static async clearTokens(): Promise<void> {
    this.memoryStore = null
    try {
      if (typeof window === 'undefined' && fs.existsSync(SESSION_FILE_PATH)) {
        fs.unlinkSync(SESSION_FILE_PATH)
        Logger.info('Session file removed from disk')
      }
    } catch (e: any) {
      Logger.warn('Failed to delete session file:', e.message)
    }
    Logger.info('Tokens purged successfully from store')
  }
}

