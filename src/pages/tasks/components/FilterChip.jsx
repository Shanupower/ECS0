import React from 'react'

export default function FilterChip({ active, onClick, children, count, tone = 'neutral' }) {
  const activeCls =
    tone === 'rose' ? 'bg-rose-500/10 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-200'
    : tone === 'amber' ? 'bg-amber-500/10 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-200'
    : tone === 'emerald' ? 'bg-emerald-500/10 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-200'
    : 'bg-[var(--accent)]/10 border-[var(--accent)]/40 text-[var(--accent)]'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? activeCls : 'border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)]'
      }`}
    >
      <span>{children}</span>
      {count != null && (
        <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full px-1 text-[10px] font-semibold tabular-nums ${active ? 'bg-white/40 dark:bg-black/30' : 'bg-[var(--card-hover)] text-[var(--text-muted)]'}`}>
          {count}
        </span>
      )}
    </button>
  )
}
