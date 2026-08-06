import { create } from 'zustand'
import { AuthState, UserProfile } from '../../types/user'

interface AuthStoreActions {
  setUser: (user: UserProfile | null) => void
  setTokens: (accessToken: string | null, refreshToken: string | null, expiresAt: number | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  setDemoMode: (isDemoMode: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState & AuthStoreActions>((set) => ({
  isAuthenticated: true, // Default to authenticated in demo/sandbox mode for instant user experience
  isLoading: false,
  user: {
    id: 'usr_rc_99812',
    extensionId: 'ext_401',
    accountId: 'acc_88102',
    name: 'Sarah Connor',
    firstName: 'Sarah',
    lastName: 'Connor',
    email: 'sarah.connor@enterprise.org',
    extensionNumber: '104',
    status: 'Enabled',
    contactPhone: '+1 (555) 234-5678',
    companyName: 'Apex Enterprise Solutions',
    site: {
      id: 'site_101',
      name: 'Headquarters - San Francisco'
    },
    presenceStatus: 'Available',
    userStatus: 'Online',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  },
  accessToken: 'demo_access_token_99182',
  refreshToken: 'demo_refresh_token_88192',
  expiresAt: Date.now() + 3600 * 1000,
  error: null,
  isDemoMode: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setTokens: (accessToken, refreshToken, expiresAt) => set({ accessToken, refreshToken, expiresAt }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setDemoMode: (isDemoMode) => set({ isDemoMode }),
  logout: () => set({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    error: null
  })
}))
