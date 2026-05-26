import React from 'react'
import { FiActivity, FiBarChart, FiMapPin, FiPieChart, FiTarget } from 'react-icons/fi'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { Card } from '../../../components/ui'
import { DONUT_COLORS } from '../dashboard-chart-constants.js'

export function ByCategoryWidget({ categoryChartData, formatCurrency, navigate }) {
  return (
    <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget h-full min-h-[7.5rem]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-card flex items-center justify-center mr-3 bg-[var(--dashboard-primary)]/12">
            <FiBarChart className="w-5 h-5 text-[var(--dashboard-primary)]" />
          </div>
          <div>
            <h3 className="text-title font-semibold text-[var(--text)]">By Category</h3>
            <p className="text-small text-[var(--text-muted)]">Investment breakdown</p>
          </div>
        </div>
      </div>
      {categoryChartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={categoryChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="colorCategory" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--dashboard-primary)" stopOpacity={0.95} />
                <stop offset="95%" stopColor="var(--dashboard-primary)" stopOpacity={0.75} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke)" opacity={0.3} />
            <XAxis dataKey="category" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickLine={{ stroke: 'var(--stroke)' }} />
            <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickLine={{ stroke: 'var(--stroke)' }} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
            <Tooltip
              formatter={(value) => [formatCurrency(value), 'Amount']}
              labelFormatter={(label) => `Category: ${label}`}
              contentStyle={{ backgroundColor: 'var(--card-bg-opaque)', border: '1px solid var(--stroke)', borderRadius: '12px', boxShadow: 'var(--shadow-card)', padding: '12px 16px' }}
              labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
              itemStyle={{ color: 'var(--text-primary)' }}
              cursor={{ fill: 'rgba(37, 99, 235, 0.08)' }}
            />
            <Bar
              dataKey="amount"
              fill="url(#colorCategory)"
              radius={[8, 8, 0, 0]}
              maxBarSize={60}
              onClick={(payload) => payload?.rawCategory != null && navigate(`/transactions?category=${encodeURIComponent(payload.rawCategory)}`)}
              cursor="pointer"
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <FiBarChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No category data available</p>
        </div>
      )}
    </Card>
  )
}

export function CategoryDonutWidget({ categoryChartData, formatCurrency }) {
  const donutTotal = categoryChartData.reduce((s, d) => s + d.amount, 0)
  const formatDonutCenter = (n) => {
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
    return formatCurrency(n)
  }
  const DonutCenterLabel = (props) => {
    const v = props.viewBox || {}
    const cx = props.cx ?? v.cx ?? (v.x != null && v.width != null ? v.x + v.width / 2 : null)
    const cy = props.cy ?? v.cy ?? (v.y != null && v.height != null ? v.y + v.height / 2 : null)
    if (cx == null || cy == null) return null
    return (
      <g>
        <text x={cx} y={cy - 12} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 13, fill: 'var(--text-primary)' }}>
          Total
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 20, fontWeight: 700, fill: 'var(--text-primary)' }}>
          {formatDonutCenter(donutTotal)}
        </text>
      </g>
    )
  }

  return (
    <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget h-full min-h-[7.5rem]">
      <div className="flex items-center gap-2 mb-4">
        <FiPieChart className="w-5 h-5 text-[var(--accent)]" />
        <h3 className="text-title font-semibold text-[var(--text)]">By category</h3>
      </div>
      <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4">
        <div className="[filter:drop-shadow(0_8px_24px_rgba(0,0,0,0.12))] flex-shrink-0" style={{ width: 'min(100%, 360px)' }}>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Pie data={categoryChartData} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={88} outerRadius={140} paddingAngle={2} label={false}>
                <Label content={<DonutCenterLabel />} position="center" />
                {categoryChartData.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => {
                  const pct = donutTotal > 0 ? ((value / donutTotal) * 100).toFixed(1) : 0
                  return [`${formatCurrency(value)} · ${pct}%`, name]
                }}
                contentStyle={{ backgroundColor: 'var(--card-bg-opaque)', border: '1px solid var(--stroke)', borderRadius: '12px', padding: '10px 14px' }}
                labelStyle={{ color: 'var(--text-primary)', marginBottom: 4, fontWeight: 600 }}
                itemStyle={{ color: 'var(--text-primary)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex flex-col justify-center gap-2.5 flex-1 min-w-0">
          {categoryChartData.map((d, i) => {
            const pct = donutTotal > 0 ? ((d.amount / donutTotal) * 100).toFixed(0) : 0
            return (
              <li key={d.category} className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                <span className="text-sm font-medium text-[var(--text-primary)] truncate">{d.category}</span>
                <span className="text-sm text-[var(--text-primary)] font-semibold flex-shrink-0">{pct}%</span>
              </li>
            )
          })}
        </ul>
      </div>
    </Card>
  )
}

export function DailyTimelineWidget({ dailyStats, formatCurrency, formatDate }) {
  return (
    <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget h-full min-h-[7.5rem]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-[var(--success-muted)] rounded-card flex items-center justify-center mr-3">
            <FiActivity className="w-5 h-5 text-[var(--success)]" />
          </div>
          <div>
            <h3 className="text-title font-semibold text-[var(--text)]">Daily Timeline</h3>
            <p className="text-small text-[var(--text-muted)]">Investment trends</p>
          </div>
        </div>
      </div>
      {dailyStats.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={dailyStats} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="colorTimeline" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--dashboard-primary)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--dashboard-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke)" opacity={0.3} />
            <XAxis dataKey="date" tickFormatter={formatDate} stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickLine={{ stroke: 'var(--stroke)' }} />
            <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickLine={{ stroke: 'var(--stroke)' }} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
            <Tooltip
              formatter={(value) => [formatCurrency(value), 'Amount']}
              labelFormatter={(label) => `Date: ${formatDate(label)}`}
              contentStyle={{ backgroundColor: 'var(--card-bg-opaque)', border: '1px solid var(--stroke)', borderRadius: '12px', boxShadow: 'var(--shadow-card)', padding: '12px 16px' }}
              labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
              itemStyle={{ color: 'var(--text-primary)' }}
              cursor={{ stroke: 'var(--dashboard-primary)' }}
            />
            <Line type="monotone" dataKey="amount" stroke="var(--dashboard-primary)" strokeWidth={3} dot={{ fill: 'var(--dashboard-primary)', strokeWidth: 2, r: 5 }} activeDot={{ r: 7 }} fill="url(#colorTimeline)" />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <FiActivity className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No daily data available</p>
        </div>
      )}
    </Card>
  )
}

export function BranchPerformanceWidget({
  allBranchesTargetSummary,
  dateRange,
  formatCurrency,
  scaleMonthlyTargetToDateRange,
  toSafeNumber,
  openBranchBreakdown
}) {
  const { branches, totalTarget, totalCc, overallPct } = allBranchesTargetSummary
  return (
    <Card
      padding="lg"
      hover
      className="dashboard-widget-card dashboard-widget-branch-performance animate-dashboard-widget h-full min-h-0 flex flex-col overflow-hidden"
    >
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center">
          <FiMapPin className="w-5 h-5 text-[var(--accent)] mr-2" />
          <h3 className="text-title font-semibold text-[var(--text)]">Branch Performance Overview</h3>
        </div>
        <p className="text-helper text-[var(--text-muted)]">All branches · period from filters above</p>
      </div>
      <div className="mb-4 shrink-0 rounded-card border border-[var(--stroke)] bg-[var(--card-hover)]/50 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <FiTarget className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Target summary (all branches)</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-small">
          <div>
            <div className="text-[var(--text-muted)] mb-0.5">Combined target (period)</div>
            <div className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(totalTarget)}</div>
          </div>
          <div>
            <div className="text-[var(--text-muted)] mb-0.5">Collection / credit (actual)</div>
            <div className="text-lg font-bold text-[var(--warn)]">{formatCurrency(totalCc)}</div>
          </div>
          <div>
            <div className="text-[var(--text-muted)] mb-0.5">Attainment vs target</div>
            <div className="text-lg font-bold text-[var(--accent)]">
              {totalTarget > 0 ? `${overallPct.toFixed(1)}%` : '—'}
            </div>
          </div>
        </div>
        {totalTarget > 0 && (
          <div className="mt-3 h-2.5 bg-[var(--stroke)] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${overallPct}%`, backgroundColor: 'var(--accent, #0071e3)', maxWidth: '100%' }} />
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 pb-1">
          {branches.map((branch, index) => {
            const monthlyBranchTarget = toSafeNumber(branch.total_target)
            const tgt = scaleMonthlyTargetToDateRange(monthlyBranchTarget, dateRange.from, dateRange.to)
            const cc = toSafeNumber(branch.commissions ?? branch.total_cc)
            const branchPct = tgt > 0 ? Math.min(100, Math.max(0, (cc / tgt) * 100)) : null
            return (
              <button
                key={branch.branch_code || branch.branch || index}
                type="button"
                onClick={() => openBranchBreakdown(branch)}
                className="text-left rounded-card border border-[var(--stroke)] bg-[var(--card-hover)] p-4 hover:shadow-card hover:bg-[var(--card-bg)] transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center min-w-0">
                    <div className="w-8 h-8 bg-[var(--accent-muted)] rounded-full flex items-center justify-center mr-3 shrink-0">
                      <span className="text-small font-bold text-[var(--accent)]">#{index + 1}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-small font-medium text-[var(--text)] truncate">{branch.branch || branch.branch_name || 'Unknown Branch'}</div>
                      <div className="text-xs text-[var(--text-muted)] truncate">{branch.branch_code ? `Code: ${branch.branch_code}` : (branch.branch_name || branch.branch || '')}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-small gap-2">
                    <span className="text-[var(--text-muted)] shrink-0">Target (period)</span>
                    <span className="font-medium text-[var(--text)] text-right">{formatCurrency(tgt)}</span>
                  </div>
                  <div className="flex justify-between text-small gap-2">
                    <span className="text-[var(--text-muted)] shrink-0">CC (actual)</span>
                    <span className="font-medium text-[var(--text)] text-right">{formatCurrency(cc)}</span>
                  </div>
                  {branchPct != null && (
                    <div className="pt-1">
                      <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                        <span>vs target</span>
                        <span>{branchPct.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-[var(--stroke)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${branchPct}%`, maxWidth: '100%' }} />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between text-small border-t border-[var(--stroke)]/80 pt-2 mt-2">
                    <span className="text-[var(--text-muted)]">Investments</span>
                    <span className="font-medium text-[var(--text)]">{formatCurrency(branch.total_investments || 0)}</span>
                  </div>
                  <div className="flex justify-between text-small">
                    <span className="text-[var(--text-muted)]">Receipts</span>
                    <span className="font-medium text-[var(--text)]">{branch.total_receipts || 0}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
