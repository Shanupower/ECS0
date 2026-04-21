import React, { useMemo } from 'react'
import ChartCard from './ChartCard'

export default function BranchHealthCard({
  branchMonthlyTarget,
  totalInvestments = 0,
  staleLeadsCount = 0,
  staleCustomersCount = 0,
}) {
  const { score, label } = useMemo(() => {
    const tgt = Number(branchMonthlyTarget) || 0
    const inv = Number(totalInvestments) || 0
    if (tgt <= 0) {
      return { score: null, label: 'Set a branch monthly target to score attainment.' }
    }
    const attainment = Math.min(100, (inv / tgt) * 100)
    const sl = Number(staleLeadsCount) || 0
    const sc = Number(staleCustomersCount) || 0
    const stalePenalty = Math.min(25, sl * 3 + sc * 1)
    const raw = Math.max(0, Math.round(attainment - stalePenalty))
    return {
      score: raw,
      label: `Attainment vs branch monthly target, minus weight for stale leads (${sl}) and customers (${sc}) from queue metrics.`,
    }
  }, [branchMonthlyTarget, totalInvestments, staleLeadsCount, staleCustomersCount])

  if (score == null) {
    return (
      <ChartCard title="Branch health" subtitle="Target vs pace">
        <p className="text-sm text-[var(--text-muted)]">{label}</p>
      </ChartCard>
    )
  }

  const barTone = score >= 75 ? 'bg-[var(--success)]' : score >= 45 ? 'bg-[var(--warn)]' : 'bg-[var(--error)]'
  const textTone =
    score >= 75 ? 'text-[var(--success)]' : score >= 45 ? 'text-[var(--warn)]' : 'text-[var(--error)]'

  return (
    <ChartCard title="Branch health" subtitle="Heuristic score (0–100)" className="lg:col-span-1">
      <div className="flex items-end gap-3">
        <div className={`text-4xl font-bold tabular-nums ${textTone}`}>{score}</div>
        <div className="text-xs text-[var(--text-muted)] pb-1">index (0–100)</div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-[var(--card-hover)] overflow-hidden">
        <div className={`h-full rounded-full ${barTone}`} style={{ width: `${Math.min(100, score)}%` }} />
      </div>
      <p className="text-[10px] text-[var(--text-muted)] mt-2">{label}</p>
    </ChartCard>
  )
}
