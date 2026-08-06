import React from 'react'
import { Activity, Shield, Lock, ArrowRight, BarChart3, Download, RefreshCcw } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export const Login: React.FC = () => {
  const { loginWithOAuth, isLoading, error, setDemoMode } = useAuth()

  const handleDemoAccess = () => {
    setDemoMode(true)
    loginWithOAuth()
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="max-w-md w-full bg-[#09090b] border border-[#27272a] rounded-2xl p-8 shadow-2xl relative z-10 space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-center justify-center text-white mx-auto shadow-sm">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">RC Pulse</h1>
          <p className="text-xs text-[#71717a]">RingCentral Telephony & Call Analytics Platform</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={loginWithOAuth}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-zinc-200 text-black font-semibold text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCcw className="w-4 h-4 animate-spin text-black" />
            ) : (
              <>
                <span>Sign in with RingCentral OAuth</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            onClick={handleDemoAccess}
            className="w-full py-2.5 px-4 bg-[#18181b] hover:bg-[#27272a] text-[#e4e4e7] font-medium text-xs rounded-xl border border-[#27272a] transition-colors cursor-pointer"
          >
            Enter Interactive Demo Sandbox
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
          <span>OAuth 2.0 PKCE • Encrypted Token Storage</span>
        </div>
      </div>
    </div>
  )
}

