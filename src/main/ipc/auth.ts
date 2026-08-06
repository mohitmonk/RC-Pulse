import { AuthManager } from '../auth/AuthManager'
import { ErrorHandler } from '../utils/ErrorHandler'

export class AuthIpcHandler {
  private authManager: AuthManager

  constructor(authManager: AuthManager) {
    this.authManager = authManager
  }

  public async login(): Promise<unknown> {
    try {
      return await this.authManager.startLoginFlow()
    } catch (err) {
      return ErrorHandler.handle(err, 'IPC Auth Login')
    }
  }

  public async logout(): Promise<unknown> {
    try {
      await this.authManager.logout()
      return { success: true }
    } catch (err) {
      return ErrorHandler.handle(err, 'IPC Auth Logout')
    }
  }

  public async validateToken(): Promise<unknown> {
    try {
      const isValid = await this.authManager.validateToken()
      return { success: true, isValid }
    } catch (err) {
      return ErrorHandler.handle(err, 'IPC Auth ValidateToken')
    }
  }
}
