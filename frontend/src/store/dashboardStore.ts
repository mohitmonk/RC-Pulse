import { create } from 'zustand'
import { DateFilterType } from '@/src/types/call'
import { AppSettings } from '@/src/types/settings'

export type NavTab = 'dashboard' | 'call_logs' | 'settings'

interface DashboardStoreState {
  activeTab: NavTab
  dateFilter: DateFilterType
  customStartDate: string
  customEndDate: string
  searchQuery: string
  directionFilter: 'all' | 'Inbound' | 'Outbound'
  resultFilter: 'all' | 'Connected' | 'Missed' | 'Voicemail'
  currentPage: number
  pageSize: number
  settings: AppSettings

  setActiveTab: (tab: NavTab) => void
  setDateFilter: (filter: DateFilterType) => void
  setCustomDateRange: (start: string, end: string) => void
  setSearchQuery: (query: string) => void
  setDirectionFilter: (filter: 'all' | 'Inbound' | 'Outbound') => void
  setResultFilter: (filter: 'all' | 'Connected' | 'Missed' | 'Voicemail') => void
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  updateSettings: (newSettings: Partial<AppSettings>) => void
}

export const useDashboardStore = create<DashboardStoreState>((set) => ({
  activeTab: 'dashboard',
  dateFilter: 'this_month',
  customStartDate: '',
  customEndDate: '',
  searchQuery: '',
  directionFilter: 'all',
  resultFilter: 'all',
  currentPage: 1,
  pageSize: 15,
  settings: {
    theme: 'dark',
    autoLogin: true,
    refreshIntervalMinutes: 15,
    exportLocation: 'Downloads',
    enableNotifications: true,
    soundEnabled: true,
    defaultDateFilter: 'this_month',
    isDemoMode: false
  },

  setActiveTab: (activeTab) => set({ activeTab }),
  setDateFilter: (dateFilter) => set({ dateFilter, currentPage: 1 }),
  setCustomDateRange: (customStartDate, customEndDate) => set({ customStartDate, customEndDate, dateFilter: 'custom', currentPage: 1 }),
  setSearchQuery: (searchQuery) => set({ searchQuery, currentPage: 1 }),
  setDirectionFilter: (directionFilter) => set({ directionFilter, currentPage: 1 }),
  setResultFilter: (resultFilter) => set({ resultFilter, currentPage: 1 }),
  setCurrentPage: (currentPage) => set({ currentPage }),
  setPageSize: (pageSize) => set({ pageSize, currentPage: 1 }),
  updateSettings: (newSettings) =>
    set((state) => ({ settings: { ...state.settings, ...newSettings } }))
}))
