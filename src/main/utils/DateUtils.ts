import dayjs from 'dayjs'
import quarterOfYear from 'dayjs/plugin/quarterOfYear.js'
import isBetween from 'dayjs/plugin/isBetween.js'
import { DateFilterType } from '../../types/call'

dayjs.extend(quarterOfYear)
dayjs.extend(isBetween)

export class DateUtils {
  public static getDateRange(filterType: DateFilterType, customStart?: string, customEnd?: string): { startDate: string; endDate: string } {
    const now = dayjs()

    switch (filterType) {
      case 'today':
        return {
          startDate: now.startOf('day').toISOString(),
          endDate: now.endOf('day').toISOString()
        }
      case 'yesterday':
        const yesterday = now.subtract(1, 'day')
        return {
          startDate: yesterday.startOf('day').toISOString(),
          endDate: yesterday.endOf('day').toISOString()
        }
      case 'this_week':
        return {
          startDate: now.startOf('week').toISOString(),
          endDate: now.endOf('week').toISOString()
        }
      case 'last_week':
        const lastWeek = now.subtract(1, 'week')
        return {
          startDate: lastWeek.startOf('week').toISOString(),
          endDate: lastWeek.endOf('week').toISOString()
        }
      case 'this_month':
        return {
          startDate: now.startOf('month').toISOString(),
          endDate: now.endOf('month').toISOString()
        }
      case 'last_month':
        const lastMonth = now.subtract(1, 'month')
        return {
          startDate: lastMonth.startOf('month').toISOString(),
          endDate: lastMonth.endOf('month').toISOString()
        }
      case 'this_quarter':
        return {
          startDate: now.startOf('quarter').toISOString(),
          endDate: now.endOf('quarter').toISOString()
        }
      case 'last_quarter':
        const lastQuarter = now.subtract(1, 'quarter')
        return {
          startDate: lastQuarter.startOf('quarter').toISOString(),
          endDate: lastQuarter.endOf('quarter').toISOString()
        }
      case 'last_6_months':
        return {
          startDate: now.subtract(6, 'month').startOf('day').toISOString(),
          endDate: now.endOf('day').toISOString()
        }
      case 'last_year':
        return {
          startDate: now.subtract(1, 'year').startOf('day').toISOString(),
          endDate: now.endOf('day').toISOString()
        }
      case 'custom':
        return {
          startDate: customStart ? dayjs(customStart).startOf('day').toISOString() : now.subtract(30, 'day').toISOString(),
          endDate: customEnd ? dayjs(customEnd).endOf('day').toISOString() : now.toISOString()
        }
      default:
        return {
          startDate: now.subtract(30, 'day').startOf('day').toISOString(),
          endDate: now.endOf('day').toISOString()
        }
    }
  }

  public static formatDuration(totalSeconds: number): string {
    if (!totalSeconds || totalSeconds <= 0) return '0s'
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  public static formatDateTime(isoString: string): { date: string; time: string } {
    const d = dayjs(isoString)
    return {
      date: d.format('MMM DD, YYYY'),
      time: d.format('hh:mm A')
    }
  }
}
