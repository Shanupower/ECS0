import React, { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  Legend,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import {
  FiFileText,
  FiAlertTriangle,
  FiCheckSquare,
  FiZap,
  FiActivity,
  FiClock,
  FiTarget,
  FiUsers,
} from 'react-icons/fi'
import ChartCard, { EmptyState, SkeletonChart } from './ChartCard'
import KpiStat from './KpiStat'
import WorkQueueCard from './WorkQueueCard'
import BranchHealthCard from './BranchHealthCard'
import NetworkHealthCard from './NetworkHealthCard'
import TasksIssuesCard from './TasksIssuesCard'
import {
  PALETTE,
  colorFor,
  formatCompactINR,
  formatINR,
  formatNumber,
  formatPct,
  tooltipStyle,
  receiptAmount,
  receiptEmpCode,
  receiptDate,
  receiptCustomerName,
  scaleMonthlyTargetToDateRange,
} from './utils'

export default function OverviewTab({
  loading,
  branchStats,
  branchStatsPrev,
  byDay,
  byDayPrev,
  byCategory,
  employees,
  employeePerformance,
  monthlyCcSi,
  recentReceipts,
  leads = [],
  branchCode = null,
  compare,
  branchMonthlyTarget,
  dateRange,
  includePending = true,
  dateBasis = 'receipt',
  queueMetrics = null,
  hubTasks = [],
  hubTaskTotal = 0,
  hubIssues = [],
  hubIssueTotal = 0,
  networkMode = false,
  branchBreakdown = [],
}) {
  const navigate = useNavigate()
  const s = branchStats?.statistics || {}
  const sPrev = branchStatsPrev?.statistics || {}

  const basisHint =
    dateBasis === 'transaction'
      ? 'Amounts are attributed by transaction date when available.'
      : 'Amounts use receipt date (or fallback) per your date basis setting.'
  const pendingHint = includePending
    ? 'Pending and null-status receipts are included where the API allows.'
    : 'Only completed receipts are included.'

  // Build cumulative CC series from byDay (amount is investments; CC is separate) –
  // by-day returns { date, n, amount }, so we need to map amount -> investments and count.
  const trendSeries = useMemo(() => {
    if (!Array.isArray(byDay)) return []
    let cum = 0
    return byDay.map((r) => {
      const amt = Number(r.amount || 0)
      cum += amt
      return { date: r.date, count: Number(r.n || 0), amount: amt, cumulative: cum }
    })
  }, [byDay])

  const prevTrendSeries = useMemo(() => {
    if (!compare || !Array.isArray(byDayPrev)) return []
    return byDayPrev.map((r) => ({ date: r.date, amount: Number(r.amount || 0), count: Number(r.n || 0) }))
  }, [byDayPrev, compare])

  // Merge current + previous for the area chart by index position (same-length periods).
  const mergedTrend = useMemo(() => {
    return trendSeries.map((p, i) => ({
      ...p,
      prevAmount: prevTrendSeries[i]?.amount ?? null,
    }))
  }, [trendSeries, prevTrendSeries])

  const categoryData = useMemo(() => {
    if (!Array.isArray(byCategory)) return []
    return byCategory
      .map((c, i) => ({
        name: c.category || 'Other',
        value: Number(c.amount || 0),
        count: Number(c.n || 0),
        color: colorFor(i),
      }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [byCategory])

  const mom = useMemo(() => buildMoM(monthlyCcSi), [monthlyCcSi])

  const pendingVsCompleted = useMemo(() => {
    if (!Array.isArray(recentReceipts)) return []
    const map = new Map()
    recentReceipts.forEach((r) => {
      const date = receiptDate(r) || '—'
      const status = (r.status || 'Completed').toLowerCase()
      const key = date
      if (!map.has(key)) map.set(key, { date, Completed: 0, Pending: 0 })
      const entry = map.get(key)
      if (status === 'pending') entry.Pending += 1
      else entry.Completed += 1
    })
    return Array.from(map.values()).sort((a, b) => (a.date > b.date ? 1 : -1))
  }, [recentReceipts])

  const topPerformers = useMemo(() => {
    const rows = Array.isArray(employeePerformance) ? [...employeePerformance] : []
    rows.sort((a, b) => Number(b.total_cc || b.total_investment || 0) - Number(a.total_cc || a.total_investment || 0))
    return rows.slice(0, 3)
  }, [employeePerformance])

  const targetGauge = useMemo(() => {
    const monthly = Number(branchMonthlyTarget || 0)
    const target = scaleMonthlyTargetToDateRange(monthly, dateRange?.from, dateRange?.to) || monthly
    const achieved = Number(s.total_investments || 0)
    const pct = target > 0 ? Math.min(100, (achieved / target) * 100) : 0
    return { target, achieved, pct, monthly }
  }, [branchMonthlyTarget, s.total_investments, dateRange?.from, dateRange?.to])

  const scaledPersonalTargetsSum = useMemo(() => {
    if (!Array.isArray(employees)) return 0
    return employees.reduce((sum, u) => {
      const m = Number(u.personal_monthly_target) || 0
      if (!m) return sum
      return sum + scaleMonthlyTargetToDateRange(m, dateRange?.from, dateRange?.to)
    }, 0)
  }, [employees, dateRange?.from, dateRange?.to])

  const branchTargetForHealth = useMemo(() => {
    const m = Number(branchMonthlyTarget || 0)
    if (!m) return 0
    return scaleMonthlyTargetToDateRange(m, dateRange?.from, dateRange?.to)
  }, [branchMonthlyTarget, dateRange?.from, dateRange?.to])

  const activity = useMemo(() => buildActivityStream(recentReceipts), [recentReceipts])

  // --- KPI row (respects the selected date range wherever it semantically can) ---
  // Range-aware "Receipts" count: use byDay (which is driven by /stats/by-day and
  // already scoped to the filter) rather than a hardcoded today match. This means
  // every preset (Today, WTD, MTD, YTD, Year, custom) lights up the KPI correctly.
  const todayStr = new Date().toISOString().slice(0, 10)
  const rangeIsToday =
    dateRange?.from && dateRange?.to && dateRange.from === dateRange.to && dateRange.from === todayStr

  const receiptsInRangeCount = useMemo(() => {
    // Prefer server aggregate (branchStats) which is always range-scoped on the backend.
    const fromStats = Number(branchStats?.statistics?.total_receipts)
    if (Number.isFinite(fromStats) && fromStats > 0) return fromStats
    // Fallback: sum the by-day counts (also range-scoped).
    if (Array.isArray(byDay) && byDay.length) {
      return byDay.reduce((n, r) => n + Number(r?.n || 0), 0)
    }
    return 0
  }, [branchStats, byDay])

  const scopeLabel = networkMode ? 'across the network' : 'for this branch'
  const scopeShort = networkMode ? 'network' : 'branch'
  const receiptsKpiTitle = networkMode
    ? rangeIsToday
      ? 'Network receipts today'
      : 'Network receipts'
    : rangeIsToday
      ? 'Receipts today'
      : 'Receipts in range'
  const receiptsKpiDefinition = rangeIsToday
    ? `Receipts created today ${scopeLabel}.`
    : `Receipts ${scopeLabel} between ${dateRange?.from || '—'} and ${dateRange?.to || '—'} (honours your date basis and "Include pending" toggle).`

  // "Open leads" reflects the selected range by counting leads created within it.
  // If a lead has no created_at (legacy rows), we fall back to keeping it so we
  // never under-count.
  const openLeadsCount = useMemo(() => {
    if (!Array.isArray(leads)) return 0
    const from = dateRange?.from ? new Date(`${dateRange.from}T00:00:00`).getTime() : null
    const to = dateRange?.to ? new Date(`${dateRange.to}T23:59:59.999`).getTime() : null
    return leads.filter((l) => {
      const stage = String(l.stage || l.status || 'new').toLowerCase()
      const isOpen = stage !== 'closed' && stage !== 'won' && stage !== 'lost'
      if (!isOpen) return false
      if (from == null || to == null) return true
      const created = l.created_at ? new Date(l.created_at).getTime() : null
      if (!Number.isFinite(created)) return true
      return created >= from && created <= to
    }).length
  }, [leads, dateRange?.from, dateRange?.to])

  const staleTotal = Number(queueMetrics?.stale_leads || 0) + Number(queueMetrics?.stale_customers || 0)
  const openWorkTotal = Number(hubTaskTotal || 0) + Number(hubIssueTotal || 0)
  const targetPct = Math.round(targetGauge.pct || 0)
  const targetKpiTitle = networkMode
    ? 'Network target'
    : rangeIsToday
      ? 'Target today'
      : 'Target in range'

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonChart key={i} height={i < 4 ? 110 : 260} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Flow / workload KPIs (revenue figures live in the Analytics tab). */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <KpiStat
          title={receiptsKpiTitle}
          value={receiptsInRangeCount}
          format={formatNumber}
          icon={FiFileText}
          iconBg="bg-[var(--accent-muted)]"
          iconColor="text-[var(--accent)]"
          definition={receiptsKpiDefinition}
        />
        <KpiStat
          title="Open leads"
          value={openLeadsCount}
          format={formatNumber}
          icon={FiZap}
          iconBg="bg-[var(--info-muted)]"
          iconColor="text-blue-600 dark:text-blue-400"
          definition={
            dateRange?.from && dateRange?.to
              ? `Leads created between ${dateRange.from} and ${dateRange.to} that are not yet closed, won, or lost.`
              : 'Leads not yet closed, won, or lost for this branch.'
          }
        />
        <KpiStat
          title="Stale items"
          value={staleTotal}
          format={formatNumber}
          icon={FiAlertTriangle}
          iconBg="bg-[var(--warn-muted)]"
          iconColor="text-[var(--warn)]"
          definition={`Leads + customers ${scopeLabel} with no touch in ${queueMetrics?.stale_days ?? 14} days. Rolling window, independent of the date range above.`}
        />
        <KpiStat
          title="Tasks + issues"
          value={openWorkTotal}
          format={formatNumber}
          icon={FiCheckSquare}
          iconBg="bg-[var(--accent-muted)]"
          iconColor="text-[var(--accent)]"
          definition={`Open tasks plus reported issues visible to your ${scopeShort}. Shows the current workload and is independent of the date range above.`}
        />
        <KpiStat
          title={targetKpiTitle}
          value={targetPct}
          format={(v) => `${Math.round(Number(v || 0))}%`}
          icon={FiTarget}
          iconBg="bg-[var(--success-muted)]"
          iconColor="text-[var(--success)]"
          definition={
            targetGauge.target > 0
              ? `Progress toward the branch monthly target (${formatCompactINR(targetGauge.achieved)} of ${formatCompactINR(targetGauge.target)}) for the selected range.`
              : 'No branch monthly target set.'
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <WorkQueueCard
            recentReceipts={recentReceipts}
            leads={leads}
            branchCode={branchCode}
            staleLeadsServer={queueMetrics?.stale_leads}
            staleCustomersServer={queueMetrics?.stale_customers}
            staleDaysServer={queueMetrics?.stale_days ?? 14}
          />
        </div>
        {networkMode ? (
          <NetworkHealthCard branches={branchBreakdown} />
        ) : (
          <BranchHealthCard
            branchMonthlyTarget={branchTargetForHealth}
            totalInvestments={Number(s.total_investments || 0)}
            staleLeadsCount={Number(queueMetrics?.stale_leads ?? 0)}
            staleCustomersCount={Number(queueMetrics?.stale_customers ?? 0)}
          />
        )}
      </div>

      <TasksIssuesCard
        tasks={hubTasks}
        issues={hubIssues}
        taskTotal={hubTaskTotal}
        issueTotal={hubIssueTotal}
      />

      {/* Target gauge + allocation breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChartCard
          title="Target progress"
          subtitle={
            targetGauge.target > 0
              ? `${formatCompactINR(targetGauge.achieved)} of ${formatCompactINR(targetGauge.target)}`
              : `No ${scopeShort} monthly target set`
          }
          pngName="target-gauge.png"
          className="lg:col-span-1"
        >
          <TargetGauge pct={targetGauge.pct} label={formatPct(targetGauge.pct)} />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <MiniStat
              label={networkMode ? 'Network' : 'Branch'}
              value={targetGauge.target ? formatCompactINR(targetGauge.target) : '—'}
            />
            <MiniStat label="Allocated" value={formatCompactINR(scaledPersonalTargetsSum || 0)} />
            <MiniStat
              label="Remaining"
              value={
                targetGauge.target
                  ? formatCompactINR(Math.max(0, targetGauge.target - (scaledPersonalTargetsSum || 0)))
                  : '—'
              }
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Daily trend"
          subtitle={`${dateRange?.from || ''} → ${dateRange?.to || ''}`}
          rows={trendSeries.map((p) => ({ date: p.date, count: p.count, amount: p.amount }))}
          csvName="daily-trend.csv"
          pngName="daily-trend.png"
          className="lg:col-span-2"
        >
          {trendSeries.length === 0 ? (
            <EmptyState icon={FiActivity} message="No receipts in range" hint="Try widening the date range." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={mergedTrend} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 11 }} hide={trendSeries.length > 30} />
                <YAxis yAxisId="left" stroke="var(--text-muted)" tick={{ fontSize: 11 }} tickFormatter={formatCompactINR} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" tick={{ fontSize: 11 }} tickFormatter={formatCompactINR} />
                <RTooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, key) =>
                    key === 'count' ? [formatNumber(v), 'Receipts'] : [formatCompactINR(v), key === 'cumulative' ? 'Cumulative' : key === 'prevAmount' ? 'Previous' : 'Daily']
                  }
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="amount" name="Daily" fill={PALETTE[0]} radius={[6, 6, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Cumulative" stroke={PALETTE[2]} strokeWidth={2} dot={false} />
                {compare && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="prevAmount"
                    name="Previous"
                    stroke={PALETTE[4]}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Category donut + MoM + pending/completed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChartCard
          title="Category mix"
          subtitle={
            networkMode
              ? 'Investments by category across the network · click to open Transactions'
              : branchCode
                ? 'Investments by category · click a slice to open Transactions'
                : 'Investments by product category'
          }
          rows={categoryData.map((c) => ({ category: c.name, amount: c.value, count: c.count }))}
          csvName="categories.csv"
          pngName="category-donut.png"
        >
          {categoryData.length === 0 ? (
            <EmptyState message="No category data" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  cursor={branchCode || networkMode ? 'pointer' : 'default'}
                  onClick={(_, index) => {
                    const name = categoryData[index]?.name
                    if (!name) return
                    if (networkMode) {
                      navigate(`/transactions?category=${encodeURIComponent(name)}`)
                      return
                    }
                    if (!branchCode) return
                    navigate(
                      `/transactions?branch=${encodeURIComponent(branchCode)}&category=${encodeURIComponent(name)}`
                    )
                  }}
                >
                  {categoryData.map((c, i) => (
                    <Cell key={`c-${i}`} fill={c.color} />
                  ))}
                </Pie>
                <RTooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, _n, p) => [formatCompactINR(v), p?.payload?.name || 'Value']}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Month over month"
          subtitle="Collection credit by month"
          rows={mom}
          csvName="mom.csv"
          pngName="mom.png"
        >
          {mom.length === 0 ? (
            <EmptyState message="No monthly data" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={mom} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} tickFormatter={formatCompactINR} />
                <RTooltip contentStyle={tooltipStyle} formatter={(v) => formatCompactINR(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="cc" name="CC" fill={PALETTE[0]} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Recent activity"
          subtitle="Latest receipts"
          pngName="activity.png"
        >
          {activity.length === 0 ? (
            <EmptyState icon={FiClock} message="No recent activity" />
          ) : (
            <div className="max-h-[260px] overflow-y-auto divide-y divide-[var(--stroke)]/60 -mx-1">
              {activity.map((a, idx) => {
                const row = (
                  <>
                    <span className="mt-1 inline-block w-2 h-2 rounded-full shrink-0 bg-[var(--success)]" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-[var(--text-primary)] truncate">{a.title}</div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">{a.subtitle}</div>
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] tabular-nums">
                      {a.when ? new Date(a.when).toLocaleString('en-IN', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </>
                )
                return (
                  <div key={`${a.kind}-${idx}`} className="flex items-start gap-2 px-1 py-2">
                    {a.receiptId ? (
                      <Link
                        to={`/receipts/${a.receiptId}`}
                        className="flex flex-1 items-start gap-2 min-w-0 hover:bg-[var(--card-hover)] rounded-md -mx-1 px-1 py-0.5 text-left"
                      >
                        {row}
                      </Link>
                    ) : (
                      <div className="flex flex-1 items-start gap-2 min-w-0">{row}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ChartCard>
      </div>

      {/* Pending vs Completed + Top performers mini */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChartCard
          title="Pending vs completed"
          subtitle="Recent receipts split by status"
          pngName="status-stack.png"
          className="lg:col-span-2"
        >
          {pendingVsCompleted.length === 0 ? (
            <EmptyState message="No receipts" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pendingVsCompleted}>
                <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <RTooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-primary)' }} />
                <Bar dataKey="Completed" stackId="s" fill={PALETTE[2]} />
                <Bar dataKey="Pending" stackId="s" fill={PALETTE[3]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Top performers" subtitle="By collection credit" pngName="top-performers.png">
          {topPerformers.length === 0 ? (
            <EmptyState icon={FiTarget} message="No performers yet" />
          ) : (
            <div className="space-y-2">
              {topPerformers.map((p, i) => {
                const amount = Number(p.total_cc || p.total_investment || 0)
                const monthlyTarget = Number(p.effective_target || p.personal_target || 0)
                const target =
                  scaleMonthlyTargetToDateRange(monthlyTarget, dateRange?.from, dateRange?.to) ||
                  monthlyTarget
                const pct = target > 0 ? Math.min(100, (amount / target) * 100) : 0
                return (
                  <div
                    key={p.emp_code || i}
                    className="rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                          {p.employee_name || p.name || p.emp_code}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">{p.emp_code}</div>
                      </div>
                      <div className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                        {formatCompactINR(amount)}
                      </div>
                    </div>
                    {target > 0 && (
                      <div className="mt-2 h-1.5 rounded-full bg-[var(--card-hover)] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: PALETTE[i] }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] p-2">
      <div className="text-[10px] text-[var(--text-muted)]">{label}</div>
      <div className="text-xs font-semibold text-[var(--text-primary)] tabular-nums truncate">{value}</div>
    </div>
  )
}

function TargetGauge({ pct, label }) {
  const value = Math.max(0, Math.min(100, Number(pct || 0)))
  const data = [
    { name: 'Done', value },
    { name: 'Left', value: 100 - value },
  ]
  const tone = value >= 80 ? PALETTE[2] : value >= 50 ? PALETTE[3] : PALETTE[4]
  return (
    <div className="relative" style={{ width: '100%', height: 180 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            startAngle={180}
            endAngle={0}
            innerRadius="70%"
            outerRadius="100%"
            stroke="none"
          >
            <Cell fill={tone} />
            <Cell fill="var(--card-hover)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
        <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{label}</div>
        <div className="text-[11px] text-[var(--text-muted)]">of monthly target</div>
      </div>
    </div>
  )
}

function buildMoM(monthlyCcSi) {
  if (!Array.isArray(monthlyCcSi)) return []
  return monthlyCcSi.slice(-6).map((r) => ({
    month: String(r.month || '').slice(2),
    cc: Number(r.cc || 0),
  }))
}

function buildActivityStream(receipts) {
  const list = []
  ;(receipts || []).slice(0, 12).forEach((r) => {
    list.push({
      kind: 'receipt',
      receiptId: r._key || r.id || r.receipt_id || null,
      title: `${receiptCustomerName(r, 'Receipt')} · ${formatCompactINR(receiptAmount(r))}`,
      subtitle: `${receiptEmpCode(r) || '—'}${r.status ? ` · ${r.status}` : ''}`,
      when: r.created_at || r.date,
    })
  })
  list.sort((a, b) => new Date(b.when || 0).getTime() - new Date(a.when || 0).getTime())
  return list.slice(0, 12)
}
