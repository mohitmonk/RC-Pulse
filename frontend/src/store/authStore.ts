import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AuthState, UserProfile } from '@/src/types/user'

interface AuthStoreActions {
  setUser: (user: UserProfile | null) => void
  setTokens: (accessToken: string | null, refreshToken: string | null, expiresAt: number | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  setDemoMode: (isDemoMode: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState & AuthStoreActions>()(
  persist(
    (set) => ({
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
    }),
    {
      name: 'rc-pulse-auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
        isDemoMode: state.isDemoMode
      })
    }
  )
)

