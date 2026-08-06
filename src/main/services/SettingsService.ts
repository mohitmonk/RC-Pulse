import { AppSettings } from '../../types/settings'
import { Logger } from '../utils/Logger'

export class SettingsService {
  private static settings: AppSettings = {
    theme: 'dark',
    autoLogin: true,
    refreshIntervalMinutes: 15,
    exportLocation: 'Downloads',
    enableNotifications: true,
    soundEnabled: true,
    defaultDateFilter: 'this_month',
    isDemoMode: true
  }

  public static getSettings(): AppSettings {
    return { ...this.settings }
  }

  public static updateSettings(newSettings: Partial<AppSettings>): AppSettings {
    this.settings = { ...this.settings, ...newSettings }
    Logger.info('App settings updated', this.settings)
    return this.settings
  }
}
