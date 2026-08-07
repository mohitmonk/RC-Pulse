import { useMemo } from 'react'
import { useDashboardStore } from '../store/dashboardStore'
import { useCalls } from './useCalls'
import { CallLogRecord } from '@/src/types/call'

export function useDashboard() {
  const { calls, analytics, isLoading, isError, error, refetch } = useCalls()
  const {
    searchQuery,
    directionFilter,
    resultFilter,
    currentPage,
    pageSize,
    setCurrentPage
  } = useDashboardStore()

  // Filter & Search calls
  const filteredCalls = useMemo(() => {
    let list = [...calls]

    if (directionFilter !== 'all') {
      list = list.filter((c) => c.direction === directionFilter)
    }

    if (resultFilter !== 'all') {
      if (resultFilter === 'Missed') {
        list = list.filter((c) => {
          const res = (c.result || '').toLowerCase()
          return res.includes('missed') || res.includes('rejected') || res.includes('no answer')
        })
      } else if (resultFilter === 'Voicemail') {
        list = list.filter((c) => (c.result || '').toLowerCase().includes('voicemail'))
      } else if (resultFilter === 'Connected') {
        list = list.filter((c) => {
          const res = (c.result || '').toLowerCase()
          return res.includes('connected') || res.includes('accepted')
        })
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (c) =>
          c.from.name?.toLowerCase().includes(q) ||
          c.from.phoneNumber?.toLowerCase().includes(q) ||
          c.to.name?.toLowerCase().includes(q) ||
          c.to.phoneNumber?.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.result.toLowerCase().includes(q)
      )
    }

    return list
  }, [calls, directionFilter, resultFilter, searchQuery])

  // Pagination
  const totalRecords = filteredCalls.length
  const totalPages = Math.ceil(totalRecords / pageSize) || 1
  const paginatedCalls = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredCalls.slice(start, start + pageSize)
  }, [filteredCalls, currentPage, pageSize])

  const exportCSV = async () => {
    if (window.electron) {
      const res = (await window.electron.calls.exportCSV(filteredCalls)) as any
      if (res.success && res.csvData) {
        const blob = new Blob([res.csvData], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `rc_pulse_calls_${Date.now()}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    } else {
      const response = await fetch('/api/calls/export/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calls: filteredCalls })
      })
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rc_pulse_calls_${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const exportExcel = async () => {
    if (window.electron) {
      const res = (await window.electron.calls.exportExcel(filteredCalls, analytics)) as any
      if (res.success && res.excelBuffer) {
        const blob = new Blob([res.excelBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `rc_pulse_analytics_${Date.now()}.xlsx`
        a.click()
        URL.revokeObjectURL(url)
      }
    } else {
      const response = await fetch('/api/calls/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calls: filteredCalls, summary: analytics })
      })
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rc_pulse_analytics_${Date.now()}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return {
    rawCallsCount: calls.length,
    filteredCalls,
    paginatedCalls,
    analytics,
    isLoading,
    isError,
    error,
    currentPage,
    totalPages,
    totalRecords,
    setCurrentPage,
    refetch,
    exportCSV,
    exportExcel
  }
}
