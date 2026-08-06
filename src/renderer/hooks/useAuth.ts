import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const { isAuthenticated, isLoading, user, error, isDemoMode, setUser, logout, setDemoMode } = useAuthStore()

  const loginWithOAuth = async () => {
    try {
      useAuthStore.getState().setLoading(true)
      useAuthStore.getState().setError(null)

      if (window.electron) {
        await window.electron.auth.login()
      } else {
        // Web fallback
        const res = await fetch('/api/auth/login', { method: 'POST' })
        const data = await res.json()
        if (data.success) {
          // Trigger demo profile or real profile
          const userRes = await fetch('/api/user/me')
          const userData = await userRes.json()
          if (userData.success) {
            setUser(userData.user)
          }
        }
      }
    } catch (err: any) {
      useAuthStore.getState().setError(err.message || 'Login failed')
    } finally {
      useAuthStore.getState().setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      if (window.electron) {
        await window.electron.auth.logout()
      } else {
        await fetch('/api/auth/logout', { method: 'POST' })
      }
      logout()
    } catch (err) {
      logout()
    }
  }

  return {
    isAuthenticated,
    isLoading,
    user,
    error,
    isDemoMode,
    loginWithOAuth,
    handleLogout,
    setDemoMode
  }
}
