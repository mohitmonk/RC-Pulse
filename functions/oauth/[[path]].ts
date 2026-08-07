// Cloudflare Pages Function handling /oauth/* routes
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

  return new Response(
    `<!DOCTYPE html>
    <html>
      <head><title>Cloudflare Pages - OAuth Handler</title></head>
      <body style="background:#09090b;color:#f43f5e;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="text-align:center;background:#18181b;padding:32px;border-radius:16px;border:1px solid #27272a;max-width:440px;">
          <h2 style="margin-top:0;">OAuth Proxy Service Not Bound</h2>
          <p style="font-size:13px;color:#a1a1aa;line-height:1.6;">Please configure a Service Binding named <strong>BACKEND</strong> pointing to <code>rc-pulse-backend</code> in your Cloudflare Pages settings.</p>
        </div>
      </body>
    </html>`,
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}
