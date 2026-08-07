import React, { useState } from 'react'
import { Activity, Shield, Lock, ArrowRight, BarChart3, Download, RefreshCcw, Key, Building2, ExternalLink, Globe, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export const Login: React.FC = () => {
  const { loginWithRealAccount, loginWithDemo, loginWithOAuth, isLoading, error } = useAuth()

  // Real Account Credentials state
  const [serverUrl, setServerUrl] = useState('https://platform.ringcentral.com')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [jwtToken, setJwtToken] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleBrowserLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!clientId.trim()) {
      setFormError('Client ID (App Key) is required for Browser OAuth. Please enter your App Key above, or paste a JWT token below.')
      setShowAdvanced(true)
      return
    }

    loginWithOAuth({ serverUrl, clientId: clientId.trim() })
  }

  const handleTokenLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!jwtToken && !accessToken) {
      setFormError('Please enter a RingCentral JWT Token or Access Token.')
      return
    }

    try {
      await loginWithRealAccount({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        serverUrl,
        jwtToken: jwtToken.trim(),
        accessToken: accessToken.trim()
      })
    } catch (err: any) {
      setFormError(err.message || 'Authentication failed. Please check your credentials.')
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-[#09090b] border border-[#27272a] rounded-2xl p-7 shadow-2xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">RC Pulse</h1>
          <p className="text-xs text-[#71717a]">RingCentral Telephony & Call Analytics Platform</p>
        </div>

        {(error || formError) && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3.5 rounded-xl leading-relaxed">
            {error || formError}
          </div>
        )}

        {/* Primary Form: Browser Sign-In */}
        <form onSubmit={handleBrowserLogin} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#a1a1aa] block mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>RingCentral Environment</span>
            </label>
            <select
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="https://platform.ringcentral.com">Production (platform.ringcentral.com)</option>
              <option value="https://platform.devtest.ringcentral.com">Sandbox (devtest.ringcentral.com)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-[#a1a1aa]">
                Client ID / App Key <span className="text-blue-400 font-normal">(Required for OAuth)</span>
              </label>
              <a
                href="https://developer.ringcentral.com/my-account.html#/applications"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>Get App Key</span> <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Paste your RingCentral App Key..."
              className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* Hero Action Button: Sign in via Browser */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCcw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <Globe className="w-4 h-4" />
                <span>Sign in via Browser (RingCentral OAuth)</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>

        {/* Collapsible Token Options */}
        <div className="border-t border-[#27272a] pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-xs font-medium text-[#a1a1aa] hover:text-white py-1 cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-zinc-500" />
              <span>Sign in with JWT or Direct Access Token</span>
            </span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <form onSubmit={handleTokenLogin} className="mt-3 space-y-3 bg-[#18181b]/50 border border-[#27272a] rounded-xl p-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-[#a1a1aa]">RingCentral JWT Token</label>
                  <a
                    href="https://developer.ringcentral.com/my-account.html#/applications"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>Developer Console</span> <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <textarea
                  value={jwtToken}
                  onChange={(e) => setJwtToken(e.target.value)}
                  placeholder="Paste RingCentral App JWT Token..."
                  rows={2}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 font-mono resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#a1a1aa] block mb-1">Bearer Access Token</label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Paste active Bearer token..."
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 bg-white hover:bg-zinc-200 text-black font-semibold text-xs rounded-lg transition-all cursor-pointer disabled:opacity-50"
              >
                Connect Account via Token
              </button>
            </form>
          )}
        </div>

        {/* Demo Sandbox Quick Switch */}
        <div className="pt-2">
          <button
            type="button"
            onClick={loginWithDemo}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-[#18181b] hover:bg-[#27272a] text-[#e4e4e7] font-medium text-xs rounded-xl border border-[#27272a] transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Try Interactive Demo Sandbox</span>
          </button>
        </div>

        {/* Feature Grid */}
        <div className="pt-4 border-t border-[#27272a] grid grid-cols-2 gap-3 text-left">
          <div className="p-3 bg-[#18181b]/60 rounded-xl border border-[#27272a]/80">
            <BarChart3 className="w-4 h-4 text-blue-400 mb-1" />
            <div className="text-xs font-semibold text-white">Call Analytics</div>
            <div className="text-[10px] text-[#71717a] mt-0.5">Real-time trends, peak hours, & call metrics.</div>
          </div>
          <div className="p-3 bg-[#18181b]/60 rounded-xl border border-[#27272a]/80">
            <Download className="w-4 h-4 text-emerald-400 mb-1" />
            <div className="text-xs font-semibold text-white">Excel & CSV</div>
            <div className="text-[10px] text-[#71717a] mt-0.5">One-click formatted workbook exports.</div>
          </div>
        </div>

        {/* Footer Security Note */}
        <div className="text-center flex items-center justify-center gap-1.5 text-[10px] text-[#71717a]">
          <Lock className="w-3 h-3 text-[#71717a]" />
          <span>OAuth 2.0 PKCE • Encrypted Storage</span>
        </div>
      </div>
    </div>
  )
}



