import React from 'react'
import { Search, X } from 'lucide-react'
import { useDashboardStore } from '../store/dashboardStore'

export const SearchBox: React.FC = () => {
  const { searchQuery, setSearchQuery } = useDashboardStore()

  return (
    <div className="relative w-full max-w-xs">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71717a]">
        <Search className="w-3.5 h-3.5" />
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search call records..."
        className="w-full pl-8 pr-8 py-1.5 text-xs bg-[#18181b] border border-[#27272a] rounded-md text-white placeholder-[#71717a] focus:outline-none focus:border-blue-500 transition-colors"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#71717a] hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

