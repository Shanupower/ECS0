import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  Legend,
  Treemap,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { FiBriefcase, FiMapPin, FiUsers } from 'react-icons/fi'
import ChartCard, { CardBadge, EmptyState, SkeletonChart } from './ChartCard'
import {
  PALETTE,
  colorFor,
  formatCompactINR,
  formatNumber,
  tooltipStyle,
  tooltipLabelStyle,
  tooltipItemStyle,
  receiptCustomerName,
  receiptCustomerKey,
} from './utils'

export default function CustomersTab({
  loading,
  customers,
  leads,
  investorLocations,
  recentReceipts,
}) {
  const newVsReturning = useMemo(() => {
    const counts = new Map()
    ;(recentReceipts || []).forEach((r) => {
      const key = receiptCustomerKey(r)
      if (!key) return
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    let repeat = 0
    let once = 0
    counts.forEach((v) => {
      if (v > 1) repeat += 1
      else once += 1
    })
    const out = []
    if (once) out.push({ name: 'New', value: once, color: PALETTE[0] })
    if (repeat) out.push({ name: 'Returning', value: repeat, color: PALETTE[2] })
    return out
  }, [recentReceipts])

  const states = useMemo(() => {
    if (!investorLocations || typeof investorLocations !== 'object') return []
    const map =
      investorLocations.byState && typeof investorLocations.byState === 'object'
        ? investorLocations.byState
        : investorLocations
    const rows = Object.entries(map)
      .filter(([, data]) => data && typeof data === 'object' && !Array.isArray(data))
      .map(([state, data], i) => {
        const count = data?.count ?? data?.n ?? 0
        const amount = data?.amount ?? data?.total_investments ?? 0
        return { name: state, count: Number(count) || 0, amount: Number(amount) || 0, color: colorFor(i) }
      })
      .filter((r) => r.count > 0 || r.amount > 0)
    rows.sort((a, b) => b.amount - a.amount || b.count - a.count)
    return rows
  }, [investorLocations])

  const topSegments = useMemo(() => {
    const byCity = new Map()
    ;(customers || []).forEach((c) => {
      const raw =
        c.city ||
        c.address?.city ||
        c.permanent_address?.city ||
        c.communication_address?.city ||
        ''
      const city = String(raw).trim()
      if (!city) return
      byCity.set(city, (byCity.get(city) || 0) + 1)
    })
    return Array.from(byCity.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [customers])
  const topSegmentChartHeight = Math.max(220, topSegments.length * 34)

  const portfolioMix = useMemo(() => {
    const byCust = new Map()
    const catSet = new Set()
    ;(recentReceipts || []).forEach((r) => {
      const name = receiptCustomerName(r)
      if (name === 'Unknown') return
      const cat = r.product?.category || r.product_category || 'Other'
      catSet.add(cat)
      if (!byCust.has(name)) byCust.set(name, { name, total: 0 })
      const row = byCust.get(name)
      const amt = Number(
        r.investment_amount || r.fd_deposit_amount || r.transaction?.amount || 0
      )
      row[cat] = (row[cat] || 0) + amt
      row.total += amt
    })
    const rows = Array.from(byCust.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
    return { rows, categories: Array.from(catSet) }
  }, [recentReceipts])

  const leadKanban = useMemo(() => {
    const stages = ['new', 'contacted', 'qualified', 'won', 'lost']
    const buckets = stages.map((s) => ({ stage: s, count: 0, amount: 0 }))
    ;(leads || []).forEach((l) => {
      const s = String(l.status || 'new').toLowerCase()
      const entry = buckets.find((b) => s.includes(b.stage)) || buckets[0]
      entry.count += 1
      entry.amount += Number(l.expected_amount || l.amount || 0)
    })
    return buckets
  }, [leads])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SkeletonChart height={260} />
        <SkeletonChart height={260} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChartCard title="New vs returning" subtitle="From recent receipts" pngName="new-returning.png">
          {newVsReturning.length === 0 ? (
            <EmptyState icon={FiUsers} message="No customer data" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={newVsReturning} dataKey="value" nameKey="name" innerRadius={50} outerRadius={88} paddingAngle={2}>
                  {newVsReturning.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <RTooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-primary)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Investor locations"
          subtitle="By state"
          className="lg:col-span-2"
          rows={states.map((s) => ({ state: s.name, count: s.count, amount: s.amount }))}
          csvName="investor-states.csv"
          pngName="investor-states.png"
        >
          {states.length === 0 ? (
            <EmptyState icon={FiMapPin} message="No location data" hint="Add investor address info to enable this widget." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ResponsiveContainer width="100%" height={220}>
                <Treemap
                  data={states.slice(0, 12).map((s) => ({
                    name: s.name,
                    size: Math.max(1, s.count),
                    count: s.count,
                    amount: s.amount,
                    fill: s.color,
                  }))}
                  dataKey="size"
                  stroke="var(--card-bg-opaque)"
                  isAnimationActive={false}
                  content={<TreemapCell />}
                >
                  <RTooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={(_v, _n, p) => [
                      `${formatNumber(p?.payload?.count ?? 0)} · ${formatCompactINR(p?.payload?.amount ?? 0)}`,
                      p?.payload?.name,
                    ]}
                  />
                </Treemap>
              </ResponsiveContainer>
              <div className="space-y-1 max-h-[220px] overflow-y-auto">
                {states.slice(0, 15).map((s, i) => {
                  const maxCount = states[0]?.count || 1
                  const pct = (s.count / maxCount) * 100
                  return (
                    <div key={s.name} className="rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] p-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-[var(--text-primary)] truncate">{s.name}</div>
                        <div className="text-[11px] text-[var(--text-muted)] tabular-nums">
                          {formatNumber(s.count)} · {formatCompactINR(s.amount)}
                        </div>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-[var(--card-hover)] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colorFor(i) }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChartCard
          title="Top segments"
          subtitle="Customers by city"
          rows={topSegments}
          csvName="segments.csv"
          pngName="segments.png"
        >
          {topSegments.length === 0 ? (
            <EmptyState icon={FiBriefcase} message="No customer segmentation" />
          ) : (
            <ResponsiveContainer width="100%" height={topSegmentChartHeight}>
              <BarChart data={topSegments} layout="vertical" margin={{ top: 4, right: 8, left: 60, bottom: 0 }}>
                <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 10 }} width={90} interval={0} />
                <RTooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                <Bar dataKey="value" fill={PALETTE[1]} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Portfolio mix"
          subtitle="Top customers by category"
          className="lg:col-span-2"
          pngName="portfolio.png"
        >
          {portfolioMix.rows.length === 0 ? (
            <EmptyState message="No data" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={portfolioMix.rows}>
                <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} tickFormatter={formatCompactINR} />
                <RTooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(v) => formatCompactINR(v)}
                />
                <Legend wrapperStyle={{ fontSize: 10, color: 'var(--text-primary)' }} />
                {portfolioMix.categories.map((c, i) => (
                  <Bar key={c} dataKey={c} stackId="mix" fill={colorFor(i)} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Lead pipeline" subtitle="By stage with counts and expected amount" pngName="leads.png">
        {leadKanban.every((b) => b.count === 0) ? (
          <EmptyState message="No leads yet" hint="Add leads to see them here." />
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {leadKanban.map((b, i) => (
              <div key={b.stage} className="rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    {b.stage}
                  </div>
                  <CardBadge tone={b.stage === 'won' ? 'success' : b.stage === 'lost' ? 'error' : 'default'}>
                    {b.count}
                  </CardBadge>
                </div>
                <div className="mt-2 text-sm font-bold text-[var(--text-primary)] tabular-nums">
                  {formatCompactINR(b.amount)}
                </div>
                <div className="mt-1 h-1 rounded-full" style={{ backgroundColor: colorFor(i) }} />
              </div>
            ))}
          </div>
        )}
      </ChartCard>
    </div>
  )
}

function TreemapCell(props) {
  const { x, y, width, height, name, count, fill } = props
  if (width <= 0 || height <= 0) return null
  const showLabel = width > 52 && height > 28
  const textColor = readableTextColor(fill)
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{ fill, stroke: 'var(--card-bg-opaque)', strokeWidth: 2 }}
      />
      {showLabel && (
        <>
          <text
            x={x + 8}
            y={y + 18}
            fill={textColor}
            style={{ fontSize: 11, fontWeight: 600, pointerEvents: 'none' }}
          >
            {name}
          </text>
          {height > 44 && (
            <text
              x={x + 8}
              y={y + 34}
              fill={textColor}
              style={{ fontSize: 10, opacity: 0.85, pointerEvents: 'none' }}
            >
              {count}
            </text>
          )}
        </>
      )}
    </g>
  )
}

function readableTextColor(bgHex) {
  if (!bgHex || typeof bgHex !== 'string') return '#ffffff'
  const h = bgHex.replace('#', '')
  if (h.length < 6) return '#ffffff'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  // YIQ luminance — choose dark text for light fills, white text for dark fills.
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 160 ? '#1d1d1f' : '#ffffff'
}
