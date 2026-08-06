import { UserService } from '../services/UserService'
import { ErrorHandler } from '../utils/ErrorHandler'
import { RingCentralClient } from '../auth/RingCentral'

export class UserIpcHandler {
  public async getCurrentUser(client: RingCentralClient | null) {
    try {
      const user = await UserService.getCurrentUser(client)
      return { success: true, user }
    } catch (err) {
      return ErrorHandler.handle(err, 'IPC User GetCurrentUser')
    }
  }
}
