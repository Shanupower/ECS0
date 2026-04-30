import React from 'react'
import { FiEdit3, FiPhoneCall, FiVideo, FiArrowRightCircle, FiUserCheck, FiUser, FiCheckCircle, FiRotateCcw } from 'react-icons/fi'

function formatWhen(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const now = new Date()
    const sameDay = d.toDateString() === now.toDateString()
    const opts = sameDay
      ? { hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
    return d.toLocaleString(undefined, opts)
  } catch {
    return iso
  }
}

function iconFor(kind) {
  switch (kind) {
    case 'note': return <FiEdit3 className="w-3.5 h-3.5" />
    case 'call': return <FiPhoneCall className="w-3.5 h-3.5" />
    case 'meeting': return <FiVideo className="w-3.5 h-3.5" />
    case 'stage_change': return <FiArrowRightCircle className="w-3.5 h-3.5" />
    case 'owner_change': return <FiUserCheck className="w-3.5 h-3.5" />
    case 'created': return <FiUser className="w-3.5 h-3.5" />
    case 'converted': return <FiCheckCircle className="w-3.5 h-3.5" />
    case 'reactivated': return <FiRotateCcw className="w-3.5 h-3.5" />
    default: return <FiEdit3 className="w-3.5 h-3.5" />
  }
}

function colorFor(kind) {
  switch (kind) {
    case 'call': return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    case 'meeting': return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
    case 'stage_change': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    case 'owner_change': return 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
    case 'converted': return 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    case 'reactivated': return 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    case 'created': return 'bg-[var(--card-hover)] text-[var(--text-secondary)]'
    default: return 'bg-[var(--card-hover)] text-[var(--text-secondary)]'
  }
}

export default function LeadActivityFeed({ items = [], loading = false, empty = 'No activity yet. Log your first note, call, or meeting above.' }) {
  if (loading) {
    return <div className="text-sm text-[var(--text-muted)] py-4">Loading activity…</div>
  }
  if (!items.length) {
    return <div className="text-sm text-[var(--text-muted)] py-4">{empty}</div>
  }
  return (
    <ul className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
      {items.map((a) => (
        <li key={a._key} className="flex gap-2.5">
          <span className={`flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full ${colorFor(a.kind)}`}>
            {iconFor(a.kind)}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-[var(--text-primary)] capitalize">
                {(a.kind || '').replace('_', ' ')}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">{formatWhen(a.created_at)}</span>
            </div>
            {a.body && <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap break-words mt-0.5">{a.body}</p>}
            {a.outcome && <p className="text-xs text-[var(--text-muted)] mt-0.5">Outcome: {a.outcome}</p>}
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              {a.created_by_name || a.created_by_emp_code || '—'}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
