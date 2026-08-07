import React, { useState } from 'react'
import { Calendar, ChevronDown, Check } from 'lucide-react'
import { useDashboardStore } from '../store/dashboardStore'
import { DateFilterType } from '@/src/types/call'

const filterOptions: { label: string; value: DateFilterType }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'this_week' },
  { label: 'Last Week', value: 'last_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'This Quarter', value: 'this_quarter' },
  { label: 'Last Quarter', value: 'last_quarter' },
  { label: 'Last 6 Months', value: 'last_6_months' },
  { label: 'Last Year', value: 'last_year' },
  { label: 'Custom Range', value: 'custom' },
]

export const DateFilter: React.FC = () => {
  const { dateFilter, setDateFilter, customStartDate, customEndDate, setCustomDateRange } = useDashboardStore()
  const [isOpen, setIsOpen] = useState(false)
  const [startInput, setStartInput] = useState(customStartDate)
  const [endInput, setEndInput] = useState(customEndDate)

  const activeLabel = filterOptions.find((o) => o.value === dateFilter)?.label || 'This Month'

  const handleApplyCustom = () => {
    if (startInput && endInput) {
      setCustomDateRange(startInput, endInput)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#18181b] border border-[#27272a] text-xs font-medium text-[#e4e4e7] hover:bg-[#27272a] transition-colors cursor-pointer"
      >
        <Calendar className="w-3.5 h-3.5 text-blue-400" />
        <span>{activeLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#71717a] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#09090b] border border-[#27272a] shadow-2xl z-30 p-2 overflow-hidden text-zinc-200">
            <div className="text-[10px] uppercase font-semibold text-[#71717a] px-3 py-1 tracking-wider">
              Time Period
            </div>
            <div className="space-y-0.5 max-h-60 overflow-y-auto">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    if (option.value !== 'custom') {
                      setDateFilter(option.value)
                      setIsOpen(false)
                    } else {
                      setDateFilter('custom')
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                    dateFilter === option.value
                      ? 'bg-[#27272a] text-white font-medium'
                      : 'hover:bg-[#18181b] text-[#a1a1aa]'
                  }`}
                >
                  <span>{option.label}</span>
                  {dateFilter === option.value && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>
              ))}
            </div>

            {dateFilter === 'custom' && (
              <div className="mt-2 pt-2 border-t border-[#27272a] space-y-2 px-2">
                <div>
                  <label className="text-[10px] text-[#71717a] block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startInput}
                    onChange={(e) => setStartInput(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#71717a] block mb-1">End Date</label>
                  <input
                    type="date"
                    value={endInput}
                    onChange={(e) => setEndInput(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded px-2 py-1 text-xs text-white"
                  />
                </div>
                <button
                  onClick={handleApplyCustom}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded transition-colors cursor-pointer"
                >
                  Apply Date Range
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

