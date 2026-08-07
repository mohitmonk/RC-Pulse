// Cloudflare Pages Function handling /api/* routes
export async function onRequest(context: any) {
  const { request, env } = context

  // 1. Service Binding to Cloudflare Worker (Service name: rc-pulse-backend)
  if (env.BACKEND && typeof env.BACKEND.fetch === 'function') {
    return env.BACKEND.fetch(request.clone())
  }

  // 2. HTTP Proxy via BACKEND_URL environment variable
  if (env.BACKEND_URL) {
    const url = new URL(request.url)
    const targetUrl = `${env.BACKEND_URL.replace(/\/$/, '')}${url.pathname}${url.search}`
    
    const headers = new Headers(request.headers)
    return fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: ['GET', 'HEAD', 'OPTIONS'].includes(request.method) ? undefined : await request.arrayBuffer()
    })
  }

  const url = new URL(request.url)
  const pathname = url.pathname

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  })

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers, status: 204 })
  }

  if (pathname === '/api/health') {
    return new Response(
      JSON.stringify({ status: 'ok', app: 'RC Pulse', platform: 'Cloudflare Pages' }),
      { headers, status: 200 }
    )
  }

  if (pathname === '/api/user/me') {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not authenticated with RingCentral' }),
        { headers, status: 401 }
      )
    }

    try {
      const extRes = await fetch('https://platform.ringcentral.com/restapi/v1.0/account/~/extension/~', {
        headers: { Authorization: authHeader }
      })
      if (!extRes.ok) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid or expired RingCentral token' }),
          { headers, status: 401 }
        )
      }
      const extInfo: any = await extRes.json()
      const firstName = extInfo.contact?.firstName || ''
      const lastName = extInfo.contact?.lastName || ''
      const name = extInfo.name || `${firstName} ${lastName}`.trim() || `Extension ${extInfo.extensionNumber || extInfo.id}`

      return new Response(
        JSON.stringify({
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
        }),
        { headers, status: 200 }
      )
    } catch (err: any) {
      return new Response(
        JSON.stringify({ success: false, error: err?.message || 'Failed to fetch user profile' }),
        { headers, status: 500 }
      )
    }
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: 'Worker backend not bound. Add Service Binding "BACKEND" pointing to "rc-pulse-backend" in Cloudflare Pages Settings.'
    }),
    { headers, status: 404 }
  )
}

