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
  let isDemoActive = false

  // User Profile
  app.get('/api/user/me', async (req, res) => {
    try {
      if (isDemoActive || !activeRcClient) {
        // Return demo user if demo mode or unauthenticated fallback
        const user = UserService.getDemoUser()
        return res.json({ success: true, user, isDemoMode: isDemoActive || !activeRcClient })
      }
      
      const user = await UserService.getCurrentUser(activeRcClient)
      res.json({ success: true, user, isDemoMode: false })
    } catch (err: any) {
      console.warn('[RC Pulse] Failed to fetch user from RingCentral API, defaulting to demo user:', err.message)
      res.json({ success: true, user: UserService.getDemoUser(), isDemoMode: true, warning: err.message })
    }
  })

  // Call Logs & Analytics
  app.get('/api/calls', async (req, res) => {
    try {
      const filterType = (req.query.filter as DateFilterType) || 'this_month'
      const customStart = req.query.startDate as string
      const customEnd = req.query.endDate as string

      const clientToUse = isDemoActive ? null : activeRcClient
      const calls = await CallLogService.getCallLogs(clientToUse, filterType, customStart, customEnd)
      const analytics = AnalyticsService.calculateAnalytics(calls)

      res.json({
        success: true,
        calls,
        analytics,
        isDemoMode: isDemoActive || !activeRcClient
      })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message })
    }
  })

  // Auth Routes
  app.post('/api/auth/connect', async (req, res) => {
    try {
      const { clientId, clientSecret, serverUrl, jwtToken, accessToken } = req.body
      const targetServer = serverUrl || 'https://platform.devtest.ringcentral.com'
      
      const client = new RingCentralClient({
        clientId: clientId || '',
        clientSecret: clientSecret || '',
        serverUrl: targetServer
      })

      if (jwtToken) {
        await client.exchangeJwtForToken(jwtToken)
      } else if (accessToken) {
        await client.saveDirectToken(accessToken)
      }

      activeRcClient = client
      isDemoActive = false

      // Fetch real user profile from RingCentral API to confirm connection
      const realUser = await UserService.getCurrentUser(client)

      res.json({
        success: true,
        user: realUser,
        isDemoMode: false
      })
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Authentication with RingCentral failed' })
    }
  })

  app.post('/api/auth/demo', (req, res) => {
    activeRcClient = null
    isDemoActive = true
    res.json({
      success: true,
      user: UserService.getDemoUser(),
      isDemoMode: true
    })
  })

  app.post('/api/auth/login', (req, res) => {
    const { serverUrl, clientId } = req.body || {}
    const targetServer = serverUrl || process.env.RINGCENTRAL_SERVER_URL || 'https://platform.devtest.ringcentral.com'
    const targetClientId = clientId || process.env.RINGCENTRAL_CLIENT_ID || ''

    let authUrl = ''
    if (targetClientId) {
      const redirectUri = encodeURIComponent('http://localhost:3000/oauth/callback')
      authUrl = `${targetServer.replace(/\/$/, '')}/restapi/oauth/authorize?response_type=code&client_id=${encodeURIComponent(targetClientId)}&redirect_uri=${redirectUri}&state=rc_pulse_state`
    } else {
      // Direct login landing page on RingCentral for browser login
      authUrl = `${targetServer.replace(/\/$/, '')}/restapi/oauth/authorize`
    }

    res.json({
      success: true,
      authUrl
    })
  })

  app.post('/api/auth/logout', async (req, res) => {
    activeRcClient = null
    isDemoActive = false
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
}

startServer()
