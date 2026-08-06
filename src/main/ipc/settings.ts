import { SettingsService } from '../services/SettingsService'
import { ErrorHandler } from '../utils/ErrorHandler'
import { AppSettings } from '../../types/settings'

export class SettingsIpcHandler {
  public getSettings() {
    try {
      const settings = SettingsService.getSettings()
      return { success: true, settings }
    } catch (err) {
      return ErrorHandler.handle(err, 'IPC Settings GetSettings')
    }
  }

  public updateSettings(newSettings: Partial<AppSettings>) {
    try {
      const settings = SettingsService.updateSettings(newSettings)
      return { success: true, settings }
    } catch (err) {
      return ErrorHandler.handle(err, 'IPC Settings UpdateSettings')
    }
  }
}
