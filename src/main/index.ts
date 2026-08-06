import { AuthManager } from './auth/AuthManager'
import { AuthIpcHandler } from './ipc/auth'
import { CallsIpcHandler } from './ipc/calls'
import { UserIpcHandler } from './ipc/user'
import { SettingsIpcHandler } from './ipc/settings'
import { Logger } from './utils/Logger'

export class ElectronAppMain {
  private authManager: AuthManager
  private authHandler: AuthIpcHandler
  private callsHandler: CallsIpcHandler
  private userHandler: UserIpcHandler
  private settingsHandler: SettingsIpcHandler

  constructor() {
    this.authManager = new AuthManager()
    this.authHandler = new AuthIpcHandler(this.authManager)
    this.callsHandler = new CallsIpcHandler()
    this.userHandler = new UserIpcHandler()
    this.settingsHandler = new SettingsIpcHandler()
  }

  public init() {
    Logger.info('Initializing RC Pulse Main Process...')
    
    // Configure default env credentials if present
    this.authManager.initialize({
      clientId: process.env.RINGCENTRAL_CLIENT_ID || '',
      clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET || '',
      serverUrl: process.env.RINGCENTRAL_SERVER_URL || 'https://platform.devtest.ringcentral.com'
    })
  }
}

const mainApp = new ElectronAppMain()
mainApp.init()

export default mainApp
