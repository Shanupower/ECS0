import React from 'react'
import { cn } from '../../utils/cn'

/** Status: open, in_progress, resolved, closed. Priority: low, medium, high, urgent. */
const STATUS_STYLES = {
  open: 'bg-[var(--accent-muted)] text-[var(--accent)] border-[var(--accent)]/30',
  in_progress: 'bg-[var(--warn-muted)] text-[var(--warn)] border-[var(--warn)]/30',
  resolved: 'bg-[var(--success-muted)] text-[var(--success)] border-[var(--success)]/30',
  closed: 'bg-[var(--card-hover)] text-[var(--text-muted)] border-[var(--stroke)]',
}

const PRIORITY_STYLES = {
  low: 'bg-[var(--card-hover)] text-[var(--text-muted)] border-[var(--stroke)]',
  medium: 'bg-[var(--warn-muted)] text-[var(--warn)] border-[var(--warn)]/30',
  high: 'bg-[var(--warn-muted)] text-[var(--warn)] border-[var(--warn)]/30',
  urgent: 'bg-[var(--error-muted)] text-[var(--error)] border-[var(--error)]/30',
}

/**
 * Badge for status (e.g. open/in_progress/resolved/closed) or priority (low/medium/high/urgent).
 * @param {Object} props
 * @param {'status'|'priority'} [props.variant]
 * @param {string} props.value - e.g. 'open', 'in_progress', 'resolved', 'closed' or 'low','medium','high','urgent'
 * @param {string} [props.label] - override display text
 * @param {string} [props.className]
 */
export function Badge({ variant = 'status', value, label, className }) {
  const styles = variant === 'priority' ? PRIORITY_STYLES : STATUS_STYLES
  const style = styles[value] || styles.open
  const displayLabel = label ?? (value ? String(value).replace('_', ' ') : '')

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg border px-2.5 py-0.5 text-small font-medium capitalize',
        style,
        className
      )}
    >
      {displayLabel}
    </span>
  )
}
