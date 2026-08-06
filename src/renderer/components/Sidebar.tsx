import React from 'react'
import { LayoutDashboard, PhoneCall, Settings as SettingsIcon, Radio, ShieldCheck } from 'lucide-react'
import { useDashboardStore, NavTab } from '../store/dashboardStore'
import { useAuth } from '../hooks/useAuth'

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useDashboardStore()
  const { user } = useAuth()

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'call_logs', label: 'Call History', icon: PhoneCall },
    { id: 'settings', label: 'Settings', icon: SettingsIcon }
  ]

  return (
    <aside className="w-60 bg-[#09090b] border-r border-[#27272a] flex flex-col justify-between shrink-0 h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="h-16 border-b border-[#27272a] px-6 flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 shrink-0 shadow-sm shadow-blue-500/20" />
          <span className="font-bold text-lg text-white tracking-tight">RC Pulse</span>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#27272a] text-white font-semibold'
                    : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-[#a1a1aa]'}`} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Footer User & API Status Widget */}
      <div className="p-4 border-t border-[#27272a]">
        <div className="flex items-center gap-3 p-1.5 rounded-lg">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-[#27272a]" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#27272a] text-white font-semibold text-xs flex items-center justify-center shrink-0">
              {user?.firstName?.[0] || 'A'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white truncate">{user?.name || 'Alex Rivera'}</div>
            <div className="text-[11px] text-[#71717a] truncate">Ext. {user?.extensionNumber || '101'}</div>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[#27272a]/60 flex items-center justify-between text-[11px] text-[#71717a]">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>API Online</span>
          </span>
          <span className="flex items-center gap-1 text-[#22c55e] font-mono text-[10px]">
            <ShieldCheck className="w-3 h-3 text-indigo-400" /> PKCE
          </span>
        </div>
      </div>
    </aside>
  )
}

