import React from 'react'
import { LucideIcon } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  subValue?: string
  icon: LucideIcon
  badgeText?: string
  badgeColor?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'slate'
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subValue,
  icon: Icon,
  badgeText,
  badgeColor = 'indigo'
}) => {
  const isNegative = badgeColor === 'rose'

  return (
    <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 flex flex-col justify-between hover:border-[#3f3f46] transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">{title}</span>
          <div className="text-2xl font-semibold text-white tracking-tight mt-1">{value}</div>
        </div>
        <div className="p-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[#a1a1aa]">
          <Icon className="w-4 h-4 text-[#a1a1aa]" />
        </div>
      </div>

      {(subValue || badgeText) && (
        <div className="mt-3 pt-3 border-t border-[#27272a]/60 flex items-center justify-between text-xs">
          {subValue && <span className="text-[#a1a1aa] text-[11px]">{subValue}</span>}
          {badgeText && (
            <span
              className={`text-[11px] font-medium flex items-center gap-1 ${
                isNegative ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {isNegative ? '▼' : '▲'} {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

