import crypto from 'crypto'

export class OAuth {
  public static generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  public static generateCodeChallenge(verifier: string): string {
    return crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  public static buildAuthUrl(params: {
    serverUrl: string
    clientId: string
    redirectUri: string
    state: string
    codeChallenge: string
  }): string {
    const { serverUrl, clientId, redirectUri, state, codeChallenge } = params
    const baseUrl = `${serverUrl.replace(/\/$/, '')}/restapi/oauth/authorize`
    const search = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    })
    return `${baseUrl}?${search.toString()}`
  }
}
