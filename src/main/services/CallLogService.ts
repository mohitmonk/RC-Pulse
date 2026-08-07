import { CallLogRecord, DateFilterType } from '../../types/call'
import { RingCentralClient } from '../auth/RingCentral'
import { DateUtils } from '../utils/DateUtils'
import { Logger } from '../utils/Logger'

export class CallLogService {
  public static async getCallLogs(
    client: RingCentralClient,
    filterType: DateFilterType = 'this_month',
    customStart?: string,
    customEnd?: string
  ): Promise<CallLogRecord[]> {
    if (!client) {
      throw new Error('RingCentral client is not authenticated')
    }

    const { startDate, endDate } = DateUtils.getDateRange(filterType, customStart, customEnd)

    try {
      const queryParams = new URLSearchParams({
        dateFrom: startDate,
        dateTo: endDate,
        perPage: '250',
        view: 'Detailed'
      })

      const response = (await client.fetchApi(`/account/~/extension/~/call-log?${queryParams.toString()}`)) as any
      const rawRecords = response.records || []

      return rawRecords.map((r: any) => ({
        id: String(r.id),
        uri: r.uri,
        sessionId: r.sessionId,
        startTime: r.startTime,
        duration: r.duration || 0,
        type: r.type || 'Voice',
        direction: r.direction === 'Outbound' ? 'Outbound' : 'Inbound',
        action: r.action || 'Call',
        result: r.result || 'Connected',
        from: {
          phoneNumber: r.from?.phoneNumber || 'Unknown',
          name: r.from?.name || r.from?.phoneNumber || 'External Call',
          extensionNumber: r.from?.extensionNumber,
          location: r.from?.location
        },
        to: {
          phoneNumber: r.to?.phoneNumber || 'Unknown',
          name: r.to?.name || r.to?.phoneNumber || 'External Call',
          extensionNumber: r.to?.extensionNumber,
          location: r.to?.location
        },
        recording: r.recording ? {
          id: String(r.recording.id),
          uri: r.recording.uri,
          type: r.recording.type,
          contentUri: r.recording.contentUri
        } : undefined
      }))
    } catch (err: any) {
      Logger.error('Failed to fetch call log from RingCentral API:', err)
      return []
    }
  }
}
