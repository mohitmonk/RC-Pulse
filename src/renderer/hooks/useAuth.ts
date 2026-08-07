import { useAuthStore } from '../store/authStore'
import { UserProfile } from '../../types/user'

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

      const targetServer = params.serverUrl || 'https://platform.ringcentral.com'

      // First attempt backend connection
      let res: Response | null = null
      try {
        res = await fetch('/api/auth/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        })
      } catch (netErr) {
        // Network error reaching backend
      }

      const contentType = res?.headers.get('content-type') || ''
      if (res && res.ok && contentType.includes('application/json')) {
        const data = await res.json()
        if (data.success && data.user) {
          setDemoMode(false)
          setUser(data.user)
          useAuthStore.getState().setTokens(data.accessToken || 'real_token', null, Date.now() + 3600000)
          return
        } else if (data.error) {
          throw new Error(data.error)
        }
      }

      // If backend /api route is not available (e.g. static host like Cloudflare Pages), fallback to Direct Client Connection
      let activeToken = params.accessToken

      if (!activeToken && params.jwtToken) {
        // Exchange JWT Token directly with RingCentral REST API
        const tokenUrl = `${targetServer.replace(/\/$/, '')}/restapi/oauth/token`
        const body = new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: params.jwtToken
        })

        const headers: Record<string, string> = {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
        if (params.clientId && params.clientSecret) {
          headers['Authorization'] = `Basic ${btoa(`${params.clientId}:${params.clientSecret}`)}`
        }

        const tokenRes = await fetch(tokenUrl, {
          method: 'POST',
          headers,
          body: body.toString()
        })

        if (!tokenRes.ok) {
          const errData = await tokenRes.text()
          throw new Error(`RingCentral API Auth Error (${tokenRes.status}): ${errData}`)
        }

        const tokenJson = await tokenRes.json()
        activeToken = tokenJson.access_token
      }

      if (!activeToken) {
        throw new Error('Please provide a valid RingCentral JWT Token or Access Token.')
      }

      // Fetch user profile directly from RingCentral REST API
      const profileUrl = `${targetServer.replace(/\/$/, '')}/restapi/v1.0/account/~/extension/~`
      const profileRes = await fetch(profileUrl, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      })

      if (!profileRes.ok) {
        throw new Error(`Failed to fetch RingCentral user profile (${profileRes.status}). Please check your token.`)
      }

      const extInfo = await profileRes.json()
      
      // Fetch presence info optionally
      let presenceInfo: any = null
      try {
        const presenceRes = await fetch(`${targetServer.replace(/\/$/, '')}/restapi/v1.0/account/~/extension/~/presence`, {
          headers: { 'Authorization': `Bearer ${activeToken}` }
        })
        if (presenceRes.ok) presenceInfo = await presenceRes.json()
      } catch (e) {}

      const firstName = extInfo.contact?.firstName || ''
      const lastName = extInfo.contact?.lastName || ''
      const name = extInfo.name || `${firstName} ${lastName}`.trim() || `Extension ${extInfo.extensionNumber || extInfo.id}`

      const userProfile: UserProfile = {
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
        site: extInfo.site ? { id: String(extInfo.site.id), name: extInfo.site.name } : undefined,
        presenceStatus: presenceInfo?.presenceStatus || 'Available',
        userStatus: presenceInfo?.userStatus || 'Online'
      }

      setDemoMode(false)
      setUser(userProfile)
      useAuthStore.getState().setTokens(activeToken, null, Date.now() + 3600000)

    } catch (err: any) {
      useAuthStore.getState().setError(err.message || 'RingCentral sign-in failed')
      throw err
    } finally {
      useAuthStore.getState().setLoading(false)
    }
  }

  const loginWithOAuth = async (opts?: { serverUrl?: string; clientId?: string; clientSecret?: string; redirectUri?: string }) => {
    try {
      useAuthStore.getState().setLoading(true)
      useAuthStore.getState().setError(null)

      if (window.electron) {
        await window.electron.auth.login()
      } else {
        let authUrl = ''
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(opts || {})
          }).catch(() => null)

          if (res) {
            const contentType = res.headers.get('content-type') || ''
            if (res.ok && contentType.includes('application/json')) {
              const data = await res.json()
              if (data.success && data.authUrl) {
                authUrl = data.authUrl
              }
            }
          }
        } catch (e) {}

        // Fallback: Construct authUrl client-side if backend API is not available
        if (!authUrl) {
          const serverUrl = opts?.serverUrl || 'https://platform.ringcentral.com'
          const clientId = opts?.clientId || ''
          const redirectUri = opts?.redirectUri || `${window.location.origin}/oauth/callback`
          const stateObj = {
            serverUrl,
            clientId,
            clientSecret: opts?.clientSecret || '',
            redirectUri
          }
          const stateStr = btoa(JSON.stringify(stateObj))
          authUrl = `${serverUrl.replace(/\/$/, '')}/restapi/oauth/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(stateStr)}`
        }

        window.open(authUrl, 'rc_oauth_popup', 'width=600,height=700')
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
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
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
    isDemoMode: false,
    loginWithRealAccount,
    loginWithOAuth,
    handleLogout,
    setDemoMode
  }
}
