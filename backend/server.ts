import express from 'express'
import path from 'path'
import { createServer as createViteServer } from 'vite'
import { UserService } from '../src/main/services/UserService'
import { CallLogService } from '../src/main/services/CallLogService'
import { AnalyticsService } from '../src/main/services/AnalyticsService'
import { DateFilterType } from '../src/types/call'
import { RingCentralClient } from '../src/main/auth/RingCentral'
import { TokenStore } from '../src/main/auth/TokenStore'
import fs from 'fs'

async function startServer() {
  const app = express()
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000

  app.use(express.json({ limit: '10mb' }))

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'RC Pulse Express Backend', version: '1.0.0' })
  })

  let activeRcClient: RingCentralClient | null = null

  async function getActiveClient(): Promise<RingCentralClient | null> {
    const tokens = await TokenStore.getTokens()
    if (!tokens || !tokens.accessToken) {
      return null
    }

    if (!activeRcClient) {
      const serverUrl = tokens.serverUrl || process.env.RINGCENTRAL_SERVER_URL || 'https://platform.ringcentral.com'
      const clientId = tokens.clientId || process.env.RINGCENTRAL_CLIENT_ID || ''
      const clientSecret = tokens.clientSecret || process.env.RINGCENTRAL_CLIENT_SECRET || ''

      activeRcClient = new RingCentralClient({
        clientId,
        clientSecret,
        serverUrl
      })
      console.log('[RC Pulse] Auto-restored active RingCentral client session from TokenStore.')
    }

    return activeRcClient
  }

  // User Profile
  app.get('/api/user/me', async (req, res) => {
    try {
      const client = await getActiveClient()
      if (!client) {
        return res.status(401).json({ success: false, error: 'Not authenticated with RingCentral' })
      }
      
      const user = await UserService.getCurrentUser(client)
      res.json({ success: true, user, isDemoMode: false })
    } catch (err: any) {
      console.warn('[RC Pulse] Failed to fetch user from RingCentral API:', err.message)
      res.status(401).json({ success: false, error: err.message })
    }
  })

  // Call Logs & Analytics
  app.get('/api/calls', async (req, res) => {
    try {
      const filterType = (req.query.filter as DateFilterType) || 'this_month'
      const customStart = req.query.startDate as string
      const customEnd = req.query.endDate as string

      const client = await getActiveClient()
      if (!client) {
        return res.status(401).json({ success: false, error: 'Not authenticated with RingCentral' })
      }
      const calls = await CallLogService.getCallLogs(client, filterType, customStart, customEnd)
      const analytics = AnalyticsService.calculateAnalytics(calls)

      res.json({
        success: true,
        calls,
        analytics,
        isDemoMode: false
      })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message })
    }
  })

  // Auth Connect Endpoint
  app.post('/api/auth/connect', async (req, res) => {
    try {
      const { clientId, clientSecret, serverUrl, jwtToken, accessToken } = req.body
      const targetServer = serverUrl || 'https://platform.ringcentral.com'
      
      const client = new RingCentralClient({
        clientId: clientId || '',
        clientSecret: clientSecret || '',
        serverUrl: targetServer
      })

      let tokens
      if (jwtToken) {
        tokens = await client.exchangeJwtForToken(jwtToken)
      } else if (accessToken) {
        tokens = await client.saveDirectToken(accessToken)
      }

      await TokenStore.saveTokens({
        accessToken: tokens?.accessToken || accessToken || '',
        refreshToken: tokens?.refreshToken || '',
        expiresAt: tokens?.expiresAt || Date.now() + 3600000,
        tokenType: 'Bearer',
        scope: '',
        serverUrl: targetServer,
        clientId: clientId || '',
        clientSecret: clientSecret || '',
        isDemoMode: false
      })

      activeRcClient = client
      const realUser = await UserService.getCurrentUser(client)

      res.json({
        success: true,
        user: realUser,
        accessToken: tokens?.accessToken || accessToken,
        isDemoMode: false
      })
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Authentication with RingCentral failed' })
    }
  })

  let pendingOAuthState: {
    clientId: string
    clientSecret: string
    serverUrl: string
    redirectUri: string
  } | null = null

  // Auth Login Endpoint
  app.post('/api/auth/login', (req, res) => {
    const { serverUrl, clientId, clientSecret, redirectUri: userRedirectUri } = req.body || {}
    const targetServer = serverUrl || process.env.RINGCENTRAL_SERVER_URL || 'https://platform.ringcentral.com'
    const targetClientId = clientId || process.env.RINGCENTRAL_CLIENT_ID || '8EYSDHink0fdsQ9W3c4fOj'
    const targetClientSecret = clientSecret || process.env.RINGCENTRAL_CLIENT_SECRET || 'eJ1d3GrHSE2dmQQb33SKQF2YiCZgSp4bAd2DbaFBh4po'

    if (!targetClientId) {
      return res.status(400).json({
        success: false,
        error: 'Client ID (App Key) is required for RingCentral OAuth.'
      })
    }

    const host = req.get('host') || 'localhost:3000'
    const protocol = req.protocol || 'http'
    const finalRedirectUri = (userRedirectUri && userRedirectUri.trim())
      ? userRedirectUri.trim()
      : `${protocol}://${host}/oauth/callback`

    pendingOAuthState = {
      clientId: targetClientId,
      clientSecret: targetClientSecret,
      serverUrl: targetServer,
      redirectUri: finalRedirectUri
    }

    activeRcClient = new RingCentralClient({
      clientId: targetClientId,
      clientSecret: targetClientSecret,
      serverUrl: targetServer
    })

    const stateObj = {
      clientId: targetClientId,
      clientSecret: targetClientSecret,
      serverUrl: targetServer,
      redirectUri: finalRedirectUri
    }
    const stateStr = Buffer.from(JSON.stringify(stateObj)).toString('base64')

    const authUrl = `${targetServer.replace(/\/$/, '')}/restapi/oauth/authorize?response_type=code&client_id=${encodeURIComponent(targetClientId)}&redirect_uri=${encodeURIComponent(finalRedirectUri)}&state=${encodeURIComponent(stateStr)}`

    res.json({
      success: true,
      authUrl,
      redirectUri: finalRedirectUri
    })
  })

  // OAuth Callbacks
  const handleOAuthCallback = async (req: express.Request, res: express.Response) => {
    const code = req.query.code as string
    const error = req.query.error as string
    const errorDesc = req.query.error_description as string
    const rawState = req.query.state as string

    if (error || !code) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Authentication Failed</title></head>
          <body style="background:#09090b;color:#f43f5e;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
            <div style="text-align:center;background:#18181b;padding:32px;border-radius:16px;border:1px solid #27272a;max-width:440px;">
              <h2 style="margin-top:0;">Authentication Failed</h2>
              <p style="font-size:13px;color:#a1a1aa;line-height:1.6;">${errorDesc || error || 'No authorization code received.'}</p>
              <a href="/" style="color:#60a5fa;text-decoration:none;font-size:13px;display:inline-block;margin-top:20px;font-weight:600;">&larr; Return to RC Pulse Login</a>
            </div>
          </body>
        </html>
      `)
    }

    try {
      const host = req.get('host') || 'localhost:3000'
      const protocol = req.protocol || 'http'
      let redirectUri = pendingOAuthState?.redirectUri || `${protocol}://${host}/oauth/callback`
      let clientId = pendingOAuthState?.clientId || process.env.RINGCENTRAL_CLIENT_ID || '8EYSDHink0fdsQ9W3c4fOj'
      let clientSecret = pendingOAuthState?.clientSecret || process.env.RINGCENTRAL_CLIENT_SECRET || 'eJ1d3GrHSE2dmQQb33SKQF2YiCZgSp4bAd2DbaFBh4po'
      let serverUrl = pendingOAuthState?.serverUrl || process.env.RINGCENTRAL_SERVER_URL || 'https://platform.ringcentral.com'

      if (rawState && rawState !== 'rc_pulse_state') {
        try {
          const decoded = JSON.parse(Buffer.from(decodeURIComponent(rawState), 'base64').toString('utf8'))
          if (decoded.clientId) clientId = decoded.clientId
          if (decoded.clientSecret) clientSecret = decoded.clientSecret
          if (decoded.serverUrl) serverUrl = decoded.serverUrl
          if (decoded.redirectUri) redirectUri = decoded.redirectUri
        } catch (e) {}
      }

      const clientToUse = new RingCentralClient({ clientId, clientSecret, serverUrl })

      const tokens = await clientToUse.exchangeCodeForToken(code, '', redirectUri)

      await TokenStore.saveTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        tokenType: tokens.tokenType || 'Bearer',
        scope: tokens.scope || '',
        serverUrl,
        clientId,
        clientSecret,
        isDemoMode: false
      })

      activeRcClient = clientToUse

      let userProfile = null
      try {
        const profileRes = await fetch(`${serverUrl.replace(/\/$/, '')}/restapi/v1.0/account/~/extension/~`, {
          headers: { Authorization: `Bearer ${tokens.accessToken}` }
        })
        if (profileRes.ok) {
          const extInfo: any = await profileRes.json()
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
      } catch (e) {}

      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>RingCentral Connected</title>
            <style>
              body { background: #09090b; color: #22c55e; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { text-align: center; background: #18181b; padding: 32px; border-radius: 16px; border: 1px solid #27272a; max-width: 400px; }
              h2 { margin-top: 0; color: #22c55e; font-size: 20px; font-weight: 700; }
              p { font-size: 13px; color: #a1a1aa; line-height: 1.5; margin-bottom: 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>✓ Connected to RingCentral!</h2>
              <p>Authentication successful. Returning to RC Pulse dashboard...</p>
              <script>
                try {
                  const payload = {
                    type: 'RC_AUTH_SUCCESS',
                    accessToken: ${JSON.stringify(tokens.accessToken)},
                    user: ${JSON.stringify(userProfile)}
                  };
                  localStorage.setItem('rc_oauth_login_data', JSON.stringify(payload));
                  if (window.opener) {
                    window.opener.postMessage(payload, '*');
                  }
                } catch(e) {}
                setTimeout(function() {
                  try {
                    if (window.opener) {
                      window.close();
                    } else {
                      window.location.href = '/?oauth_success=true';
                    }
                  } catch(e) {
                    window.location.href = '/';
                  }
                }, 500);
              </script>
            </div>
          </body>
        </html>
      `)
    } catch (err: any) {
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Token Exchange Failed</title></head>
          <body style="background:#09090b;color:#f43f5e;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
            <div style="text-align:center;background:#18181b;padding:32px;border-radius:16px;border:1px solid #27272a;max-width:440px;">
              <h2 style="margin-top:0;">Token Exchange Failed</h2>
              <p style="font-size:13px;color:#a1a1aa;line-height:1.5;">${err.message}</p>
              <a href="/" style="color:#60a5fa;text-decoration:none;font-size:13px;display:inline-block;margin-top:20px;font-weight:600;">&larr; Return to RC Pulse Login</a>
            </div>
          </body>
        </html>
      `)
    }
  }

  app.get('/oauth/callback', handleOAuthCallback)
  app.get('/callback', handleOAuthCallback)

  app.post('/api/auth/logout', async (req, res) => {
    activeRcClient = null
    await TokenStore.clearTokens()
    res.json({ success: true })
  })

  // Serve static UI or Vite Middleware
  const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.versions && process.versions.electron)

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    })
    app.use(vite.middlewares)
  } else {
    let distPath = process.cwd()
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      if (fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))) {
        distPath = path.join(process.cwd(), 'dist')
      }
    }

    app.use(express.static(distPath))
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }

  const startListening = (port: number, maxTries = 10) => {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`[RC Pulse] Express Server running on http://0.0.0.0:${port}`)
    })

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE' && maxTries > 0) {
        console.warn(`[RC Pulse] Port ${port} in use, trying ${port + 1}...`)
        startListening(port + 1, maxTries - 1)
      } else {
        console.error('[RC Pulse] Server error:', err)
      }
    })
  }

  startListening(PORT)

  if (PORT !== 47831) {
    try {
      const secServer = app.listen(47831, '0.0.0.0', () => {
        console.log('[RC Pulse] Secondary OAuth listener active on http://localhost:47831')
      })
      secServer.on('error', () => {})
    } catch (err) {}
  }
}

startServer()
