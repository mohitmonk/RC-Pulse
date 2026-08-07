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
  const { isAuthenticated, setUser, logout, setDemoMode } = useAuthStore()
  const { activeTab } = useDashboardStore()

  useEffect(() => {
    // Sync session on startup with backend
    const syncSession = async () => {
      try {
        const res = await fetch('/api/user/me')
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.user) {
            setUser(data.user)
            setDemoMode(Boolean(data.isDemoMode))
          }
        }
      } catch (err) {
        console.warn('Session sync error:', err)
      }
    }

    syncSession()
  }, [])

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

