import React, { useState } from 'react'
import {
  Settings as SettingsIcon,
  Shield,
  Key,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'
import { useDashboardStore } from '../store/dashboardStore'
import { AppSettings } from '../../types/settings'

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings } = useDashboardStore()
  const [form, setForm] = useState<AppSettings>(settings)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const handleChange = (key: keyof AppSettings, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateSettings(form)
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-blue-400" /> Desktop Settings & Security
        </h1>
        <p className="text-xs text-[#71717a]">Configure application preferences, auto-refresh intervals, and RingCentral credentials.</p>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Settings saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* RingCentral Credentials Section */}
        <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-white border-b border-[#27272a] pb-3">
            <Key className="w-4 h-4 text-blue-400" /> RingCentral API Credentials
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[#a1a1aa] block mb-1">Client ID (App Key)</label>
              <input
                type="text"
                value={form.ringCentralClientId || ''}
                onChange={(e) => handleChange('ringCentralClientId', e.target.value)}
                placeholder="e.g. 7Y3kL9mQ2xR..."
                className="w-full bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#a1a1aa] block mb-1">Client Secret (App Secret)</label>
              <input
                type="password"
                value={form.ringCentralClientSecret || ''}
                onChange={(e) => handleChange('ringCentralClientSecret', e.target.value)}
                placeholder="••••••••••••••••••••••••"
                className="w-full bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#a1a1aa] block mb-1">Server Platform Environment</label>
            <select
              value={form.ringCentralServerUrl || 'https://platform.devtest.ringcentral.com'}
              onChange={(e) => handleChange('ringCentralServerUrl', e.target.value)}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="https://platform.devtest.ringcentral.com">Sandbox (Developer Test Platform)</option>
              <option value="https://platform.ringcentral.com">Production (Live Enterprise Account)</option>
            </select>
          </div>
        </div>

        {/* Application Preferences */}
        <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-white border-b border-[#27272a] pb-3">
            <RefreshCw className="w-4 h-4 text-blue-400" /> Data Sync & Background Refresh
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[#a1a1aa] block mb-1">Auto-Refresh Interval</label>
              <select
                value={form.refreshIntervalMinutes}
                onChange={(e) => handleChange('refreshIntervalMinutes', Number(e.target.value))}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value={5}>Every 5 Minutes</option>
                <option value={15}>Every 15 Minutes</option>
                <option value={30}>Every 30 Minutes</option>
                <option value={60}>Every Hour</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-[#a1a1aa] block mb-1">Default Date Filter On Startup</label>
              <select
                value={form.defaultDateFilter}
                onChange={(e) => handleChange('defaultDateFilter', e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="this_quarter">This Quarter</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-2 text-xs text-[#a1a1aa] cursor-pointer">
              <input
                type="checkbox"
                checked={form.autoLogin}
                onChange={(e) => handleChange('autoLogin', e.target.checked)}
                className="rounded border-[#27272a] bg-[#18181b] text-blue-600 focus:ring-blue-500"
              />
              <span>Auto-Login using safeStorage encrypted refresh tokens on app startup</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-[#a1a1aa] cursor-pointer">
              <input
                type="checkbox"
                checked={form.enableNotifications}
                onChange={(e) => handleChange('enableNotifications', e.target.checked)}
                className="rounded border-[#27272a] bg-[#18181b] text-blue-600 focus:ring-blue-500"
              />
              <span>Enable Electron desktop notifications for missed calls and sync complete</span>
            </label>
          </div>
        </div>

        {/* Security Info */}
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-[#e4e4e7] space-y-1">
            <div className="font-semibold text-white">Enterprise Token Encryption Policy</div>
            <p className="text-[#71717a] text-[11px] leading-relaxed">
              RC Pulse never stores client secrets or access tokens in plaintext. All tokens are encrypted using OS-level keychains via Electron <code className="text-blue-400 font-mono">safeStorage</code> API.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2 bg-white hover:bg-zinc-200 text-black font-semibold text-xs rounded-md transition-colors cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  )
}

