import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
} from 'recharts'
import {
  FiTrendingUp,
  FiArrowUpRight,
  FiArrowDownRight,
  FiTarget,
} from 'react-icons/fi'
import ChartCard, { CardBadge, EmptyState, SkeletonChart } from './ChartCard'
import {
  PALETTE,
  colorFor,
  formatCompactINR,
  formatPct,
  tooltipStyle,
  deltaPercent,
  receiptAmount,
  receiptCategory,
  receiptDate,
} from './utils'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function PerformanceTab({
  loading,
  byDay,
  byDayPrev,
  byCategory,
  monthlyCcSi,
  employeePerformance,
  recentReceipts,
  branchMonthlyTarget,
  compare,
  dateRange,
}) {
  // Pacing: cumulative achieved vs pro-rated target-to-date.
  const pacing = useMemo(() => {
    const series = Array.isArray(byDay) ? byDay : []
    if (!series.length) return { rows: [], onTrack: true, gap: 0 }
    const totalDays = series.length
    const dailyTarget = branchMonthlyTarget ? Number(branchMonthlyTarget) / 30 : null
    let cum = 0
    const rows = series.map((r, i) => {
      cum += Number(r.amount || 0)
      return {
        date: r.date,
        achieved: cum,
        target: dailyTarget ? dailyTarget * (i + 1) : null,
      }
    })
    const last = rows[rows.length - 1]
    const gap = last && last.target != null ? last.achieved - last.target : 0
    return { rows, onTrack: gap >= 0, gap }
  }, [byDay, branchMonthlyTarget])

  // Weekday average amount.
  const weekdayBars = useMemo(() => {
    const byDow = Array.from({ length: 7 }, (_, i) => ({ dow: i, name: WEEKDAYS[i], total: 0, count: 0 }))
    ;(byDay || []).forEach((r) => {
      if (!r.date) return
      const d = new Date(r.date)
      if (Number.isNaN(d.getTime())) return
      const idx = d.getDay()
      byDow[idx].total += Number(r.amount || 0)
      byDow[idx].count += Number(r.n || 0)
    })
    return byDow.map((r) => ({ name: r.name, amount: r.total, avg: r.count ? r.total / r.count : 0 }))
  }, [byDay])

  // Category stacked area over time (derived from recentReceipts for richness).
  const categoryStackedArea = useMemo(() => {
    const byDate = new Map()
    const cats = new Set()
    ;(recentReceipts || []).forEach((r) => {
      const d = receiptDate(r)
      if (!d) return
      const cat = receiptCategory(r) || 'Other'
      cats.add(cat)
      if (!byDate.has(d)) byDate.set(d, { date: d })
      const entry = byDate.get(d)
      entry[cat] = (entry[cat] || 0) + receiptAmount(r)
    })
    const rows = Array.from(byDate.values()).sort((a, b) => (a.date > b.date ? 1 : -1))
    return { rows, categories: Array.from(cats) }
  }, [recentReceipts])

  // Radar: top 5 employees across 4 axes, each normalized 0-100.
  const radarData = useMemo(() => {
    if (!Array.isArray(employeePerformance) || !employeePerformance.length) return { rows: [], employees: [] }
    const top = [...employeePerformance]
      .sort((a, b) => Number(b.total_cc || 0) - Number(a.total_cc || 0))
      .slice(0, 5)
    const max = {
      volume: Math.max(1, ...top.map((r) => Number(r.total_investment || 0))),
      ticket: Math.max(1, ...top.map((r) => Number(r.avg_investment || 0))),
      cc: Math.max(1, ...top.map((r) => Number(r.total_cc || 0))),
      count: Math.max(1, ...top.map((r) => Number(r.receipt_count || 0))),
    }
    const axes = ['Volume', 'Ticket', 'CC', 'Count']
    const rows = axes.map((axis) => {
      const entry = { axis }
      top.forEach((r) => {
        const name = r.employee_name || r.emp_code || '—'
        let v = 0
        if (axis === 'Volume') v = (Number(r.total_investment || 0) / max.volume) * 100
        else if (axis === 'Ticket') v = (Number(r.avg_investment || 0) / max.ticket) * 100
        else if (axis === 'CC') v = (Number(r.total_cc || 0) / max.cc) * 100
        else if (axis === 'Count') v = (Number(r.receipt_count || 0) / max.count) * 100
        entry[name] = Math.round(v)
      })
      return entry
    })
    return { rows, employees: top.map((r) => r.employee_name || r.emp_code || '—') }
  }, [employeePerformance])

  // MoM + YoY growth cards using monthlyCcSi.
  const growth = useMemo(() => buildGrowth(monthlyCcSi), [monthlyCcSi])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SkeletonChart height={280} />
        <SkeletonChart height={280} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChartCard
          title="Target pacing"
          subtitle={
            pacing.rows.length === 0
              ? 'No data'
              : pacing.gap >= 0
                ? `Ahead by ${formatCompactINR(Math.abs(pacing.gap))}`
                : `Behind by ${formatCompactINR(Math.abs(pacing.gap))}`
          }
          rightSlot={
            <CardBadge tone={pacing.onTrack ? 'success' : 'warn'}>
              {pacing.onTrack ? 'on track' : 'behind'}
            </CardBadge>
          }
          className="lg:col-span-2"
          rows={pacing.rows}
          csvName="pacing.csv"
          pngName="pacing.png"
        >
          {pacing.rows.length === 0 ? (
            <EmptyState icon={FiTarget} message="No pacing data" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={pacing.rows}>
                <defs>
                  <linearGradient id="pacingFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={pacing.onTrack ? PALETTE[2] : PALETTE[4]} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={pacing.onTrack ? PALETTE[2] : PALETTE[4]} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 11 }} hide={pacing.rows.length > 30} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} tickFormatter={formatCompactINR} />
                <RTooltip contentStyle={tooltipStyle} formatter={(v) => formatCompactINR(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="achieved" name="Achieved" stroke={pacing.onTrack ? PALETTE[2] : PALETTE[4]} fill="url(#pacingFill)" />
                <Line type="monotone" dataKey="target" name="Target pace" stroke={PALETTE[3]} strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Growth" subtitle="Month over month and year over year" pngName="growth.png">
          <div className="grid grid-cols-1 gap-2">
            <GrowthCard label="CC (MoM)" delta={growth.ccMoM} />
            <GrowthCard label="CC (YoY)" delta={growth.ccYoY} />
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard
          title="Day of week"
          subtitle="Total investment by weekday"
          rows={weekdayBars}
          csvName="weekday.csv"
          pngName="weekday.png"
        >
          {weekdayBars.every((b) => b.amount === 0) ? (
            <EmptyState message="No data" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weekdayBars}>
                <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} tickFormatter={formatCompactINR} />
                <RTooltip contentStyle={tooltipStyle} formatter={(v) => formatCompactINR(v)} />
                <Bar dataKey="amount" fill={PALETTE[1]} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Category trend"
          subtitle="Contribution over time"
          pngName="cat-stacked.png"
        >
          {categoryStackedArea.rows.length === 0 ? (
            <EmptyState message="No category trend" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={categoryStackedArea.rows}>
                <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 11 }} hide={categoryStackedArea.rows.length > 30} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} tickFormatter={formatCompactINR} />
                <RTooltip contentStyle={tooltipStyle} formatter={(v) => formatCompactINR(v)} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {categoryStackedArea.categories.map((c, i) => (
                  <Area
                    key={c}
                    type="monotone"
                    dataKey={c}
                    stackId="cat"
                    stroke={colorFor(i)}
                    fill={colorFor(i)}
                    fillOpacity={0.5}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <ChartCard
          title="Employee radar"
          subtitle="Top 5 across 4 axes (normalized)"
          pngName="radar.png"
        >
          {radarData.rows.length === 0 ? (
            <EmptyState message="No data" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData.rows}>
                <PolarGrid stroke="var(--stroke)" />
                <PolarAngleAxis dataKey="axis" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                <RTooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {radarData.employees.map((name, i) => (
                  <Radar key={name} name={name} dataKey={name} stroke={colorFor(i)} fill={colorFor(i)} fillOpacity={0.2} />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  )
}

function GrowthCard({ label, delta }) {
  const neutral = delta == null || !Number.isFinite(delta) || Math.abs(delta) < 0.5
  const up = !neutral && delta > 0
  const Icon = neutral ? FiTrendingUp : up ? FiArrowUpRight : FiArrowDownRight
  const tone = neutral ? 'default' : up ? 'success' : 'error'
  const toneClass = {
    default: 'bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] border-[var(--stroke)]',
    success: 'bg-[var(--success-muted)] text-[var(--success)] border-[var(--success)]/30',
    error: 'bg-[var(--error-muted)] text-[var(--error)] border-[var(--error)]/30',
  }[tone]
  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-medium">{label}</div>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-lg font-bold tabular-nums mt-1">
        {delta == null ? '—' : formatPct(delta, 1)}
      </div>
    </div>
  )
}

function buildGrowth(monthlyCcSi) {
  const rows = Array.isArray(monthlyCcSi) ? monthlyCcSi : []
  if (rows.length < 2) return { ccMoM: null, ccYoY: null }
  const last = rows[rows.length - 1]
  const prev = rows[rows.length - 2]
  const yoy = rows[rows.length - 13]
  return {
    ccMoM: deltaPercent(last.cc, prev.cc),
    ccYoY: yoy ? deltaPercent(last.cc, yoy.cc) : null,
  }
}
