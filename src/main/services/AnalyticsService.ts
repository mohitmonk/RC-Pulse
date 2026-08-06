import {
  CallLogRecord,
  CallAnalyticsSummary,
  TopContactMetric,
  HourlyTrendPoint,
  DailyTrendPoint,
  WeeklyTrendPoint,
  MonthlyTrendPoint
} from '../../types/call'
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear.js'

dayjs.extend(weekOfYear)

export class AnalyticsService {
  public static calculateAnalytics(calls: CallLogRecord[]): CallAnalyticsSummary {
    if (!calls || calls.length === 0) {
      return this.getEmptySummary()
    }

    let totalDurationSeconds = 0
    let inboundCalls = 0
    let outboundCalls = 0
    let missedCalls = 0
    let answeredCalls = 0
    let voicemailCalls = 0
    let longestCallSeconds = 0
    let shortestCallSeconds = Infinity

    const contactMap: Record<string, TopContactMetric> = {}
    const hourlyCounts: number[] = new Array(24).fill(0)
    const hourlyInbound: number[] = new Array(24).fill(0)
    const hourlyOutbound: number[] = new Array(24).fill(0)
    const hourlyMissed: number[] = new Array(24).fill(0)

    const dailyMap: Record<string, DailyTrendPoint> = {}
    const weeklyMap: Record<string, WeeklyTrendPoint> = {}
    const monthlyMap: Record<string, MonthlyTrendPoint> = {}

    for (const call of calls) {
      const dur = call.duration || 0
      totalDurationSeconds += dur

      if (dur > longestCallSeconds) longestCallSeconds = dur
      if (dur > 0 && dur < shortestCallSeconds) shortestCallSeconds = dur

      if (call.direction === 'Inbound') {
        inboundCalls++
      } else {
        outboundCalls++
      }

      const res = (call.result || '').toLowerCase()
      if (res.includes('missed') || res.includes('rejected') || res.includes('no answer')) {
        missedCalls++
      } else if (res.includes('voicemail')) {
        voicemailCalls++
      } else {
        answeredCalls++
      }

      // Contact metrics
      const contactInfo = call.direction === 'Inbound' ? call.from : call.to
      const contactKey = contactInfo.phoneNumber || contactInfo.name || 'Unknown'
      const contactName = contactInfo.name || contactInfo.phoneNumber || 'Unknown Contact'

      if (!contactMap[contactKey]) {
        contactMap[contactKey] = {
          name: contactName,
          phoneNumber: contactInfo.phoneNumber || 'N/A',
          totalCalls: 0,
          totalDuration: 0,
          inboundCalls: 0,
          outboundCalls: 0
        }
      }

      contactMap[contactKey].totalCalls++
      contactMap[contactKey].totalDuration += dur
      if (call.direction === 'Inbound') contactMap[contactKey].inboundCalls++
      else contactMap[contactKey].outboundCalls++

      // Hour trend
      const callDate = dayjs(call.startTime)
      const hour = callDate.hour()
      hourlyCounts[hour]++
      if (call.direction === 'Inbound') hourlyInbound[hour]++
      else hourlyOutbound[hour]++
      if (res.includes('missed') || res.includes('rejected')) hourlyMissed[hour]++

      // Daily trend
      const dateStr = callDate.format('YYYY-MM-DD')
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = {
          date: dateStr,
          dayLabel: callDate.format('MMM DD'),
          totalCalls: 0,
          inbound: 0,
          outbound: 0,
          missed: 0,
          answered: 0,
          totalDuration: 0,
          avgDuration: 0
        }
      }
      dailyMap[dateStr].totalCalls++
      dailyMap[dateStr].totalDuration += dur
      if (call.direction === 'Inbound') dailyMap[dateStr].inbound++
      else dailyMap[dateStr].outbound++
      if (res.includes('missed')) dailyMap[dateStr].missed++
      else dailyMap[dateStr].answered++

      // Weekly trend
      const weekStr = `W${callDate.week()} ${callDate.format('YYYY')}`
      if (!weeklyMap[weekStr]) {
        weeklyMap[weekStr] = {
          weekLabel: callDate.format('MMM DD'),
          totalCalls: 0,
          inbound: 0,
          outbound: 0,
          missed: 0
        }
      }
      weeklyMap[weekStr].totalCalls++
      if (call.direction === 'Inbound') weeklyMap[weekStr].inbound++
      else weeklyMap[weekStr].outbound++
      if (res.includes('missed')) weeklyMap[weekStr].missed++

      // Monthly trend
      const monthStr = callDate.format('MMM YYYY')
      if (!monthlyMap[monthStr]) {
        monthlyMap[monthStr] = {
          monthLabel: monthStr,
          totalCalls: 0,
          inbound: 0,
          outbound: 0,
          missed: 0,
          avgDuration: 0
        }
      }
      monthlyMap[monthStr].totalCalls++
      if (call.direction === 'Inbound') monthlyMap[monthStr].inbound++
      else monthlyMap[monthStr].outbound++
      if (res.includes('missed')) monthlyMap[monthStr].missed++
    }

    if (shortestCallSeconds === Infinity) shortestCallSeconds = 0

    // Top contacts array
    const sortedContacts = Object.values(contactMap).sort((a, b) => b.totalCalls - a.totalCalls)
    const topContacts = sortedContacts.slice(0, 5)
    const topNumbers = sortedContacts.slice(0, 10)

    // Peak calling hour
    let peakHourIndex = 0
    let maxHourlyCalls = 0
    for (let h = 0; h < 24; h++) {
      if (hourlyCounts[h] > maxHourlyCalls) {
        maxHourlyCalls = hourlyCounts[h]
        peakHourIndex = h
      }
    }
    const peakHourLabel = dayjs().hour(peakHourIndex).format('h:00 A')

    // Hourly Trend Array
    const hourlyTrend: HourlyTrendPoint[] = hourlyCounts.map((count, h) => ({
      hour: h,
      hourLabel: dayjs().hour(h).format('h A'),
      totalCalls: count,
      inbound: hourlyInbound[h],
      outbound: hourlyOutbound[h],
      missed: hourlyMissed[h]
    }))

    // Daily Trend Array sorted by date
    const dailyTrend = Object.values(dailyMap).map(d => ({
      ...d,
      avgDuration: d.totalCalls > 0 ? Math.round(d.totalDuration / d.totalCalls) : 0
    })).sort((a, b) => a.date.localeCompare(b.date))

    // Weekly Trend Array
    const weeklyTrend = Object.values(weeklyMap)

    // Monthly Trend Array
    const monthlyTrend = Object.values(monthlyMap)

    const totalCalls = calls.length
    const avgDurationSeconds = totalCalls > 0 ? Math.round(totalDurationSeconds / totalCalls) : 0
    const answerRatePercentage = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0

    return {
      totalCalls,
      inboundCalls,
      outboundCalls,
      missedCalls,
      answeredCalls,
      voicemailCalls,
      totalDurationSeconds,
      avgDurationSeconds,
      longestCallSeconds,
      shortestCallSeconds,
      answerRatePercentage,
      topContacts,
      topNumbers,
      peakCallingHour: peakHourLabel,
      hourlyTrend,
      dailyTrend,
      weeklyTrend,
      monthlyTrend
    }
  }

  private static getEmptySummary(): CallAnalyticsSummary {
    return {
      totalCalls: 0,
      inboundCalls: 0,
      outboundCalls: 0,
      missedCalls: 0,
      answeredCalls: 0,
      voicemailCalls: 0,
      totalDurationSeconds: 0,
      avgDurationSeconds: 0,
      longestCallSeconds: 0,
      shortestCallSeconds: 0,
      answerRatePercentage: 0,
      topContacts: [],
      topNumbers: [],
      peakCallingHour: '10:00 AM',
      hourlyTrend: [],
      dailyTrend: [],
      weeklyTrend: [],
      monthlyTrend: []
    }
  }
}
