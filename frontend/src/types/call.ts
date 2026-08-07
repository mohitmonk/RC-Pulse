export type CallDirection = 'Inbound' | 'Outbound'

export type CallResult = 
  | 'Accepted' 
  | 'Connected' 
  | 'Missed' 
  | 'Voicemail' 
  | 'Rejected' 
  | 'Busy' 
  | 'No Answer'
  | 'Hang Up'

export type DateFilterType =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'last_6_months'
  | 'last_year'
  | 'custom'

export interface PhoneInfo {
  phoneNumber?: string
  name?: string
  extensionNumber?: string
  location?: string
}

export interface CallRecording {
  id: string
  uri: string
  type: string
  contentUri: string
}

export interface CallLogRecord {
  id: string
  uri: string
  sessionId: string
  startTime: string
  duration: number // in seconds
  type: string
  direction: CallDirection
  action: string
  result: CallResult
  from: PhoneInfo
  to: PhoneInfo
  recording?: CallRecording
  telephonyStatus?: string
}

export interface DateRangeFilter {
  type: DateFilterType
  startDate?: string
  endDate?: string
}

export interface TopContactMetric {
  name: string
  phoneNumber: string
  totalCalls: number
  totalDuration: number // seconds
  inboundCalls: number
  outboundCalls: number
}

export interface HourlyTrendPoint {
  hour: number // 0 - 23
  hourLabel: string // e.g. "9 AM"
  totalCalls: number
  inbound: number
  outbound: number
  missed: number
}

export interface DailyTrendPoint {
  date: string // YYYY-MM-DD
  dayLabel: string // e.g. "Mon"
  totalCalls: number
  inbound: number
  outbound: number
  missed: number
  answered: number
  totalDuration: number // seconds
  avgDuration: number // seconds
}

export interface WeeklyTrendPoint {
  weekLabel: string // e.g. "Week 32"
  totalCalls: number
  inbound: number
  outbound: number
  missed: number
}

export interface MonthlyTrendPoint {
  monthLabel: string // e.g. "Jan 2026"
  totalCalls: number
  inbound: number
  outbound: number
  missed: number
  avgDuration: number
}

export interface CallAnalyticsSummary {
  totalCalls: number
  inboundCalls: number
  outboundCalls: number
  missedCalls: number
  answeredCalls: number
  voicemailCalls: number
  totalDurationSeconds: number
  avgDurationSeconds: number
  longestCallSeconds: number
  shortestCallSeconds: number
  answerRatePercentage: number
  topContacts: TopContactMetric[]
  topNumbers: TopContactMetric[]
  peakCallingHour: string
  hourlyTrend: HourlyTrendPoint[]
  dailyTrend: DailyTrendPoint[]
  weeklyTrend: WeeklyTrendPoint[]
  monthlyTrend: MonthlyTrendPoint[]
}
