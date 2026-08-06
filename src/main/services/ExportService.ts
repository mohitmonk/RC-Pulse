import ExcelJS from 'exceljs'
import Papa from 'papaparse'
import { CallLogRecord, CallAnalyticsSummary } from '../../types/call'
import { DateUtils } from '../utils/DateUtils'

export class ExportService {
  public static exportToCSV(calls: CallLogRecord[]): string {
    const data = calls.map(c => {
      const { date, time } = DateUtils.formatDateTime(c.startTime)
      return {
        'Call ID': c.id,
        'Date': date,
        'Time': time,
        'Direction': c.direction,
        'From Name': c.from.name || 'N/A',
        'From Number': c.from.phoneNumber || 'N/A',
        'To Name': c.to.name || 'N/A',
        'To Number': c.to.phoneNumber || 'N/A',
        'Duration (sec)': c.duration,
        'Formatted Duration': DateUtils.formatDuration(c.duration),
        'Result': c.result,
        'Recording Link': c.recording?.contentUri || 'None'
      }
    })

    return Papa.unparse(data)
  }

  public static async exportToExcel(calls: CallLogRecord[], summary: CallAnalyticsSummary): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'RC Pulse Desktop Analytics'
    workbook.created = new Date()

    // Sheet 1: Summary Dashboard
    const summarySheet = workbook.addWorksheet('Analytics Summary')
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 25 }
    ]

    summarySheet.addRows([
      { metric: 'Total Calls Analyzed', value: summary.totalCalls },
      { metric: 'Inbound Calls', value: summary.inboundCalls },
      { metric: 'Outbound Calls', value: summary.outboundCalls },
      { metric: 'Answered Calls', value: summary.answeredCalls },
      { metric: 'Missed Calls', value: summary.missedCalls },
      { metric: 'Voicemail Count', value: summary.voicemailCalls },
      { metric: 'Answer Rate', value: `${summary.answerRatePercentage}%` },
      { metric: 'Total Talk Time', value: DateUtils.formatDuration(summary.totalDurationSeconds) },
      { metric: 'Average Call Duration', value: DateUtils.formatDuration(summary.avgDurationSeconds) },
      { metric: 'Longest Call', value: DateUtils.formatDuration(summary.longestCallSeconds) },
      { metric: 'Peak Calling Hour', value: summary.peakCallingHour }
    ])

    // Header styling
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } }
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4F46E5' } // Indigo
    }

    // Sheet 2: Call Records
    const recordsSheet = workbook.addWorksheet('Detailed Call Logs')
    recordsSheet.columns = [
      { header: 'Call ID', key: 'id', width: 18 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Time', key: 'time', width: 15 },
      { header: 'Direction', key: 'direction', width: 12 },
      { header: 'From Name', key: 'fromName', width: 22 },
      { header: 'From Number', key: 'fromNumber', width: 18 },
      { header: 'To Name', key: 'toName', width: 22 },
      { header: 'To Number', key: 'toNumber', width: 18 },
      { header: 'Duration', key: 'duration', width: 15 },
      { header: 'Result', key: 'result', width: 15 }
    ]

    recordsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } }
    recordsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E293B' } // Slate 800
    }

    calls.forEach(c => {
      const { date, time } = DateUtils.formatDateTime(c.startTime)
      recordsSheet.addRow({
        id: c.id,
        date,
        time,
        direction: c.direction,
        fromName: c.from.name || 'N/A',
        fromNumber: c.from.phoneNumber || 'N/A',
        toName: c.to.name || 'N/A',
        toNumber: c.to.phoneNumber || 'N/A',
        duration: DateUtils.formatDuration(c.duration),
        result: c.result
      })
    })

    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
  }
}
