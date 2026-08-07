import React from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts'
import { CallAnalyticsSummary } from '@/src/types/call'

interface ChartCardProps {
  type: 'daily_trend' | 'hourly_distribution' | 'direction_pie' | 'result_pie' | 'top_contacts' | 'monthly_trend'
  analytics?: CallAnalyticsSummary
}

const COLORS = {
  inbound: '#3b82f6',  // Blue
  outbound: '#c084fc', // Purple
  missed: '#ef4444',   // Red
  answered: '#22c55e', // Green
  voicemail: '#f59e0b',// Amber
}

export const ChartCard: React.FC<ChartCardProps> = ({ type, analytics }) => {
  if (!analytics) return null

  if (type === 'daily_trend') {
    return (
      <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-[#e4e4e7]">Call Volume Trend</h3>
            <p className="text-xs text-[#71717a]">Daily call volume trend over active timeframe</p>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics.dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradInbound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.inbound} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.inbound} stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradOutbound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.outbound} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.outbound} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="dayLabel" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px', color: '#fafafa' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
              <Area type="monotone" dataKey="inbound" name="Inbound" stroke={COLORS.inbound} fillOpacity={1} fill="url(#gradInbound)" />
              <Area type="monotone" dataKey="outbound" name="Outbound" stroke={COLORS.outbound} fillOpacity={1} fill="url(#gradOutbound)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  if (type === 'hourly_distribution') {
    return (
      <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-[#e4e4e7]">Hourly Calling Distribution</h3>
            <p className="text-xs text-[#71717a]">Peak hour analysis (00:00 - 23:00)</p>
          </div>
          <span className="text-xs px-2.5 py-1 bg-[#18181b] text-blue-400 border border-[#27272a] rounded-md">
            Peak: {analytics.peakCallingHour}
          </span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.hourlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="hourLabel" stroke="#71717a" fontSize={10} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px', color: '#fafafa' }}
              />
              <Bar dataKey="totalCalls" name="Calls Count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  if (type === 'direction_pie') {
    const pieData = [
      { name: 'Inbound', value: analytics.inboundCalls, color: COLORS.inbound },
      { name: 'Outbound', value: analytics.outboundCalls, color: COLORS.outbound }
    ]

    return (
      <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-medium text-[#e4e4e7] mb-1">Direction Split</h3>
        <p className="text-xs text-[#71717a] mb-4">Inbound vs Outbound ratio</p>
        <div className="h-56 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px', color: '#fafafa' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  if (type === 'result_pie') {
    const pieData = [
      { name: 'Answered', value: analytics.answeredCalls, color: COLORS.answered },
      { name: 'Missed', value: analytics.missedCalls, color: COLORS.missed },
      { name: 'Voicemail', value: analytics.voicemailCalls, color: COLORS.voicemail }
    ]

    return (
      <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-medium text-[#e4e4e7] mb-1">Call Resolution</h3>
        <p className="text-xs text-[#71717a] mb-4">Answered vs Missed vs Voicemail</p>
        <div className="h-56 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px', color: '#fafafa' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  if (type === 'top_contacts') {
    return (
      <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-medium text-[#e4e4e7] mb-1">Top Contact Leaderboard</h3>
        <p className="text-xs text-[#71717a] mb-4">Most frequent interaction contacts</p>
        <div className="space-y-2.5">
          {analytics.topContacts.map((contact, idx) => (
            <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-[#18181b]/60 border border-[#27272a]/80">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-[#27272a] text-blue-400 font-semibold text-xs flex items-center justify-center border border-[#27272a]">
                  #{idx + 1}
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">{contact.name}</div>
                  <div className="text-[10px] text-[#71717a]">{contact.phoneNumber}</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-blue-400">{contact.totalCalls} calls</span>
                <div className="text-[10px] text-[#71717a]">{Math.round(contact.totalDuration / 60)} mins</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'monthly_trend') {
    return (
      <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-medium text-[#e4e4e7] mb-1">Monthly Call Trends</h3>
        <p className="text-xs text-[#71717a] mb-4">Historical comparison across months</p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="monthLabel" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px', color: '#fafafa' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
              <Bar dataKey="inbound" name="Inbound" fill={COLORS.inbound} radius={[4, 4, 0, 0]} />
              <Bar dataKey="outbound" name="Outbound" fill={COLORS.outbound} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  return null
}

