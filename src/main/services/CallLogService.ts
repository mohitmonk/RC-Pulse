import { CallLogRecord, CallDirection, CallResult, DateFilterType } from '../../types/call'
import { RingCentralClient } from '../auth/RingCentral'
import { DateUtils } from '../utils/DateUtils'
import { Logger } from '../utils/Logger'
import dayjs from 'dayjs'

export class CallLogService {
  private static cachedDemoCalls: CallLogRecord[] | null = null

  public static generateDemoCalls(): CallLogRecord[] {
    if (this.cachedDemoCalls) {
      return this.cachedDemoCalls
    }

    const contacts = [
      { name: 'Alex Mercer', number: '+1 (415) 890-1234', location: 'San Francisco, CA' },
      { name: 'David Vance', number: '+1 (212) 555-0192', location: 'New York, NY' },
      { name: 'Elena Rostova', number: '+1 (312) 443-8821', location: 'Chicago, IL' },
      { name: 'Marcus Sterling', number: '+1 (214) 880-9912', location: 'Dallas, TX' },
      { name: 'Priya Sharma', number: '+1 (206) 771-3320', location: 'Seattle, WA' },
      { name: 'Jordan Hayes', number: '+1 (408) 992-1100', location: 'San Jose, CA' },
      { name: 'Rachel Green', number: '+1 (305) 662-4411', location: 'Miami, FL' },
      { name: 'Thomas Wright', number: '+1 (617) 220-7788', location: 'Boston, MA' },
      { name: 'Chloe Bennett', number: '+1 (303) 551-9944', location: 'Denver, CO' },
      { name: 'Michael Scott', number: '+1 (570) 990-2233', location: 'Scranton, PA' },
    ]

    const callResults: CallResult[] = ['Connected', 'Connected', 'Connected', 'Accepted', 'Missed', 'Voicemail', 'Rejected', 'No Answer']
    const records: CallLogRecord[] = []
    const now = dayjs()

    // Generate 250 realistic calls spanning the last 365 days
    for (let i = 0; i < 250; i++) {
      const contactIndex = Math.floor(Math.random() * contacts.length)
      const contact = contacts[contactIndex]
      const isOutbound = Math.random() > 0.45
      const direction: CallDirection = isOutbound ? 'Outbound' : 'Inbound'
      
      // Random result
      const result = callResults[Math.floor(Math.random() * callResults.length)]
      
      // Duration based on result
      let duration = 0
      if (result === 'Connected' || result === 'Accepted') {
        duration = Math.floor(Math.random() * 800) + 12 // 12 sec to 13.5 min
      } else if (result === 'Voicemail') {
        duration = Math.floor(Math.random() * 45) + 10 // 10 to 55 sec
      }

      // Spread dates weighted towards recent days
      let daysAgo = 0
      if (i < 20) daysAgo = 0 // Today
      else if (i < 35) daysAgo = 1 // Yesterday
      else if (i < 70) daysAgo = Math.floor(Math.random() * 6) + 1 // This week
      else if (i < 120) daysAgo = Math.floor(Math.random() * 25) + 5 // This month
      else if (i < 180) daysAgo = Math.floor(Math.random() * 60) + 30 // Last 3 months
      else daysAgo = Math.floor(Math.random() * 260) + 90 // Up to 1 year

      // Random business hour 8 AM to 6 PM
      const hour = Math.floor(Math.random() * 10) + 8
      const minute = Math.floor(Math.random() * 60)
      const callDate = now.subtract(daysAgo, 'day').hour(hour).minute(minute).second(0)

      const recordId = `rec_${100000 + i}`

      const record: CallLogRecord = {
        id: recordId,
        uri: `https://platform.devtest.ringcentral.com/restapi/v1.0/account/~/extension/~/call-log/${recordId}`,
        sessionId: `sess_${800000 + i}`,
        startTime: callDate.toISOString(),
        duration,
        type: 'Voice',
        direction,
        action: direction === 'Inbound' ? 'Phone Call' : 'Direct Call',
        result,
        from: direction === 'Inbound' ? { phoneNumber: contact.number, name: contact.name, location: contact.location } : { phoneNumber: '+1 (555) 234-5678', name: 'RingCentral Agent', extensionNumber: '104' },
        to: direction === 'Outbound' ? { phoneNumber: contact.number, name: contact.name, location: contact.location } : { phoneNumber: '+1 (555) 234-5678', name: 'RingCentral Agent', extensionNumber: '104' },
        recording: duration > 60 && Math.random() > 0.4 ? {
          id: `rec_aud_${recordId}`,
          uri: `https://media.ringcentral.com/recording/${recordId}`,
          type: 'Automatic',
          contentUri: `https://media.ringcentral.com/recording/${recordId}/content`
        } : undefined
      }

      records.push(record)
    }

    records.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    this.cachedDemoCalls = records
    return records
  }

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
      throw new Error(`Failed to fetch call log from RingCentral API: ${err.message || err}`)
    }
  }
}
