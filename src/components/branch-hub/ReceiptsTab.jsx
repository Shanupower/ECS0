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
  AreaChart,
  Area,
} from 'recharts'
import { FiArrowRight, FiFileText } from 'react-icons/fi'
import ChartCard, { EmptyState, SkeletonChart } from './ChartCard'
import {
  PALETTE,
  colorFor,
  formatCompactINR,
  formatNumber,
  tooltipStyle,
  tooltipLabelStyle,
  tooltipItemStyle,
  receiptAmount,
  receiptCategory,
  receiptEmpCode,
  receiptCustomerName,
  receiptCustomerKey,
} from './utils'

export default function ReceiptsTab({
  loading,
  byDay,
  byCategory,
  recentReceipts,
  leads,
  customers,
  branchStats,
}) {
  const [overtimeMode, setOvertimeMode] = useState('amount') // 'amount' | 'count'
  const [heatmapMode, setHeatmapMode] = useState('employee') // 'employee' | 'branch'

  const pipeline = useMemo(() => {
    const leadsArr = Array.isArray(leads) ? leads : []
    const totalLeads = leadsArr.length
    const converted = leadsArr.filter((l) => {
      const s = String(l.status || '').toLowerCase()
      return s === 'converted' || s === 'won' || s === 'closed-won' || s === 'closed_won'
    }).length
    const receiptCount = branchStats?.statistics?.total_receipts ?? (recentReceipts || []).length
    return [
      { name: 'Leads', value: totalLeads, color: PALETTE[0] },
      { name: 'Converted', value: converted, color: PALETTE[1] },
      { name: 'Receipts', value: receiptCount, color: PALETTE[2] },
    ]
  }, [leads, recentReceipts, branchStats])

  const overTime = useMemo(() => {
    if (!Array.isArray(byDay)) return []
    return byDay.map((r) => ({
      date: r.date,
      amount: Number(r.amount || 0),
      count: Number(r.n || 0),
    }))
  }, [byDay])

  const statusDonut = useMemo(() => {
    const map = { Completed: 0, Pending: 0, Deleted: 0 }
    ;(recentReceipts || []).forEach((r) => {
      if (r.is_deleted) map.Deleted++
      else if (String(r.status || '').toLowerCase() === 'pending') map.Pending++
      else map.Completed++
    })
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([name, value], i) => ({
        name,
        value,
        color: name === 'Completed' ? PALETTE[2] : name === 'Pending' ? PALETTE[3] : PALETTE[4],
      }))
  }, [recentReceipts])

  const topCustomers = useMemo(() => {
    const byKey = new Map()
    ;(recentReceipts || []).forEach((r) => {
      const name = receiptCustomerName(r)
      const key = receiptCustomerKey(r) || name
      const amt = receiptAmount(r)
      if (!byKey.has(key)) byKey.set(key, { key, name, amount: 0, count: 0 })
      const row = byKey.get(key)
      row.amount += amt
      row.count += 1
    })
    const arr = Array.from(byKey.values()).sort((a, b) => b.amount - a.amount)
    return arr.slice(0, 8)
  }, [recentReceipts])

  const ticketSize = useMemo(() => {
    const buckets = [
      { label: '< ₹10K', max: 10_000, count: 0 },
      { label: '₹10K–50K', max: 50_000, count: 0 },
      { label: '₹50K–1L', max: 100_000, count: 0 },
      { label: '₹1L–5L', max: 500_000, count: 0 },
      { label: '₹5L–10L', max: 1_000_000, count: 0 },
      { label: '> ₹10L', max: Infinity, count: 0 },
    ]
    ;(recentReceipts || []).forEach((r) => {
      const amt = receiptAmount(r)
      const b = buckets.find((x) => amt < x.max)
      if (b) b.count += 1
    })
    return buckets
  }, [recentReceipts])

  const heatmap = useMemo(() => {
    const rowsByKey = new Map()
    const cats = new Set()

    const empCodeToName = new Map()
    ;(recentReceipts || []).forEach((r) => {
      const code = receiptEmpCode(r)
      const name =
        r?.employee_name ||
        r?.employee?.name ||
        r?.employee?.employee_name ||
        r?.employee?.full_name ||
        r?.employeeName ||
        ''
      if (code && name) empCodeToName.set(String(code), String(name))
    })

    const branchLabelForReceipt = (r) => {
      return (
        r?.branch_name ||
        r?.branch_code ||
        r?.branch ||
        r?.employee?.branch_name ||
        r?.employee?.branch_code ||
        r?.employee?.branch ||
        '—'
      )
    }

    ;(recentReceipts || []).forEach((r) => {
      const cat = receiptCategory(r) || 'Other'
      cats.add(cat)

      const empCode = receiptEmpCode(r)
      const empName = empCode ? empCodeToName.get(String(empCode)) : null

      const key = heatmapMode === 'branch' ? String(branchLabelForReceipt(r) || '—') : String(empName || empCode || '—')
      if (!rowsByKey.has(key)) rowsByKey.set(key, { key, label: key, total: 0 })
      const row = rowsByKey.get(key)

      const amt = receiptAmount(r)
      row[cat] = (row[cat] || 0) + amt
      row.total += amt
    })

    const catList = Array.from(cats)
    const rows = Array.from(rowsByKey.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
    const maxVal = Math.max(1, ...rows.flatMap((r) => catList.map((c) => r[c] || 0)))
    return { rows, catList, maxVal }
  }, [recentReceipts, heatmapMode])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SkeletonChart height={220} />
        <SkeletonChart height={220} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChartCard title="Pipeline" subtitle="Leads to receipts funnel" pngName="funnel.png">
          {pipeline.every((p) => p.value === 0) ? (
            <EmptyState message="No pipeline data" hint="Add leads to see the funnel." />
          ) : (
            <FunnelView items={pipeline} />
          )}
        </ChartCard>

        <ChartCard
          title={`Receipts over time (${overtimeMode})`}
          subtitle="Trend over selected range"
          className="lg:col-span-2"
          rightSlot={
            <div className="inline-flex rounded-lg border border-[var(--stroke)] overflow-hidden text-[11px]">
              <button
                type="button"
                onClick={() => setOvertimeMode('amount')}
                className={`px-2 py-1 ${overtimeMode === 'amount' ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}
              >
                Amount
              </button>
              <button
                type="button"
                onClick={() => setOvertimeMode('count')}
                className={`px-2 py-1 ${overtimeMode === 'count' ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}
              >
                Count
              </button>
            </div>
          }
          rows={overTime}
          csvName="receipts-over-time.csv"
          pngName="receipts-over-time.png"
        >
          {overTime.length === 0 ? (
            <EmptyState message="No data in range" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={overTime}>
                <defs>
                  <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE[0]} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={PALETTE[0]} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 11 }} hide={overTime.length > 40} />
                <YAxis
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 11 }}
                  tickFormatter={overtimeMode === 'amount' ? formatCompactINR : formatNumber}
                />
                <RTooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(v) =>
                    overtimeMode === 'amount' ? formatCompactINR(v) : formatNumber(v)
                  }
                />
                <Area
                  type="monotone"
                  dataKey={overtimeMode}
                  stroke={PALETTE[0]}
                  strokeWidth={2}
                  fill="url(#areaFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard
          title="Status"
          subtitle={
            branchStats?.statistics?.total_receipts != null
              ? `In range: ${formatNumber(branchStats.statistics.total_receipts)} receipts · chart from loaded rows`
              : 'Receipt breakdown'
          }
          pngName="status.png"
        >
          {statusDonut.length === 0 ? (
            <EmptyState message="No receipts" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusDonut} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {statusDonut.map((d, i) => (
                    <Cell key={`st-${i}`} fill={d.color} />
                  ))}
                </Pie>
                <RTooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(v, _n, p) => [formatNumber(v), p?.payload?.name]}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-primary)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Receipt Amount Size"
          subtitle={
            branchStats?.statistics?.total_receipts != null
              ? `Buckets from loaded receipts · total in range ${formatNumber(branchStats.statistics.total_receipts)}`
              : 'Receipts by amount bucket'
          }
          rows={ticketSize}
          csvName="receipt-amount-size.csv"
          pngName="receipt-amount-size.png"
        >
          {ticketSize.every((b) => b.count === 0) ? (
            <EmptyState message="No receipts in range" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ticketSize}>
                <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} allowDecimals={false} />
                <RTooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                <Bar dataKey="count" fill={PALETTE[1]} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard
          title="Top customers"
          subtitle="By contribution"
          rows={topCustomers.map((c) => ({ name: c.name, amount: c.amount, count: c.count }))}
          csvName="top-customers.csv"
          pngName="top-customers.png"
        >
          {topCustomers.length === 0 ? (
            <EmptyState icon={FiFileText} message="No customers yet" />
          ) : (
            <div className="space-y-2">
              {topCustomers.map((c, i) => {
                const max = topCustomers[0]?.amount || 1
                const pct = (c.amount / max) * 100
                return (
                  <div key={c.key} className="rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] p-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-[var(--text-primary)] truncate">{c.name}</div>
                      <div className="text-xs font-semibold text-[var(--text-primary)] tabular-nums">
                        {formatCompactINR(c.amount)}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-[var(--card-hover)] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colorFor(i) }} />
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)]">{c.count}x</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Category × employee"
          subtitle="Heatmap of CC contribution"
          pngName="cat-emp-heatmap.png"
        >
          {heatmap.rows.length === 0 ? (
            <EmptyState message="Not enough data" />
          ) : (
            <div className="overflow-x-auto">
              <div className="mb-2 flex items-center justify-end">
                <div className="inline-flex rounded-lg border border-[var(--stroke)] overflow-hidden text-[11px]">
                  <button
                    type="button"
                    onClick={() => setHeatmapMode('employee')}
                    className={`px-2 py-1 ${heatmapMode === 'employee' ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}
                  >
                    Employee
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeatmapMode('branch')}
                    className={`px-2 py-1 ${heatmapMode === 'branch' ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}
                  >
                    Branch
                  </button>
                </div>
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left text-[10px] text-[var(--text-muted)]">
                      {heatmapMode === 'branch' ? 'Branch' : 'Employee'}
                    </th>
                    {heatmap.catList.map((c) => (
                      <th key={c} className="px-2 py-1 text-left text-[10px] text-[var(--text-muted)]">
                        {c}
                      </th>
                    ))}
                    <th className="px-2 py-1 text-right text-[10px] text-[var(--text-muted)]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {heatmap.rows.map((r) => (
                    <tr key={r.key}>
                      <td className="px-2 py-1 font-medium text-[var(--text-primary)]">{r.label}</td>
                      {heatmap.catList.map((c) => {
                        const v = r[c] || 0
                        const intensity = v > 0 ? Math.min(1, v / heatmap.maxVal) : 0
                        return (
                          <td key={`${r.key}-${c}`} className="px-2 py-1">
                            <div
                              className="rounded-md px-2 py-1 text-[10px] text-center tabular-nums"
                              style={{
                                backgroundColor: v > 0 ? hexWithAlpha(PALETTE[0], 0.15 + intensity * 0.6) : 'transparent',
                                border: v > 0 ? '1px solid transparent' : '1px dashed var(--stroke)',
                                color: v > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                                minWidth: 60,
                              }}
                            >
                              {v > 0 ? formatCompactINR(v) : '—'}
                            </div>
                          </td>
                        )
                      })}
                      <td className="px-2 py-1 text-right font-semibold tabular-nums text-[var(--text-primary)]">
                        {formatCompactINR(r.total || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  )
}

function hexWithAlpha(hex, alpha) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function FunnelView({ items }) {
  const max = Math.max(1, ...items.map((x) => x.value))
  return (
    <div className="space-y-2">
      {items.map((it, i) => {
        const value = Number(it.value || 0)
        const pct = value > 0 ? (value / max) * 100 : 0
        const w = `${pct}%`
        return (
          <div key={it.name} className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--text-secondary)]">
                <span className="font-medium">{it.name}</span>
                {i > 0 && items[i - 1].value > 0 && (
                  <span className="ml-1 text-[var(--text-muted)]">
                    <FiArrowRight className="inline w-3 h-3 mx-1" />
                    {Math.round((value / items[i - 1].value) * 100)}%
                  </span>
                )}
              </span>
              <span className="font-semibold tabular-nums text-[var(--text-primary)]">{value}</span>
            </div>
            <div className="h-6 rounded-md bg-[var(--card-hover)] overflow-hidden">
              {value > 0 ? (
                <div className="h-full rounded-md" style={{ width: w, backgroundColor: it.color }} />
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
