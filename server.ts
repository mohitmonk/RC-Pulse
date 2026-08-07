import express from 'express'
import path from 'path'
import { createServer as createViteServer } from 'vite'
import { UserService } from './src/main/services/UserService'
import { CallLogService } from './src/main/services/CallLogService'
import { AnalyticsService } from './src/main/services/AnalyticsService'
import { ExportService } from './src/main/services/ExportService'
import { SettingsService } from './src/main/services/SettingsService'
import { DateFilterType } from './src/types/call'
import { RingCentralClient } from './src/main/auth/RingCentral'
import { TokenStore } from './src/main/auth/TokenStore'

import fs from 'fs'

async function startServer() {
  const app = express()
  const PORT = 3000

  app.use(express.json({ limit: '10mb' }))

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'RC Pulse', version: '1.0.0' })
  })

  // App Session State
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

  // Auth Routes
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

      // Fetch real user profile from RingCentral API to confirm connection
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

  app.post('/api/auth/login', (req, res) => {
    const { serverUrl, clientId, clientSecret, redirectUri: userRedirectUri } = req.body || {}
    const targetServer = serverUrl || process.env.RINGCENTRAL_SERVER_URL || 'https://platform.ringcentral.com'
    const targetClientId = clientId || process.env.RINGCENTRAL_CLIENT_ID || '8EYSDHink0fdsQ9W3c4fOj'
    const targetClientSecret = clientSecret || process.env.RINGCENTRAL_CLIENT_SECRET || 'eJ1d3GrHSE2dmQQb33SKQF2YiCZgSp4bAd2DbaFBh4po'

    if (!targetClientId) {
      return res.status(400).json({
        success: false,
        error: 'Client ID (App Key) is required for RingCentral Browser OAuth. Please enter your App Key or use a JWT Token to connect.'
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

    const authUrl = `${targetServer.replace(/\/$/, '')}/restapi/oauth/authorize?response_type=code&client_id=${encodeURIComponent(targetClientId)}&redirect_uri=${encodeURIComponent(finalRedirectUri)}&state=rc_pulse_state`

    res.json({
      success: true,
      authUrl,
      redirectUri: finalRedirectUri
    })
  })

  // RingCentral OAuth Callback handler (handles both /oauth/callback and /callback)
  const handleOAuthCallback = async (req: express.Request, res: express.Response) => {
    const code = req.query.code as string
    const error = req.query.error as string
    const errorDesc = req.query.error_description as string

    if (error || !code) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Authentication Failed</title></head>
          <body style="background:#09090b;color:#f43f5e;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
            <div style="text-align:center;background:#18181b;padding:32px;border-radius:16px;border:1px solid #27272a;max-width:440px;">
              <h2 style="margin-top:0;">Authentication Failed</h2>
              <p style="font-size:13px;color:#a1a1aa;line-height:1.6;">${errorDesc || error || 'No authorization code received.'}</p>
              <div style="margin-top:16px;background:#09090b;padding:12px;border-radius:8px;border:1px solid #27272a;text-align:left;font-size:11px;color:#71717a;">
                <strong style="color:#e4e4e7;">Redirect URI Tip:</strong> Ensure the Redirect URI configured in RingCentral App Console matches character-for-character with the URL specified (e.g. <code>http://localhost:47831/callback</code>).
              </div>
              <a href="/" style="color:#60a5fa;text-decoration:none;font-size:13px;display:inline-block;margin-top:20px;font-weight:600;">&larr; Return to RC Pulse Login</a>
            </div>
          </body>
        </html>
      `)
    }

    try {
      const host = req.get('host') || 'localhost:3000'
      const protocol = req.protocol || 'http'
      const redirectUri = pendingOAuthState?.redirectUri || `${protocol}://${host}/oauth/callback`

      const clientToUse = activeRcClient || (pendingOAuthState ? new RingCentralClient(pendingOAuthState) : new RingCentralClient({
        clientId: process.env.RINGCENTRAL_CLIENT_ID || '8EYSDHink0fdsQ9W3c4fOj',
        clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET || 'eJ1d3GrHSE2dmQQb33SKQF2YiCZgSp4bAd2DbaFBh4po',
        serverUrl: 'https://platform.ringcentral.com'
      }))

      const tokens = await clientToUse.exchangeCodeForToken(code, '', redirectUri)

      await TokenStore.saveTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        tokenType: tokens.tokenType || 'Bearer',
        scope: tokens.scope || '',
        serverUrl: pendingOAuthState?.serverUrl || 'https://platform.ringcentral.com',
        clientId: pendingOAuthState?.clientId || '8EYSDHink0fdsQ9W3c4fOj',
        clientSecret: pendingOAuthState?.clientSecret || 'eJ1d3GrHSE2dmQQb33SKQF2YiCZgSp4bAd2DbaFBh4po',
        isDemoMode: false
      })

      activeRcClient = clientToUse

      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>RingCentral Connected</title>
            <style>
              body { background: #09090b; color: #22c55e; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { text-align: center; background: #18181b; padding: 32px; border-radius: 16px; border: 1px solid #27272a; max-width: 400px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
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
                  if (window.opener) {
                    window.opener.postMessage({ type: 'RC_AUTH_SUCCESS' }, '*');
                  }
                } catch(e) {}
                setTimeout(function() {
                  try {
                    if (window.opener) {
                      window.close();
                    } else {
                      window.location.href = '/';
                    }
                  } catch(e) {
                    window.location.href = '/';
                  }
                }, 600);
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
              <div style="margin-top:16px;background:#09090b;padding:12px;border-radius:8px;border:1px solid #27272a;text-align:left;font-size:11px;color:#71717a;">
                <strong style="color:#e4e4e7;">Redirect URI mismatch?</strong> Check that the <strong>OAuth Redirect URI</strong> in your RingCentral App Console matches character-for-character with the URL being sent.
              </div>
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

  // Determine production vs dev mode
  const isProduction =
    process.env.NODE_ENV === 'production' || Boolean(process.versions && process.versions.electron)

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    })
    app.use(vite.middlewares)
  } else {
    let distPath = __dirname
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      if (fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))) {
        distPath = path.join(process.cwd(), 'dist')
      } else if (fs.existsSync(path.join(__dirname, 'dist', 'index.html'))) {
        distPath = path.join(__dirname, 'dist')
      } else if (fs.existsSync(path.join(__dirname, '../dist', 'index.html'))) {
        distPath = path.join(__dirname, '../dist')
      }
    }

    app.use(express.static(distPath))
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }

  const initialPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000

  const startListening = (port: number, maxTries = 10) => {
    const server = app.listen(port, '0.0.0.0', async () => {
      console.log(`[RC Pulse] Express Server running on http://localhost:${port}`)

      // If running inside Electron desktop container, launch BrowserWindow
      if (process.versions && process.versions.electron) {
        try {
          const electron = await import('electron')
          const electronApp = electron.app || electron.default?.app
          const BrowserWindow = electron.BrowserWindow || electron.default?.BrowserWindow

          if (electronApp && BrowserWindow) {
            await electronApp.whenReady()

            const win = new BrowserWindow({
              width: 1280,
              height: 800,
              minWidth: 900,
              minHeight: 600,
              title: 'RC Pulse - RingCentral Analytics Dashboard',
              autoHideMenuBar: true,
              backgroundColor: '#09090b',
              webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
              }
            })

            win.loadURL(`http://localhost:${port}`)

            electronApp.on('window-all-closed', () => {
              if (process.platform !== 'darwin') {
                electronApp.quit()
              }
            })
          }
        } catch (err) {
          console.error('[RC Pulse] Failed to open Electron window:', err)
        }
      }
    })

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE' && maxTries > 0) {
        console.warn(`[RC Pulse] Port ${port} is in use, retrying on port ${port + 1}...`)
        startListening(port + 1, maxTries - 1)
      } else {
        console.error('[RC Pulse] Express Server error:', err)
      }
    })
  }

  startListening(initialPort)

  // Secondary OAuth listener on port 47831 if registered in RingCentral App Console
  if (initialPort !== 47831) {
    try {
      const secServer = app.listen(47831, '0.0.0.0', () => {
        console.log('[RC Pulse] Secondary OAuth listener active on http://localhost:47831')
      })
      secServer.on('error', (err: any) => {
        console.log('[RC Pulse] Secondary listener on port 47831 skipped:', err.message)
      })
    } catch (err: any) {
      console.log('[RC Pulse] Could not start secondary listener on port 47831')
    }
  }
}

startServer()
