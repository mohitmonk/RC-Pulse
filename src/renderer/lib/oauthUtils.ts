export interface OAuthStatePayload {
  clientId?: string
  clientSecret?: string
  serverUrl?: string
  redirectUri?: string
  timestamp?: number
}

export function encodeOAuthState(payload: OAuthStatePayload): string {
  try {
    const json = JSON.stringify({ ...payload, timestamp: Date.now() })
    let base64 = ''
    if (typeof Buffer !== 'undefined') {
      base64 = Buffer.from(json, 'utf8').toString('base64')
    } else {
      base64 = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))))
    }
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  } catch (e) {
    return 'rc_pulse_state'
  }
}

export function decodeOAuthState(stateStr: string): OAuthStatePayload | null {
  if (!stateStr || stateStr === 'rc_pulse_state') return null
  try {
    let clean = decodeURIComponent(stateStr).trim()
    clean = clean.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/')
    while (clean.length % 4) {
      clean += '='
    }
    let json = ''
    if (typeof Buffer !== 'undefined') {
      json = Buffer.from(clean, 'base64').toString('utf8')
    } else {
      json = decodeURIComponent(Array.prototype.map.call(atob(clean), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
    }
    return JSON.parse(json)
  } catch (e) {
    console.error('Failed to decode OAuth state string:', e)
    return null
  }
}
