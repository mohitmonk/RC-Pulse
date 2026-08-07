// Cloudflare Worker API for RC Pulse Backend
// Deployable directly to Cloudflare Workers via Wrangler or GitHub Actions

function encodeOAuthState(payload: any): string {
  try {
    const json = JSON.stringify({ ...payload, timestamp: Date.now() })
    const base64 = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))))
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  } catch (e) {
    return 'rc_pulse_state'
  }
}

function decodeOAuthState(stateStr: string): any {
  if (!stateStr || stateStr === 'rc_pulse_state') return null
  try {
    let clean = decodeURIComponent(stateStr).trim()
    clean = clean.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/')
    while (clean.length % 4) {
      clean += '='
    }
    const json = decodeURIComponent(Array.prototype.map.call(atob(clean), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
    return JSON.parse(json)
  } catch (e) {
    return null
  }
}

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
        const { serverUrl, clientId, clientSecret, redirectUri: userRedirectUri } = body
        const targetServer = serverUrl || env.RINGCENTRAL_SERVER_URL || 'https://platform.ringcentral.com'
        const targetClientId = clientId || env.RINGCENTRAL_CLIENT_ID || '8EYSDHink0fdsQ9W3c4fOj'
        const targetClientSecret = clientSecret || env.RINGCENTRAL_CLIENT_SECRET || 'eJ1d3GrHSE2dmQQb33SKQF2YiCZgSp4bAd2DbaFBh4po'

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

        const stateStr = encodeOAuthState({
          clientId: targetClientId,
          clientSecret: targetClientSecret,
          serverUrl: targetServer,
          redirectUri: finalRedirectUri
        })

        const authUrl = `${targetServer.replace(/\/$/, '')}/restapi/oauth/authorize?response_type=code&client_id=${encodeURIComponent(targetClientId)}&redirect_uri=${encodeURIComponent(finalRedirectUri)}&state=${encodeURIComponent(stateStr)}`

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
      const rawState = url.searchParams.get('state')

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

      let clientId = env.RINGCENTRAL_CLIENT_ID || '8EYSDHink0fdsQ9W3c4fOj'
      let clientSecret = env.RINGCENTRAL_CLIENT_SECRET || 'eJ1d3GrHSE2dmQQb33SKQF2YiCZgSp4bAd2DbaFBh4po'
      let serverUrl = env.RINGCENTRAL_SERVER_URL || 'https://platform.ringcentral.com'
      let redirectUri = `${url.origin}/oauth/callback`

      if (rawState) {
        const decoded = decodeOAuthState(rawState)
        if (decoded) {
          if (decoded.clientId) clientId = decoded.clientId
          if (decoded.clientSecret) clientSecret = decoded.clientSecret
          if (decoded.serverUrl) serverUrl = decoded.serverUrl
          if (decoded.redirectUri) redirectUri = decoded.redirectUri
        }
      }

      try {
        // Exchange authorization code for access token with RingCentral REST API
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

        if (!tokenRes.ok) {
          const errText = await tokenRes.text()
          return htmlResponse(`
            <!DOCTYPE html>
            <html>
              <head><title>Token Exchange Failed</title></head>
              <body style="background:#09090b;color:#f43f5e;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
                <div style="text-align:center;background:#18181b;padding:32px;border-radius:16px;border:1px solid #27272a;max-width:440px;">
                  <h2 style="margin-top:0;color:#f43f5e;">Authentication Exchange Failed</h2>
                  <p style="font-size:12px;color:#a1a1aa;line-height:1.6;word-break:break-all;">${errText}</p>
                  <a href="/" style="color:#60a5fa;text-decoration:none;font-size:13px;display:inline-block;margin-top:20px;font-weight:600;">&larr; Return to Login</a>
                </div>
              </body>
            </html>
          `, 400)
        }

        const tokenJson: any = await tokenRes.json()
        const accessToken = tokenJson.access_token

        // Fetch User Profile
        const profileRes = await fetch(`${serverUrl.replace(/\/$/, '')}/restapi/v1.0/account/~/extension/~`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })

        let userProfile = null
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

        return htmlResponse(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>RingCentral Connected</title>
              <style>
                body { background: #09090b; color: #22c55e; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { text-align: center; background: #18181b; padding: 32px; border-radius: 16px; border: 1px solid #27272a; max-width: 400px; }
                h2 { margin-top: 0; color: #22c55e; font-size: 20px; font-weight: 700; }
                p { font-size: 13px; color: #a1a1aa; line-height: 1.5; }
              </style>
            </head>
            <body>
              <div class="card">
                <h2>✓ RingCentral Connected!</h2>
                <p>Authentication successful. Returning to RC Pulse...</p>
                <script>
                  try {
                    const payload = {
                      type: 'RC_AUTH_SUCCESS',
                      accessToken: ${JSON.stringify(accessToken)},
                      user: ${JSON.stringify(userProfile)}
                    };
                    localStorage.setItem('rc_oauth_login_data', JSON.stringify(payload));
                    if (window.opener) {
                      window.opener.postMessage(payload, '*');
                      setTimeout(function() { window.close(); }, 500);
                    } else {
                      window.location.href = '/?oauth_success=true';
                    }
                  } catch(e) {
                    window.location.href = '/';
                  }
                </script>
              </div>
            </body>
          </html>
        `, 200)
      } catch (err: any) {
        return htmlResponse(`
          <!DOCTYPE html>
          <html>
            <head><title>OAuth Error</title></head>
            <body style="background:#09090b;color:#f43f5e;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
              <div style="text-align:center;background:#18181b;padding:32px;border-radius:16px;border:1px solid #27272a;max-width:440px;">
                <h2 style="margin-top:0;">OAuth Processing Error</h2>
                <p style="font-size:13px;color:#a1a1aa;line-height:1.6;">${err?.message || 'Server error during OAuth process'}</p>
                <a href="/" style="color:#60a5fa;text-decoration:none;font-size:13px;display:inline-block;margin-top:20px;font-weight:600;">&larr; Return to Login</a>
              </div>
            </body>
          </html>
        `, 500)
      }
    }

    return jsonResponse({ success: false, error: 'Endpoint not found' }, 404)
  }
}
