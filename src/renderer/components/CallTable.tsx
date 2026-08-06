import React, { useState } from 'react'
import {
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Voicemail,
  Play,
  ChevronLeft,
  ChevronRight,
  Clock
} from 'lucide-react'
import { useDashboard } from '../hooks/useDashboard'
import { useDashboardStore } from '../store/dashboardStore'
import { DateUtils } from '../../main/utils/DateUtils'
import { SearchBox } from './SearchBox'

export const CallTable: React.FC = () => {
  const {
    paginatedCalls,
    totalRecords,
    totalPages,
    currentPage,
    setCurrentPage,
    exportCSV,
    exportExcel
  } = useDashboard()

  const {
    directionFilter,
    setDirectionFilter,
    resultFilter,
    setResultFilter,
    pageSize,
    setPageSize
  } = useDashboardStore()

  const [activeRecordingUrl, setActiveRecordingUrl] = useState<string | null>(null)

  const getResultBadge = (result: string) => {
    const res = (result || '').toLowerCase()
    if (res.includes('missed') || res.includes('rejected') || res.includes('no answer')) {
      return (
        <span className="inline-flex items-center gap-1 font-medium text-rose-500 text-xs">
          <PhoneMissed className="w-3 h-3" /> Missed
        </span>
      )
    }
    if (res.includes('voicemail')) {
      return (
        <span className="inline-flex items-center gap-1 font-medium text-amber-500 text-xs">
          <Voicemail className="w-3 h-3" /> Voicemail
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 font-medium text-emerald-500 text-xs">
        Answered
      </span>
    )
  }

  return (
    <div className="bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden shadow-sm">
      {/* Controls Bar */}
      <div className="p-4 border-b border-[#27272a] flex flex-col md:flex-row items-center justify-between gap-3 bg-[#09090b]">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <SearchBox />

          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value as any)}
            className="bg-[#18181b] border border-[#27272a] text-xs text-[#e4e4e7] rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">All Directions</option>
            <option value="Inbound">Inbound</option>
            <option value="Outbound">Outbound</option>
          </select>

          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value as any)}
            className="bg-[#18181b] border border-[#27272a] text-xs text-[#e4e4e7] rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">All Results</option>
            <option value="Connected">Answered</option>
            <option value="Missed">Missed</option>
            <option value="Voicemail">Voicemail</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 rounded-md bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#e4e4e7] text-xs font-medium transition-colors cursor-pointer"
          >
            Export CSV
          </button>
          <button
            onClick={exportExcel}
            className="px-3.5 py-1.5 rounded-md bg-white hover:bg-zinc-200 text-black text-xs font-medium transition-colors cursor-pointer"
          >
            Export Excel
          </button>
        </div>
      </div>

      {/* Audio Player Drawer */}
      {activeRecordingUrl && (
        <div className="bg-[#18181b] border-b border-[#27272a] p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white">
              <Play className="w-3.5 h-3.5 fill-white" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Call Recording Audio Preview</div>
              <div className="text-[10px] text-blue-400 font-mono">{activeRecordingUrl}</div>
            </div>
          </div>
          <button
            onClick={() => setActiveRecordingUrl(null)}
            className="text-[#a1a1aa] hover:text-white text-xs px-2.5 py-1 bg-[#09090b] border border-[#27272a] rounded-md cursor-pointer"
          >
            Close Player
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#27272a] text-[11px] font-medium text-[#71717a] uppercase tracking-wider bg-[#09090b]">
              <th className="py-3 px-4">Direction</th>
              <th className="py-3 px-4">From</th>
              <th className="py-3 px-4">To</th>
              <th className="py-3 px-4">Date & Time</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4">Result</th>
              <th className="py-3 px-4 text-right">Recording</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#18181b] text-xs text-[#e4e4e7]">
            {paginatedCalls.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#71717a] text-xs">
                  No call records found for selected query.
                </td>
              </tr>
            ) : (
              paginatedCalls.map((call) => {
                const { date, time } = DateUtils.formatDateTime(call.startTime)
                return (
                  <tr key={call.id} className="hover:bg-[#18181b]/50 transition-colors">
                    <td className="py-3 px-4">
                      {call.direction === 'Inbound' ? (
                        <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 font-semibold px-2 py-0.5 rounded text-[11px]">
                          <PhoneIncoming className="w-3 h-3" /> INBOUND
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-400 font-semibold px-2 py-0.5 rounded text-[11px]">
                          <PhoneOutgoing className="w-3 h-3" /> OUTBOUND
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{call.from.name || 'Unknown'}</div>
                      <div className="text-[10px] text-[#71717a]">{call.from.phoneNumber}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{call.to.name || 'Unknown'}</div>
                      <div className="text-[10px] text-[#71717a]">{call.to.phoneNumber}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-[#e4e4e7] font-medium">{date}</div>
                      <div className="text-[10px] text-[#71717a]">{time}</div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[#e4e4e7]">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#71717a]" />
                        {DateUtils.formatDuration(call.duration)}
                      </div>
                    </td>

                    <td className="py-3 px-4">{getResultBadge(call.result)}</td>

                    <td className="py-3 px-4 text-right">
                      {call.recording ? (
                        <button
                          onClick={() => setActiveRecordingUrl(call.recording?.contentUri || 'sample_recording.mp3')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-blue-400" /> Play
                        </button>
                      ) : (
                        <span className="text-[#71717a] text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-[#27272a] bg-[#09090b] flex items-center justify-between text-xs text-[#71717a]">
        <div>
          Showing <span className="font-medium text-white">{paginatedCalls.length}</span> of{' '}
          <span className="font-medium text-white">{totalRecords}</span> records
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-[#18181b] border border-[#27272a] text-xs text-[#e4e4e7] rounded px-2 py-1 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="p-1.5 rounded bg-[#18181b] border border-[#27272a] text-[#e4e4e7] hover:bg-[#27272a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium text-white">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="p-1.5 rounded bg-[#18181b] border border-[#27272a] text-[#e4e4e7] hover:bg-[#27272a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

