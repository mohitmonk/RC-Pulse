export type ThemeMode = 'dark' | 'light' | 'system'

export interface AppSettings {
  theme: ThemeMode
  autoLogin: boolean
  refreshIntervalMinutes: number // e.g. 5, 15, 30, 60
  exportLocation: string
  enableNotifications: boolean
  soundEnabled: boolean
  defaultDateFilter: string
  ringCentralClientId?: string
  ringCentralClientSecret?: string
  ringCentralServerUrl?: string
  isDemoMode: boolean
}
