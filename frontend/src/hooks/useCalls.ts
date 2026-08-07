import { useQuery } from '@tanstack/react-query'
import { useDashboardStore } from '../store/dashboardStore'
import { useAuthStore } from '../store/authStore'
import { AnalyticsService } from '@/src/main/services/AnalyticsService'
import { CallLogRecord, CallAnalyticsSummary } from '@/src/types/call'

interface CallsQueryResult {
  calls: CallLogRecord[]
  analytics: CallAnalyticsSummary
}

export function useCalls() {
  const { dateFilter, customStartDate, customEndDate } = useDashboardStore()
  const { accessToken } = useAuthStore()

  const query = useQuery<CallsQueryResult, Error>({
    queryKey: ['calls', dateFilter, customStartDate, customEndDate, accessToken],
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

        let response: Response | null = null
        try {
          const headers: Record<string, string> = {}
          if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`
          }
          response = await fetch(`/api/calls?${params.toString()}`, { headers })
        } catch (e) {}

        const contentType = response?.headers.get('content-type') || ''
        if (response && response.ok && contentType.includes('application/json')) {
          const data = await response.json()
          if (data.success) {
            return {
              calls: data.calls,
              analytics: data.analytics
            }
          }
        }

        // Direct browser fetch from RingCentral REST API if static host without Node backend
        if (accessToken) {
          const rcRes = await fetch(`https://platform.ringcentral.com/restapi/v1.0/account/~/extension/~/call-log?view=Detailed&perPage=250`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          })

          if (rcRes.ok) {
            const rcData = await rcRes.json()
            const records: CallLogRecord[] = (rcData.records || []).map((rec: any) => ({
              id: String(rec.id),
              uri: rec.uri || '',
              sessionId: rec.sessionId || String(rec.id),
              startTime: rec.startTime || new Date().toISOString(),
              duration: rec.duration || 0,
              type: rec.type || 'Voice',
              direction: rec.direction || 'Inbound',
              action: rec.action || 'Phone Call',
              result: rec.result || 'Connected',
              from: {
                phoneNumber: rec.from?.phoneNumber || '',
                name: rec.from?.name || 'Unknown',
                extensionNumber: rec.from?.extensionNumber,
                location: rec.from?.location
              },
              to: {
                phoneNumber: rec.to?.phoneNumber || '',
                name: rec.to?.name || 'Unknown',
                extensionNumber: rec.to?.extensionNumber,
                location: rec.to?.location
              },
              recording: rec.recording ? {
                id: String(rec.recording.id),
                uri: rec.recording.uri || '',
                type: rec.recording.type || 'Automatic',
                contentUri: rec.recording.contentUri || ''
              } : undefined
            }))

            const analytics = AnalyticsService.calculateAnalytics(records)
            return { calls: records, analytics }
          }
        }

        throw new Error('Could not retrieve call logs. Please ensure you are logged into RingCentral.')
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
