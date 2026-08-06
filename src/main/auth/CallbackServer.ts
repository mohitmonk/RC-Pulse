import http from 'http'
import { URL } from 'url'
import { Logger } from '../utils/Logger'

export class CallbackServer {
  private server: http.Server | null = null
  private port = 3000

  public start(onCodeReceived: (code: string, state: string) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        if (!req.url) return
        const reqUrl = new URL(req.url, `http://localhost:${this.port}`)
        if (reqUrl.pathname === '/oauth/callback') {
          const code = reqUrl.searchParams.get('code')
          const state = reqUrl.searchParams.get('state')

          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>RC Pulse Authentication Successful</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #020617; color: #f8fafc; display: flex; height: 100vh; align-items: center; justify-content: center; margin: 0; }
                  .card { background: #0f172a; padding: 32px; border-radius: 12px; border: 1px solid #334155; text-align: center; max-width: 400px; shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
                  h1 { color: #6366f1; font-size: 24px; margin-bottom: 8px; }
                  p { color: #94a3b8; font-size: 14px; margin-bottom: 16px; }
                </style>
              </head>
              <body>
                <div class="card">
                  <h1>RC Pulse Authentication</h1>
                  <p>Authorization successful! You can now close this tab and return to RC Pulse.</p>
                </div>
              </body>
            </html>
          `)

          if (code && state) {
            onCodeReceived(code, state)
            this.stop()
          }
        }
      })

      this.server.listen(this.port, () => {
        const redirectUri = `http://localhost:${this.port}/oauth/callback`
        Logger.info(`CallbackServer listening at ${redirectUri}`)
        resolve(redirectUri)
      })

      this.server.on('error', (err) => {
        Logger.error('CallbackServer error:', err)
        reject(err)
      })
    })
  }

  public stop(): void {
    if (this.server) {
      this.server.close()
      this.server = null
      Logger.info('CallbackServer stopped')
    }
  }
}
