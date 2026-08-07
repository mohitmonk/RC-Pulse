import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const { isAuthenticated, isLoading, user, error, isDemoMode, setUser, logout, setDemoMode } = useAuthStore()

  const loginWithRealAccount = async (params: {
    clientId?: string
    clientSecret?: string
    serverUrl?: string
    jwtToken?: string
    accessToken?: string
  }) => {
    try {
      useAuthStore.getState().setLoading(true)
      useAuthStore.getState().setError(null)

      const res = await fetch('/api/auth/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to authenticate with RingCentral API')
      }

      setDemoMode(false)
      setUser(data.user)
      useAuthStore.getState().setTokens(data.accessToken || 'real_token', null, Date.now() + 3600000)
    } catch (err: any) {
      useAuthStore.getState().setError(err.message || 'RingCentral sign-in failed')
      throw err
    } finally {
      useAuthStore.getState().setLoading(false)
    }
  }

  const loginWithDemo = async () => {
    try {
      useAuthStore.getState().setLoading(true)
      useAuthStore.getState().setError(null)

      const res = await fetch('/api/auth/demo', { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        setDemoMode(true)
        setUser(data.user)
      }
    } catch (err: any) {
      useAuthStore.getState().setError(err.message || 'Demo login failed')
    } finally {
      useAuthStore.getState().setLoading(false)
    }
  }

  const loginWithOAuth = async (opts?: { serverUrl?: string; clientId?: string }) => {
    try {
      useAuthStore.getState().setLoading(true)
      useAuthStore.getState().setError(null)

      if (window.electron) {
        await window.electron.auth.login()
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(opts || {})
        })
        const data = await res.json()
        if (data.authUrl) {
          window.open(data.authUrl, '_blank')
        }
      }
    } catch (err: any) {
      useAuthStore.getState().setError(err.message || 'OAuth flow failed')
    } finally {
      useAuthStore.getState().setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      useAuthStore.getState().setLoading(true)
      if (window.electron) {
        await window.electron.auth.logout()
      } else {
        await fetch('/api/auth/logout', { method: 'POST' })
      }
    } catch (err) {
      console.warn('Logout warning:', err)
    } finally {
      logout()
      useAuthStore.getState().setLoading(false)
    }
  }

  return {
    isAuthenticated,
    isLoading,
    user,
    error,
    isDemoMode,
    loginWithRealAccount,
    loginWithDemo,
    loginWithOAuth,
    handleLogout,
    setDemoMode
  }
}
