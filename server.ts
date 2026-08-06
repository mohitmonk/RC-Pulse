import express from 'express'
import path from 'path'
import { createServer as createViteServer } from 'vite'
import { UserService } from './src/main/services/UserService'
import { CallLogService } from './src/main/services/CallLogService'
import { AnalyticsService } from './src/main/services/AnalyticsService'
import { ExportService } from './src/main/services/ExportService'
import { SettingsService } from './src/main/services/SettingsService'
import { DateFilterType } from './src/types/call'

async function startServer() {
  const app = express()
  const PORT = 3000

  app.use(express.json({ limit: '10mb' }))

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'RC Pulse', version: '1.0.0' })
  })

  // User Profile
  app.get('/api/user/me', async (req, res) => {
    try {
      const user = await UserService.getCurrentUser(null)
      res.json({ success: true, user })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message })
    }
  })

  // Call Logs & Analytics
  app.get('/api/calls', async (req, res) => {
    try {
      const filterType = (req.query.filter as DateFilterType) || 'this_month'
      const customStart = req.query.startDate as string
      const customEnd = req.query.endDate as string

      const calls = await CallLogService.getCallLogs(null, filterType, customStart, customEnd)
      const analytics = AnalyticsService.calculateAnalytics(calls)

      res.json({
        success: true,
        calls,
        analytics
      })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message })
    }
  })

  // CSV Export
  app.post('/api/calls/export/csv', (req, res) => {
    try {
      const { calls } = req.body
      const csv = ExportService.exportToCSV(calls || [])
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="rc_pulse_call_logs.csv"')
      res.send(csv)
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message })
    }
  })

  // Excel Export
  app.post('/api/calls/export/excel', async (req, res) => {
    try {
      const { calls, summary } = req.body
      const buffer = await ExportService.exportToExcel(calls || [], summary || {})
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', 'attachment; filename="rc_pulse_analytics.xlsx"')
      res.send(buffer)
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message })
    }
  })

  // Settings
  app.get('/api/settings', (req, res) => {
    const settings = SettingsService.getSettings()
    res.json({ success: true, settings })
  })

  app.post('/api/settings', (req, res) => {
    const settings = SettingsService.updateSettings(req.body)
    res.json({ success: true, settings })
  })

  // Auth mock/sandbox toggle
  app.post('/api/auth/login', (req, res) => {
    res.json({
      success: true,
      authUrl: 'http://localhost:3000/oauth/callback?code=mock_rc_code_9912&state=mock_state'
    })
  })

  app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true })
  })

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    })
    app.use(vite.middlewares)
  } else {
    const distPath = path.join(process.cwd(), 'dist')
    app.use(express.static(distPath))
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RC Pulse] Express Server running on http://0.0.0.0:${PORT}`)
  })
}

startServer()
