import { useQuery } from '@tanstack/react-query'
import { useDashboardStore } from '../store/dashboardStore'
import { CallLogRecord, CallAnalyticsSummary } from '../../types/call'

interface CallsQueryResult {
  calls: CallLogRecord[]
  analytics: CallAnalyticsSummary
}

export function useCalls() {
  const { dateFilter, customStartDate, customEndDate } = useDashboardStore()

  const query = useQuery<CallsQueryResult, Error>({
    queryKey: ['calls', dateFilter, customStartDate, customEndDate],
    queryFn: async () => {
      if (window.electron) {
        const result = (await window.electron.calls.getCallLogs(
          dateFilter,
          customStartDate,
          customEndDate
        )) as any
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch calls from Electron main process')
        }
        return {
          calls: result.calls,
          analytics: result.analytics
        }
      } else {
        const params = new URLSearchParams({
          filter: dateFilter,
          startDate: customStartDate || '',
          endDate: customEndDate || ''
        })
        const response = await fetch(`/api/calls?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch call logs from API')
        }
        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error || 'API returned failure')
        }
        return {
          calls: data.calls,
          analytics: data.analytics
        }
      }
    },
    refetchInterval: 300000, // Background refresh every 5 minutes
    staleTime: 60000
  })

  return {
    calls: query.data?.calls || [],
    analytics: query.data?.analytics,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch
  }
}
