// Cloudflare Worker API for RC Pulse Backend
// Deployable directly to Cloudflare Workers via Wrangler or GitHub Actions

export interface Env {
  RINGCENTRAL_CLIENT_ID?: string
  RINGCENTRAL_CLIENT_SECRET?: string
  RINGCENTRAL_SERVER_URL?: string
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url)
    const pathname = url.pathname

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    }

    // Handle preflight CORS requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders, status: 204 })
    }

    const jsonResponse = (data: any, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    }

    const htmlResponse = (html: string, status = 200) => {
      return new Response(html, {
        status,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...corsHeaders
        }
      })
    }

    // Health Check Endpoint
    if (pathname === '/api/health') {
      return jsonResponse({
        status: 'ok',
        app: 'RC Pulse Backend Worker',
        platform: 'Cloudflare Workers',
        timestamp: new Date().toISOString()
      })
    }

    // User Profile Endpoint
    if (pathname === '/api/user/me') {
      const authHeader = request.headers.get('Authorization')
      if (!authHeader) {
        return jsonResponse({ success: false, error: 'Authorization header is required (Bearer Token)' }, 401)
      }

      const serverUrl = env.RINGCENTRAL_SERVER_URL || 'https://platform.ringcentral.com'
      try {
        const rcRes = await fetch(`${serverUrl.replace(/\/$/, '')}/restapi/v1.0/account/~/extension/~`, {
          headers: { Authorization: authHeader }
        })

        if (!rcRes.ok) {
          const errText = await rcRes.text()
          return jsonResponse({ success: false, error: `RingCentral API error (${rcRes.status}): ${errText}` }, rcRes.status)
        }

        const extInfo: any = await rcRes.json()
        const firstName = extInfo.contact?.firstName || ''
        const lastName = extInfo.contact?.lastName || ''
        const name = extInfo.name || `${firstName} ${lastName}`.trim() || `Extension ${extInfo.extensionNumber || extInfo.id}`

        return jsonResponse({
          success: true,
          user: {
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
          },
          isDemoMode: false
        })
      } catch (err: any) {
        return jsonResponse({ success: false, error: err?.message || 'Failed to communicate with RingCentral REST API' }, 500)
      }
    }

    // Call Logs Endpoint
    if (pathname === '/api/calls') {
      const authHeader = request.headers.get('Authorization')
      if (!authHeader) {
        return jsonResponse({ success: false, error: 'Authorization header is required (Bearer Token)' }, 401)
      }

      const serverUrl = env.RINGCENTRAL_SERVER_URL || 'https://platform.ringcentral.com'
      try {
        const rcRes = await fetch(`${serverUrl.replace(/\/$/, '')}/restapi/v1.0/account/~/extension/~/call-log?view=Detailed&perPage=250`, {
          headers: { Authorization: authHeader }
        })

        if (!rcRes.ok) {
          const errText = await rcRes.text()
          return jsonResponse({ success: false, error: `RingCentral API error (${rcRes.status}): ${errText}` }, rcRes.status)
        }

        const rcData: any = await rcRes.json()
        const calls = (rcData.records || []).map((rec: any) => ({
          id: String(rec.id),
          uri: rec.uri || '',
          sessionId: rec.sessionId || String(rec.id),
          startTime: rec.startTime || new Date().toISOString(),
          duration: rec.duration || 0,
          type: rec.type || 'Voice',
          direction: rec.direction || 'Inbound',
          action: rec.action || 'Phone Call',
          result: rec.result || 'Connected',
          from: {
            phoneNumber: rec.from?.phoneNumber || '',
            name: rec.from?.name || 'Unknown',
            extensionNumber: rec.from?.extensionNumber,
            location: rec.from?.location
          },
          to: {
            phoneNumber: rec.to?.phoneNumber || '',
            name: rec.to?.name || 'Unknown',
            extensionNumber: rec.to?.extensionNumber,
            location: rec.to?.location
          },
          recording: rec.recording ? {
            id: String(rec.recording.id),
            uri: rec.recording.uri || '',
            type: rec.recording.type || 'Automatic',
            contentUri: rec.recording.contentUri || ''
          } : undefined
        }))

        // Compute analytics summary
        const totalCalls = calls.length
        const inboundCalls = calls.filter((c: any) => c.direction === 'Inbound').length
        const outboundCalls = calls.filter((c: any) => c.direction === 'Outbound').length
        const totalTalkTime = calls.reduce((acc: number, c: any) => acc + (c.duration || 0), 0)
        const avgCallDuration = totalCalls > 0 ? Math.round(totalTalkTime / totalCalls) : 0

        return jsonResponse({
          success: true,
          calls,
          analytics: {
            totalCalls,
            inboundCalls,
            outboundCalls,
            totalTalkTime,
            avgCallDuration,
            peakHour: '10:00 AM',
            voicemails: calls.filter((c: any) => c.result === 'Voicemail').length,
            answeredCalls: calls.filter((c: any) => c.result === 'Connected' || c.result === 'Accepted').length,
            missedCalls: calls.filter((c: any) => c.result === 'Missed' || c.result === 'No Answer').length,
            answerRate: totalCalls > 0 ? Math.round((calls.filter((c: any) => c.result === 'Connected' || c.result === 'Accepted').length / totalCalls) * 100) : 0,
            volumeTrend: [],
            directionSplit: [
              { name: 'Inbound', value: inboundCalls },
              { name: 'Outbound', value: outboundCalls }
            ],
            callsByDay: []
          },
          isDemoMode: false
        })
      } catch (err: any) {
        return jsonResponse({ success: false, error: err?.message || 'Failed to fetch call logs' }, 500)
      }
    }

    // Connect & Exchange JWT or Direct Token Endpoint
    if (pathname === '/api/auth/connect' && request.method === 'POST') {
      try {
        const body: any = await request.json()
        const { clientId, clientSecret, serverUrl, jwtToken, accessToken } = body
        const targetServer = serverUrl || env.RINGCENTRAL_SERVER_URL || 'https://platform.ringcentral.com'
        const targetClientId = clientId || env.RINGCENTRAL_CLIENT_ID || ''
        const targetClientSecret = clientSecret || env.RINGCENTRAL_CLIENT_SECRET || ''

        let activeToken = accessToken

        if (!activeToken && jwtToken) {
          const tokenUrl = `${targetServer.replace(/\/$/, '')}/restapi/oauth/token`
          const tokenBody = new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwtToken
          })

          const headers: Record<string, string> = {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
          if (targetClientId && targetClientSecret) {
            headers['Authorization'] = `Basic ${btoa(`${targetClientId}:${targetClientSecret}`)}`
          }

          const tokenRes = await fetch(tokenUrl, {
            method: 'POST',
            headers,
            body: tokenBody.toString()
          })

          if (!tokenRes.ok) {
            const errText = await tokenRes.text()
            return jsonResponse({ success: false, error: `RingCentral Token Exchange failed: ${errText}` }, tokenRes.status)
          }

          const tokenJson: any = await tokenRes.json()
          activeToken = tokenJson.access_token
        }

        if (!activeToken) {
          return jsonResponse({ success: false, error: 'A valid JWT Token or Access Token is required.' }, 400)
        }

        // Fetch User profile to confirm validity
        const profileRes = await fetch(`${targetServer.replace(/\/$/, '')}/restapi/v1.0/account/~/extension/~`, {
          headers: { Authorization: `Bearer ${activeToken}` }
        })

        if (!profileRes.ok) {
          return jsonResponse({ success: false, error: 'Failed to verify RingCentral access token.' }, 401)
        }

        const extInfo: any = await profileRes.json()
        const firstName = extInfo.contact?.firstName || ''
        const lastName = extInfo.contact?.lastName || ''
        const name = extInfo.name || `${firstName} ${lastName}`.trim() || `Extension ${extInfo.extensionNumber || extInfo.id}`

        return jsonResponse({
          success: true,
          accessToken: activeToken,
          user: {
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
          },
          isDemoMode: false
        })
      } catch (err: any) {
        return jsonResponse({ success: false, error: err?.message || 'Authentication error' }, 500)
      }
    }

    // Initiate RingCentral OAuth Login URL Endpoint
    if (pathname === '/api/auth/login' && request.method === 'POST') {
      try {
        const body: any = await request.json().catch(() => ({}))
        const { serverUrl, clientId, redirectUri: userRedirectUri } = body
        const targetServer = serverUrl || env.RINGCENTRAL_SERVER_URL || 'https://platform.ringcentral.com'
        const targetClientId = clientId || env.RINGCENTRAL_CLIENT_ID || ''

        if (!targetClientId) {
          return jsonResponse({
            success: false,
            error: 'RingCentral Client ID (App Key) is required. Set RINGCENTRAL_CLIENT_ID in your Worker Environment Variables or provide it in the login form.'
          }, 400)
        }

        const origin = url.origin
        const finalRedirectUri = (userRedirectUri && userRedirectUri.trim())
          ? userRedirectUri.trim()
          : `${origin}/oauth/callback`

        const authUrl = `${targetServer.replace(/\/$/, '')}/restapi/oauth/authorize?response_type=code&client_id=${encodeURIComponent(targetClientId)}&redirect_uri=${encodeURIComponent(finalRedirectUri)}&state=rc_pulse_state`

        return jsonResponse({
          success: true,
          authUrl,
          redirectUri: finalRedirectUri
        })
      } catch (err: any) {
        return jsonResponse({ success: false, error: err?.message || 'Failed to build OAuth URL' }, 500)
      }
    }

    // OAuth Callback Handler
    if (pathname === '/oauth/callback' || pathname === '/callback') {
      const code = url.searchParams.get('code')
      const error = url.searchParams.get('error')
      const errorDesc = url.searchParams.get('error_description')

      if (error || !code) {
        return htmlResponse(`
          <!DOCTYPE html>
          <html>
            <head><title>RingCentral Auth Failed</title></head>
            <body style="background:#09090b;color:#f43f5e;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
              <div style="text-align:center;background:#18181b;padding:32px;border-radius:16px;border:1px solid #27272a;max-width:440px;">
                <h2 style="margin-top:0;">Authentication Failed</h2>
                <p style="font-size:13px;color:#a1a1aa;line-height:1.6;">${errorDesc || error || 'No authorization code provided.'}</p>
                <a href="/" style="color:#60a5fa;text-decoration:none;font-size:13px;display:inline-block;margin-top:20px;font-weight:600;">&larr; Return to Dashboard</a>
              </div>
            </body>
          </html>
        `, 400)
      }

      return htmlResponse(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>RingCentral Connected</title>
            <style>
              body { background: #09090b; color: #22c55e; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { text-align: center; background: #18181b; padding: 32px; border-radius: 16px; border: 1px solid #27272a; max-width: 400px; }
              h2 { margin-top: 0; color: #22c55e; font-size: 20px; }
              p { font-size: 13px; color: #a1a1aa; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>✓ Connected to RingCentral!</h2>
              <p>Authorization code received. Returning to RC Pulse...</p>
              <script>
                try {
                  if (window.opener) {
                    window.opener.postMessage({ type: 'RC_AUTH_SUCCESS', code: ${JSON.stringify(code)} }, '*');
                    window.close();
                  } else {
                    window.location.href = '/?code=' + encodeURIComponent(${JSON.stringify(code)});
                  }
                } catch(e) {
                  window.location.href = '/';
                }
              </script>
            </div>
          </body>
        </html>
      `, 200)
    }

    return jsonResponse({ success: false, error: 'Endpoint not found' }, 404)
  }
}
