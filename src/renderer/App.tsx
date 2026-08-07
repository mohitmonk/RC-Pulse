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

    // Handle client-side OAuth code exchange if redirect lands on SPA with ?code=
    const handleClientOAuthCode = async () => {
      const searchParams = new URLSearchParams(window.location.search)
      const code = searchParams.get('code')
      const stateParam = searchParams.get('state')

      if (!code) return

      try {
        let serverUrl = 'https://platform.ringcentral.com'
        let clientId = ''
        let clientSecret = ''
        let redirectUri = `${window.location.origin}/oauth/callback`

        if (stateParam) {
          try {
            const decoded = JSON.parse(atob(decodeURIComponent(stateParam)))
            if (decoded.serverUrl) serverUrl = decoded.serverUrl
            if (decoded.clientId) clientId = decoded.clientId
            if (decoded.clientSecret) clientSecret = decoded.clientSecret
            if (decoded.redirectUri) redirectUri = decoded.redirectUri
          } catch (e) {}
        }

        const pending = localStorage.getItem('rc_pending_oauth')
        if (pending) {
          try {
            const parsed = JSON.parse(pending)
            if (!clientId && parsed.clientId) clientId = parsed.clientId
            if (!clientSecret && parsed.clientSecret) clientSecret = parsed.clientSecret
            if (parsed.serverUrl) serverUrl = parsed.serverUrl
            if (parsed.redirectUri) redirectUri = parsed.redirectUri
          } catch (e) {}
        }

        let accessToken = ''
        let userProfile: any = null

        // Try backend exchange first
        try {
          const res = await fetch(`/api/auth/callback${window.location.search}`)
          const contentType = res.headers.get('content-type') || ''
          if (res.ok && contentType.includes('application/json')) {
            const data = await res.json()
            if (data.success && data.accessToken) {
              accessToken = data.accessToken
              userProfile = data.user
            }
          }
        } catch (e) {}

        // Fallback: Direct client-side code exchange with RingCentral REST API
        if (!accessToken && code) {
          const tokenUrl = `${serverUrl.replace(/\/$/, '')}/restapi/oauth/token`
          const bodyParams = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri
          })

          const headers: Record<string, string> = {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
          if (clientId && clientSecret) {
            headers['Authorization'] = `Basic ${btoa(`${clientId}:${clientSecret}`)}`
          } else if (clientId) {
            bodyParams.append('client_id', clientId)
          }

          const tokenRes = await fetch(tokenUrl, {
            method: 'POST',
            headers,
            body: bodyParams.toString()
          })

          if (tokenRes.ok) {
            const tokenData = await tokenRes.json()
            accessToken = tokenData.access_token

            const profileRes = await fetch(`${serverUrl.replace(/\/$/, '')}/restapi/v1.0/account/~/extension/~`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            })
            if (profileRes.ok) {
              const extInfo = await profileRes.json()
              const firstName = extInfo.contact?.firstName || ''
              const lastName = extInfo.contact?.lastName || ''
              const name = extInfo.name || `${firstName} ${lastName}`.trim() || `Extension ${extInfo.extensionNumber || extInfo.id}`

              userProfile = {
                id: String(extInfo.id),
                extensionId: String(extInfo.id),
                accountId: String(extInfo.account?.id || 'acc_active'),
                name,
                firstName: firstName || 'RingCentral',
                lastName: lastName || 'User',
                email: extInfo.contact?.email || 'user@ringcentral.com',
                extensionNumber: extInfo.extensionNumber || '101',
                status: extInfo.status || 'Enabled',
                contactPhone: extInfo.contact?.businessPhone || '',
                companyName: extInfo.account?.name || 'RingCentral Account',
                presenceStatus: 'Available',
                userStatus: 'Online'
              }
            }
          }
        }

        if (accessToken && userProfile) {
          const payload = {
            type: 'RC_AUTH_SUCCESS',
            accessToken,
            user: userProfile
          }
          localStorage.setItem('rc_oauth_login_data', JSON.stringify(payload))
          localStorage.removeItem('rc_pending_oauth')

          if (window.opener) {
            window.opener.postMessage(payload, '*')
            setTimeout(() => window.close(), 500)
            return
          } else {
            setUser(userProfile)
            setTokens(accessToken, null, Date.now() + 3600000)
            window.history.replaceState({}, document.title, '/')
          }
        }
      } catch (err) {
        console.error('Client OAuth Exchange Error:', err)
      }
    }

    if (window.location.search.includes('code=')) {
      handleClientOAuthCode()
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

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'rc_oauth_login_data') {
        checkStoredOAuth()
      }
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
    window.addEventListener('storage', handleStorage)
    window.addEventListener('message', handleMessage)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('storage', handleStorage)
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

