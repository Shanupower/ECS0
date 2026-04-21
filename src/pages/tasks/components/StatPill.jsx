import React from 'react'

const TONES = {
  amber:   'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10',
  rose:    'border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-900/10',
  emerald: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10',
  blue:    'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10',
  violet:  'border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10',
  slate:   'border-[var(--stroke)] bg-[var(--card-bg)]'
}

export default function StatPill({ label, value, tone = 'slate', icon, onClick, active = false, hint }) {
  const toneCls = TONES[tone] || TONES.slate
  const interactive = typeof onClick === 'function'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      title={hint || ''}
      className={`text-left w-full rounded-lg border px-3 py-2 transition-colors ${toneCls} ${interactive ? 'hover:shadow-sm cursor-pointer' : 'cursor-default'} ${active ? 'ring-2 ring-[var(--accent)]/60' : ''}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] truncate">{label}</span>
        {icon && <span className="text-[var(--text-muted)] flex-shrink-0">{icon}</span>}
      </div>
      <div className="text-lg font-semibold text-[var(--text-primary)] tabular-nums leading-tight">{value}</div>
    </button>
  )
}
