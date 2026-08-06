import React from 'react'
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  Zap,
  Award,
  TrendingUp,
  Activity
} from 'lucide-react'
import { useDashboard } from '../hooks/useDashboard'
import { KPICard } from '../components/KPICard'
import { ChartCard } from '../components/ChartCard'
import { CallTable } from '../components/CallTable'
import { Loading } from '../components/Loading'
import { DateUtils } from '../../main/utils/DateUtils'

export const Dashboard: React.FC = () => {
  const { analytics, isLoading, isError, error } = useDashboard()

  if (isLoading) {
    return <Loading message="Computing call log analytics & trend distributions..." />
  }

  if (isError || !analytics) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl text-xs">
        Failed to load call analytics: {error?.message || 'Unknown error'}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Calls"
          value={analytics.totalCalls}
          subValue={`${analytics.answeredCalls} Answered`}
          icon={Phone}
          badgeText="Active Period"
          badgeColor="indigo"
        />
        <KPICard
          title="Inbound Calls"
          value={analytics.inboundCalls}
          subValue={`${Math.round((analytics.inboundCalls / (analytics.totalCalls || 1)) * 100)}% of volume`}
          icon={PhoneIncoming}
          badgeText="Inbound"
          badgeColor="indigo"
        />
        <KPICard
          title="Outbound Calls"
          value={analytics.outboundCalls}
          subValue={`${Math.round((analytics.outboundCalls / (analytics.totalCalls || 1)) * 100)}% of volume`}
          icon={PhoneOutgoing}
          badgeText="Outbound"
          badgeColor="emerald"
        />
        <KPICard
          title="Missed Calls"
          value={analytics.missedCalls}
          subValue={`Answer Rate: ${analytics.answerRatePercentage}%`}
          icon={PhoneMissed}
          badgeText={`${analytics.missedCalls} Missed`}
          badgeColor="rose"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Talk Time"
          value={DateUtils.formatDuration(analytics.totalDurationSeconds)}
          subValue="Combined Call Time"
          icon={Clock}
          badgeText="Talk Time"
          badgeColor="amber"
        />
        <KPICard
          title="Avg Call Duration"
          value={DateUtils.formatDuration(analytics.avgDurationSeconds)}
          subValue={`Longest: ${DateUtils.formatDuration(analytics.longestCallSeconds)}`}
          icon={TrendingUp}
          badgeText="Average"
          badgeColor="indigo"
        />
        <KPICard
          title="Peak Calling Hour"
          value={analytics.peakCallingHour}
          subValue="Highest Call Volume"
          icon={Zap}
          badgeText="Peak Hour"
          badgeColor="emerald"
        />
        <KPICard
          title="Voicemails"
          value={analytics.voicemailCalls}
          subValue="Recorded Voicemails"
          icon={Activity}
          badgeText="Voicemail"
          badgeColor="slate"
        />
      </div>

      {/* Primary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard type="daily_trend" analytics={analytics} />
        </div>
        <div className="lg:col-span-1">
          <ChartCard type="direction_pie" analytics={analytics} />
        </div>
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard type="hourly_distribution" analytics={analytics} />
        </div>
        <div className="lg:col-span-1">
          <ChartCard type="result_pie" analytics={analytics} />
        </div>
      </div>

      {/* Leaderboard & Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ChartCard type="top_contacts" analytics={analytics} />
        </div>
        <div className="lg:col-span-2">
          <ChartCard type="monthly_trend" analytics={analytics} />
        </div>
      </div>

      {/* Call Log Table Section */}
      <div className="pt-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100">Detailed Call Logs</h2>
            <p className="text-xs text-slate-400">Complete records for active time filter</p>
          </div>
        </div>
        <CallTable />
      </div>
    </div>
  )
}
