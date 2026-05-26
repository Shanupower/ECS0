import React, { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts'
import { FiSearch, FiUsers, FiEdit3, FiAlertTriangle } from 'react-icons/fi'
import ChartCard, { CardBadge, EmptyState, SkeletonChart } from './ChartCard'
import {
  PALETTE,
  colorFor,
  formatCompactINR,
  formatINR,
  formatNumber,
  formatPct,
  tooltipStyle,
  tooltipLabelStyle,
  tooltipItemStyle,
  receiptAmount,
  receiptDate,
  receiptEmpCode,
  receiptCategory,
  scaleMonthlyTargetToDateRange,
} from './utils'

export default function EmployeesTab({
  loading,
  employees,
  employeePerformance,
  recentReceipts,
  receiptFilterKey = '',
  branchMonthlyTarget,
  onEditTarget,
  networkMode = false,
  branchBreakdown = [],
  dateRange,
}) {
  const [search, setSearch] = useState('')

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employees || []
    return (employees || []).filter((u) => {
      return (
        String(u.name || '').toLowerCase().includes(q) ||
        String(u.emp_code || '').toLowerCase().includes(q) ||
        String(u.email || '').toLowerCase().includes(q)
      )
    })
  }, [employees, search])

  // In network mode the per-employee pie is unreadable (hundreds of slices), so we
  // slice the monthly target pool by branch instead — which is what an admin actually
  // wants to see across the whole org.
  const allocationData = useMemo(() => {
    if (networkMode) {
      return (branchBreakdown || [])
        .map((b, i) => ({
          name: b.branch_name || b.branch_code || b.branch || 'Unknown',
          value: Number(b.total_target || 0),
          color: colorFor(i),
        }))
        .filter((r) => r.value > 0)
        .sort((a, b) => b.value - a.value)
    }
    const branchTarget = Number(branchMonthlyTarget || 0)
    const rows = (employees || [])
      .filter((u) => u.personal_monthly_target != null && u.personal_monthly_target !== '')
      .map((u, i) => ({
        name: u.name || u.emp_code || 'Employee',
        value: Number(u.personal_monthly_target) || 0,
        color: colorFor(i),
      }))
      .filter((r) => r.value > 0)
    const allocated = rows.reduce((s, r) => s + r.value, 0)
    if (branchTarget > 0 && branchTarget > allocated) {
      rows.push({
        name: 'Unallocated',
        value: branchTarget - allocated,
        color: 'var(--stroke)',
      })
    }
    return rows
  }, [networkMode, branchBreakdown, employees, branchMonthlyTarget])

  const actualVsTarget = useMemo(() => {
    // Dedupe by emp_code (an employee can appear in multiple performance rows when
    // they straddle branches/months) and merge their metrics.
    const byCode = new Map()
    ;(employeePerformance || []).forEach((r) => {
      const code = r.emp_code || r.employee_code || ''
      const key = code || `__row_${byCode.size}`
      const monthlyTarget = Number(r.effective_target || r.personal_target || 0)
      const periodTarget = scaleMonthlyTargetToDateRange(monthlyTarget, dateRange?.from, dateRange?.to)
      const existing = byCode.get(key)
      if (existing) {
        existing.Achieved += Number(r.total_cc || r.total_investment || 0)
        existing.Target = Math.max(existing.Target, periodTarget)
        if (!existing.name && r.employee_name) existing.name = r.employee_name
      } else {
        byCode.set(key, {
          emp_code: code,
          name: r.employee_name || code,
          Achieved: Number(r.total_cc || r.total_investment || 0),
          Target: periodTarget,
        })
      }
    })
    // Recharts categorises rows by the category-axis key. Use a *stable unique*
    // label so rows never collapse (and we can reliably show top 12).
    const rows = Array.from(byCode.values())
    rows.forEach((row, i) => {
      const baseName = String(row.name || row.emp_code || 'Employee').trim() || 'Employee'
      const code = String(row.emp_code || '').trim()
      row.displayName = baseName
      // Always unique: prevents duplicate-name collapse and makes it easier to read.
      row.label = code ? `${baseName} (${code})` : `${baseName} #${i + 1}`
      row.pct = row.Target > 0 ? Math.min(100, (row.Achieved / row.Target) * 100) : 0
    })
    rows.sort((a, b) => b.Achieved - a.Achieved)
    return rows.slice(0, 12)
  }, [employeePerformance, dateRange?.from, dateRange?.to])

  // Compute per-employee last-14-day sparkline from recentReceipts.
  const perEmpSparklines = useMemo(() => {
    const map = new Map()
    ;(recentReceipts || []).forEach((r) => {
      const emp = receiptEmpCode(r)
      const d = receiptDate(r)
      if (!emp || !d) return
      if (!map.has(emp)) map.set(emp, {})
      const bucket = map.get(emp)
      bucket[d] = (bucket[d] || 0) + receiptAmount(r)
    })
    return map
  }, [recentReceipts])

  // Build 14-day date backbone.
  const dateBackbone = useMemo(() => {
    const out = []
    const now = new Date()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    }
    return out
  }, [])

  const perEmpLastActivity = useMemo(() => {
    const map = new Map()
    ;(recentReceipts || []).forEach((r) => {
      const emp = receiptEmpCode(r)
      const dateStr = receiptDate(r) || r.created_at
      if (!emp || !dateStr) return
      const t = new Date(dateStr).getTime()
      const prev = map.get(emp) || 0
      if (t > prev) map.set(emp, t)
    })
    return map
  }, [recentReceipts])

  const inactive7 = useMemo(() => {
    const now = Date.now()
    const cutoff7 = now - 7 * 24 * 60 * 60 * 1000
    return (employees || []).filter((u) => {
      const emp = u.emp_code
      if (!emp) return false
      const last = perEmpLastActivity.get(emp) || 0
      return last < cutoff7
    })
  }, [employees, perEmpLastActivity])

  // In network mode the "who hasn't logged a receipt" signal is at the branch level
  // (an inactive branch is far more urgent than one inactive employee in a busy one).
  const inactiveBranches = useMemo(() => {
    if (!networkMode) return []
    return (branchBreakdown || [])
      .filter((b) => Number(b.total_receipts || 0) === 0)
      .map((b) => ({
        code: b.branch_code || b.branch,
        name: b.branch_name || b.branch_code || b.branch || 'Unknown',
      }))
  }, [networkMode, branchBreakdown])

  const teamMix = useMemo(() => {
    // Build emp_code → display name map from performance rows + employee directory.
    const nameMap = new Map()
    ;(employeePerformance || []).forEach((r) => {
      if (r.emp_code && r.employee_name) nameMap.set(r.emp_code, r.employee_name)
    })
    ;(employees || []).forEach((u) => {
      if (u.emp_code && u.name && !nameMap.has(u.emp_code)) nameMap.set(u.emp_code, u.name)
    })
    const byEmp = new Map()
    ;(recentReceipts || []).forEach((r) => {
      const emp = receiptEmpCode(r)
      if (!emp) return
      const cat = receiptCategory(r) || 'Other'
      if (!byEmp.has(emp)) {
        byEmp.set(emp, { emp_code: emp, name: nameMap.get(emp) || emp, total: 0 })
      }
      const row = byEmp.get(emp)
      const amt = receiptAmount(r)
      row[cat] = (row[cat] || 0) + amt
      row.total += amt
    })
    const rows = Array.from(byEmp.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
    const catsSet = new Set()
    rows.forEach((r) =>
      Object.keys(r).forEach(
        (k) => k !== 'emp_code' && k !== 'name' && k !== 'total' && catsSet.add(k)
      )
    )
    return { rows, categories: Array.from(catsSet) }
  }, [recentReceipts, employeePerformance, employees, receiptFilterKey])

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
          title={networkMode ? 'Target by branch' : 'Target allocation'}
          subtitle={networkMode ? 'Monthly target pool split per branch' : 'Personal targets vs branch pool'}
          pngName="allocation.png"
          rows={
            networkMode
              ? allocationData.map((d) => ({ branch: d.name, target: d.value }))
              : undefined
          }
          csvName={networkMode ? 'target-by-branch.csv' : undefined}
        >
          {allocationData.length === 0 ? (
            <EmptyState
              message={networkMode ? 'No branch targets set' : 'No targets set'}
              hint={
                networkMode
                  ? 'Configure monthly_target on each branch to see how the pool is split.'
                  : 'Set personal monthly targets for your employees.'
              }
            />
          ) : networkMode ? (
            <TargetByBranchList data={allocationData} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={allocationData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={1}>
                  {allocationData.map((d, i) => (
                    <Cell key={`al-${i}`} fill={d.color} />
                  ))}
                </Pie>
                <RTooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(v, _n, p) => [formatCompactINR(v), p?.payload?.name || '']}
                />
                <Legend wrapperStyle={{ fontSize: 10, color: 'var(--text-primary)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Actual vs target"
          subtitle="Top 12 by achievement"
          className="lg:col-span-2"
          rows={actualVsTarget.map((r) => ({
            name: r.displayName,
            label: r.label,
            emp_code: r.emp_code,
            Achieved: r.Achieved,
            Target: r.Target,
            pct: r.pct,
          }))}
          csvName="actual-vs-target.csv"
          pngName="actual-vs-target.png"
        >
          {actualVsTarget.length === 0 ? (
            <EmptyState icon={FiUsers} message="No employee performance data" />
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart
                data={actualVsTarget}
                layout="vertical"
                margin={{ top: 5, right: 12, left: 40, bottom: 0 }}
                barCategoryGap={26}
                barGap={10}
              >
                <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 11 }} tickFormatter={formatCompactINR} />
                <YAxis
                  type="category"
                  dataKey="label"
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 10 }}
                  width={160}
                  interval={0}
                />
                <RTooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(v) => formatCompactINR(v)}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-primary)' }} />
                <Bar dataKey="Achieved" fill={PALETTE[0]} radius={[0, 6, 6, 0]} maxBarSize={10} />
                <Bar dataKey="Target" fill={PALETTE[3]} fillOpacity={0.4} radius={[0, 6, 6, 0]} maxBarSize={10} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChartCard
          title={networkMode ? 'Inactive branches' : 'Inactivity'}
          subtitle={
            networkMode
              ? 'Branches with no receipts in the selected range'
              : 'Employees with no receipts in the last 7 days'
          }
          pngName="inactivity.png"
        >
          {networkMode ? (
            inactiveBranches.length === 0 ? (
              <EmptyState message="Every branch logged receipts in range" />
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto">
                {inactiveBranches.map((b) => (
                  <div
                    key={b.code || b.name}
                    className="flex items-center justify-between rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] p-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[var(--text-primary)] truncate">{b.name}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{b.code}</div>
                    </div>
                    <CardBadge tone="warn">
                      <FiAlertTriangle className="w-3 h-3" />
                      no receipts
                    </CardBadge>
                  </div>
                ))}
              </div>
            )
          ) : inactive7.length === 0 ? (
            <EmptyState message="Everyone has recent activity" />
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {inactive7.map((u) => (
                <div key={u.emp_code} className="flex items-center justify-between rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] p-2">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                      {u.name || u.emp_code}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">{u.emp_code}</div>
                  </div>
                  <CardBadge tone="warn">
                    <FiAlertTriangle className="w-3 h-3" />
                    inactive
                  </CardBadge>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Team mix"
          subtitle="Category split by employee"
          className="lg:col-span-2"
          pngName="team-mix.png"
        >
          {teamMix.rows.length === 0 ? (
            <EmptyState message="Not enough data" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={teamMix.rows} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} tickFormatter={formatCompactINR} />
                <RTooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(v) => formatCompactINR(v)}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-primary)' }} />
                {teamMix.categories.map((c, i) => (
                  <Bar key={c} dataKey={c} stackId="mix" fill={colorFor(i)} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Leaderboard"
        subtitle="Employee-level targets, activity and progress"
        rightSlot={
          <div className="relative w-full sm:w-60">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-4 w-4 text-[var(--text-muted)]" />
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)]"
            />
          </div>
        }
        rows={filteredEmployees.map((u) => ({
          emp_code: u.emp_code,
          name: u.name,
          role: u.role,
          personal_target: u.personal_monthly_target ?? '',
        }))}
        csvName="employees.csv"
        pngName="employee-leaderboard.png"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--card-hover)]">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Emp Code</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Name</th>
                <th className="px-3 py-2 text-right text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Target</th>
                <th className="px-3 py-2 text-right text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Achieved</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Progress</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Last 14 days</th>
                <th className="px-3 py-2 text-right text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--stroke)]/60">
              {filteredEmployees.map((u) => {
                const perf = (employeePerformance || []).find(
                  (p) => p.emp_code === u.emp_code
                )
                const monthlyTarget = Number(u.personal_monthly_target || perf?.effective_target || 0)
                const target = scaleMonthlyTargetToDateRange(monthlyTarget, dateRange?.from, dateRange?.to)
                const achieved = Number(perf?.total_cc || perf?.total_investment || 0)
                const pct = target > 0 ? Math.min(100, (achieved / target) * 100) : 0
                const atRisk = target > 0 && pct < paceBenchmark()
                const bucket = perEmpSparklines.get(u.emp_code) || {}
                const spark = dateBackbone.map((d) => ({ d, v: bucket[d] || 0 }))
                const barTone = pct >= 80 ? PALETTE[2] : pct >= 50 ? PALETTE[3] : PALETTE[4]
                return (
                  <tr key={u.id || u._key || u.emp_code} className="hover:bg-[var(--card-bg-opaque)]">
                    <td className="px-3 py-2 text-xs text-[var(--text-primary)] tabular-nums">{u.emp_code}</td>
                    <td className="px-3 py-2 text-xs text-[var(--text-primary)]">
                      <div className="flex items-center gap-1">
                        <span className="truncate max-w-[160px]">{u.name}</span>
                        {atRisk && <CardBadge tone="warn">at risk</CardBadge>}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">{u.role}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-right text-[var(--text-secondary)] tabular-nums">
                      {target > 0 ? formatCompactINR(target) : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-right text-[var(--text-secondary)] tabular-nums">
                      {formatCompactINR(achieved)}
                    </td>
                    <td className="px-3 py-2 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-[var(--card-hover)] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barTone }} />
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] tabular-nums w-8 text-right">
                          {formatPct(pct, 0)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 min-w-[120px]">
                      <div style={{ width: 120, height: 28 }}>
                        <ResponsiveContainer>
                          <LineChart data={spark} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                            <Line type="monotone" dataKey="v" stroke={PALETTE[0]} strokeWidth={1.5} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onEditTarget?.(u)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-muted)] text-[var(--accent)] hover:bg-[var(--accent-muted)]/70"
                      >
                        <FiEdit3 className="w-3 h-3" />
                        Target
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-[var(--text-muted)] text-xs">
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}

// Rough "pace benchmark": how far into the month we should be at % target.
function paceBenchmark() {
  const now = new Date()
  const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return Math.min(100, (now.getDate() / total) * 100 * 0.9) // 90% of ideal pace is the "ok" threshold
}

// Scannable ranked list for the "Target by branch" card. A pie with 30+ slices is
// unreadable at this card width, so we show the biggest share visually (bar width
// is normalised to the top branch) and label each row with ₹ amount + % of total.
// A single accent tone beats a rainbow here — the *ranking* carries the signal, not
// the hue.
function TargetByBranchList({ data }) {
  const total = data.reduce((s, r) => s + (Number(r.value) || 0), 0)
  const top = Number(data[0]?.value) || 0
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] text-[var(--text-muted)]">
          {data.length} branch{data.length === 1 ? '' : 'es'}
        </div>
        <div className="text-[11px] text-[var(--text-muted)] tabular-nums">
          Total <span className="text-[var(--text-primary)] font-medium">{formatCompactINR(total)}</span>
        </div>
      </div>
      <div
        className="overflow-y-auto pr-1 -mr-1 divide-y divide-[var(--stroke)]/40"
        style={{ maxHeight: 260 }}
      >
        {data.map((row, i) => {
          const value = Number(row.value) || 0
          const pct = total > 0 ? (value / total) * 100 : 0
          const width = top > 0 ? (value / top) * 100 : 0
          // Fade out the tail so the eye lands on the anchor branches first.
          const barOpacity = Math.max(0.35, 1 - i * 0.02)
          return (
            <div
              key={`${row.name}-${i}`}
              className="flex items-center gap-2 py-1.5 text-xs"
              title={`${row.name} · ${formatCompactINR(value)} · ${formatPct(pct, 1)} of total`}
            >
              <span className="w-5 text-right tabular-nums text-[10px] text-[var(--text-muted)] shrink-0">
                {i + 1}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[var(--text-primary)] font-medium">{row.name}</span>
                  <span className="shrink-0 tabular-nums text-[var(--text-secondary)]">
                    {formatCompactINR(value)}
                    <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">
                      {formatPct(pct, pct < 1 ? 1 : 0)}
                    </span>
                  </span>
                </span>
                <span className="mt-1 block h-1 rounded-full bg-[var(--card-hover)] overflow-hidden">
                  <span
                    className="block h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${width}%`, opacity: barOpacity }}
                  />
                </span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
