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
  isAuthenticated: false,
  isLoading: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  error: null,
  isDemoMode: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setTokens: (accessToken, refreshToken, expiresAt) => set({ accessToken, refreshToken, expiresAt }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setDemoMode: (isDemoMode) => set({ isDemoMode }),
  logout: () => set({
    isAuthenticated: false,
    isDemoMode: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    error: null
  })
}))
