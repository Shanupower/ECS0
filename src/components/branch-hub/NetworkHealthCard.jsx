import React, { useMemo } from 'react'
import { FiAlertTriangle, FiCheckCircle } from 'react-icons/fi'
import ChartCard, { EmptyState } from './ChartCard'
import { formatCompactINR, formatPct } from './utils'

// Network-wide analogue of <BranchHealthCard>. Shows how many branches are tracking
// on/off target and surfaces the worst offenders so an admin can spot weak links
// without drilling into each branch individually.
export default function NetworkHealthCard({ branches = [] }) {
  const { healthy, atRisk, behind, worst } = useMemo(() => {
    const rows = (branches || [])
      .map((b) => {
        const target = Number(b.total_target || 0)
        const achieved = Number(b.total_investments || 0)
        const pct = target > 0 ? Math.min(999, (achieved / target) * 100) : null
        return {
          code: b.branch_code || b.branch,
          name: b.branch_name || b.branch || b.branch_code || 'Unknown',
          target,
          achieved,
          pct,
        }
      })
      // Branches without a monthly_target can't be scored – skip them.
      .filter((r) => r.pct != null)

    const healthyN = rows.filter((r) => r.pct >= 75).length
    const atRiskN = rows.filter((r) => r.pct >= 45 && r.pct < 75).length
    const behindN = rows.filter((r) => r.pct < 45).length
    const worstList = [...rows].sort((a, b) => a.pct - b.pct).slice(0, 4)
    return { healthy: healthyN, atRisk: atRiskN, behind: behindN, worst: worstList }
  }, [branches])

  const hasScorable = healthy + atRisk + behind > 0
  if (!hasScorable) {
    return (
      <ChartCard title="Network health" subtitle="Branch attainment" className="lg:col-span-1">
        <EmptyState message="No branch targets set" hint="Configure monthly_target on branches to score attainment." />
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Network health" subtitle="Branch attainment" className="lg:col-span-1">
      <div className="grid grid-cols-3 gap-2">
        <HealthTile tone="success" count={healthy} label="On track" hint="≥ 75%" icon={FiCheckCircle} />
        <HealthTile tone="warn" count={atRisk} label="At risk" hint="45–74%" icon={FiAlertTriangle} />
        <HealthTile tone="error" count={behind} label="Behind" hint="< 45%" icon={FiAlertTriangle} />
      </div>

      {worst.length > 0 && (
        <>
          <div className="mt-4 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
            Needs attention
          </div>
          <div className="mt-1.5 space-y-1.5">
            {worst.map((b) => {
              const pct = Math.max(0, Math.min(100, Number(b.pct)))
              const tone = pct >= 75
                ? 'bg-[var(--success)]'
                : pct >= 45
                  ? 'bg-[var(--warn)]'
                  : 'bg-[var(--error)]'
              return (
                <div
                  key={b.code || b.name}
                  className="rounded-md border border-[var(--stroke)] bg-[var(--card-bg-opaque)] px-2 py-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate text-[var(--text-primary)] font-medium">{b.name}</span>
                    <span className="tabular-nums text-[var(--text-secondary)]">{formatPct(b.pct, 0)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-[var(--card-hover)] overflow-hidden">
                    <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-0.5 text-[10px] text-[var(--text-muted)] tabular-nums">
                    {formatCompactINR(b.achieved)} / {formatCompactINR(b.target)}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </ChartCard>
  )
}

function HealthTile({ tone, count, label, hint, icon: Icon }) {
  const map = {
    success: 'text-[var(--success)] bg-[var(--success-muted)]',
    warn: 'text-[var(--warn)] bg-[var(--warn-muted)]',
    error: 'text-[var(--error)] bg-[var(--error-muted)]',
  }
  return (
    <div className="rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] p-2 text-center">
      <div className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${map[tone]}`}>
        {Icon ? <Icon className="h-3 w-3" /> : null}
      </div>
      <div className="mt-1 text-lg font-bold tabular-nums text-[var(--text-primary)]">{count}</div>
      <div className="text-[10px] text-[var(--text-muted)] leading-tight">
        {label}
        <br />
        <span className="opacity-60">{hint}</span>
      </div>
    </div>
  )
}
