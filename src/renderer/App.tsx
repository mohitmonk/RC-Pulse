import React, { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './store/authStore'
import { useDashboardStore } from './store/dashboardStore'
import { DashboardLayout } from './layouts/DashboardLayout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { SettingsPage } from './pages/Settings'
import { CallTable } from './components/CallTable'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false
    }
  }
})

export default function App() {
  const { isAuthenticated, setUser, setTokens, logout } = useAuthStore()
  const { activeTab } = useDashboardStore()

  useEffect(() => {
    // Process OAuth completion data if present in localStorage or postMessage
    const processOAuthData = (data: any) => {
      if (data && data.user && data.accessToken) {
        setUser(data.user)
        setTokens(data.accessToken, null, Date.now() + 3600000)
        return true
      }
      return false
    }

    const checkStoredOAuth = () => {
      const stored = localStorage.getItem('rc_oauth_login_data')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (processOAuthData(parsed)) {
            localStorage.removeItem('rc_oauth_login_data')
            if (window.location.search.includes('oauth_success')) {
              window.history.replaceState({}, document.title, window.location.pathname)
            }
            return
          }
        } catch (e) {}
        localStorage.removeItem('rc_oauth_login_data')
      }
    }

    checkStoredOAuth()

    // Sync session on startup with backend
    const syncSession = async () => {
      try {
        const token = useAuthStore.getState().accessToken
        const headers: Record<string, string> = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const res = await fetch('/api/user/me', { headers })
        const contentType = res.headers.get('content-type') || ''
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json()
          if (data.success && data.user) {
            setUser(data.user)
          }
        }
      } catch (err) {
        // Ignore session sync errors
      }
    }

    syncSession()

    // Periodically check for active session
    const interval = setInterval(syncSession, 15000)

    const handleFocus = () => {
      checkStoredOAuth()
      syncSession()
    }

    // Listen for OAuth completion from popup window
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'RC_AUTH_SUCCESS') {
        if (!processOAuthData(event.data)) {
          syncSession()
        }
      }
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('message', handleMessage)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('message', handleMessage)
    }
  }, [setUser, setTokens])

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardLayout>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'call_logs' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-slate-100">Call Log Explorer</h1>
              <p className="text-xs text-slate-400">Search, filter, inspect, and export detailed RingCentral call records.</p>
            </div>
            <CallTable />
          </div>
        )}
        {activeTab === 'settings' && <SettingsPage />}
      </DashboardLayout>
    </QueryClientProvider>
  )
}

