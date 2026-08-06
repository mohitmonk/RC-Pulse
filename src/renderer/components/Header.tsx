import React, { useState, useEffect } from 'react'
import { RefreshCw, Bell, LogOut, Shield, Circle, Download } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useDashboard } from '../hooks/useDashboard'
import { useDashboardStore } from '../store/dashboardStore'
import { DateFilter } from './DateFilter'
import dayjs from 'dayjs'

export const Header: React.FC = () => {
  const { user, handleLogout, isDemoMode } = useAuth()
  const { refetch, isLoading, exportCSV } = useDashboard()
  const { activeTab } = useDashboardStore()
  const [timeStr, setTimeStr] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    const update = () => setTimeStr(dayjs().format('ddd, MMM DD · hh:mm:ss A'))
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard'
      case 'call_logs':
        return 'Call History'
      case 'settings':
        return 'Settings'
      default:
        return 'Overview'
    }
  }

  return (
    <header className="h-16 border-b border-[#27272a] bg-[#09090b] px-8 flex items-center justify-between sticky top-0 z-10">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-4">
        <div className="text-xs text-[#71717a]">
          Overview / <span className="text-white font-medium">{getTabTitle()}</span>
        </div>

        <div className="hidden xl:flex items-center gap-2 text-xs text-[#71717a] font-mono pl-4 border-l border-[#27272a]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{timeStr}</span>
        </div>
      </div>

      {/* Right: Date Filter, Actions & Profile */}
      <div className="flex items-center gap-3">
        {isDemoMode && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
            <Shield className="w-3 h-3 text-indigo-400" /> Demo Sandbox
          </span>
        )}

        <DateFilter />

        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="p-1.5 rounded-md bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a] transition-colors cursor-pointer disabled:opacity-50"
          title="Refresh Call Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
        </button>

        <button
          onClick={exportCSV}
          className="hidden sm:inline-flex items-center gap-1.5 bg-white text-black border-none rounded-md px-3.5 py-1.5 text-xs font-medium hover:bg-zinc-200 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" /> Export Data
        </button>

        <button className="p-1.5 rounded-md bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:text-white transition-colors relative cursor-pointer">
          <Bell className="w-3.5 h-3.5" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full" />
        </button>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-md hover:bg-[#18181b] transition-colors cursor-pointer"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full object-cover border border-[#27272a]" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center">
                {user?.firstName?.[0] || 'U'}
              </div>
            )}
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#09090b] border border-[#27272a] shadow-2xl z-30 p-2 text-zinc-200">
                <div className="p-2.5 border-b border-[#27272a] mb-1">
                  <div className="text-xs font-semibold text-white">{user?.name}</div>
                  <div className="text-[11px] text-[#71717a]">{user?.email}</div>
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    <Circle className="w-2 h-2 fill-emerald-400" /> Status: {user?.presenceStatus || 'Available'}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

