import { CallLogService } from '../services/CallLogService'
import { AnalyticsService } from '../services/AnalyticsService'
import { ExportService } from '../services/ExportService'
import { ErrorHandler } from '../utils/ErrorHandler'
import { DateFilterType } from '../../types/call'
import { RingCentralClient } from '../auth/RingCentral'

export class CallsIpcHandler {
  public async getCallLogs(
    client: RingCentralClient | null,
    filterType: DateFilterType,
    customStart?: string,
    customEnd?: string
  ) {
    try {
      const calls = await CallLogService.getCallLogs(client, filterType, customStart, customEnd)
      const analytics = AnalyticsService.calculateAnalytics(calls)
      return {
        success: true,
        calls,
        analytics
      }
    } catch (err) {
      return ErrorHandler.handle(err, 'IPC Calls GetCallLogs')
    }
  }

  public async exportCallsCSV(calls: any[]) {
    try {
      const csv = ExportService.exportToCSV(calls)
      return { success: true, csvData: csv }
    } catch (err) {
      return ErrorHandler.handle(err, 'IPC Calls ExportCSV')
    }
  }

  public async exportCallsExcel(calls: any[], summary: any) {
    try {
      const buffer = await ExportService.exportToExcel(calls, summary)
      return { success: true, excelBuffer: buffer }
    } catch (err) {
      return ErrorHandler.handle(err, 'IPC Calls ExportExcel')
    }
  }
}
