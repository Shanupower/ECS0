import React from 'react'

const FILTERS = [
  { value: 'overdue', label: 'Overdue', tone: 'red' },
  { value: 'due_today', label: 'Due today', tone: 'amber' },
  { value: 'due_this_week', label: 'This week', tone: 'blue' },
  { value: 'due_this_month', label: 'This month', tone: 'indigo' },
  { value: 'all', label: 'All', tone: 'neutral' }
]

const TONE = {
  red: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800',
  amber: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800',
  blue: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800',
  neutral: 'bg-[var(--card-hover)] text-[var(--text-primary)] border-[var(--stroke)]'
}

export default function ReviewFilterChips({ value, onChange, counts = {} }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {FILTERS.map((f) => {
        const active = value === f.value
        const count = Number(counts[f.value] ?? 0)
        return (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
              active
                ? TONE[f.tone]
                : 'border-[var(--stroke)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]'
            }`}
          >
            <span>{f.label}</span>
            <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-semibold ${
              active ? 'bg-white/50 dark:bg-black/20' : 'bg-[var(--card-hover)]'
            }`}>
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
