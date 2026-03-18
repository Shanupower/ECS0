import React from 'react'
import { cn } from '../../utils/cn'
import { FiX } from 'react-icons/fi'

/**
 * Filter tag with optional close. Selected state for active filters.
 * @param {Object} props
 * @param {string} props.label
 * @param {() => void} [props.onClose]
 * @param {boolean} [props.selected]
 * @param {string} [props.className]
 */
export function Chip({ label, onClose, selected = false, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 text-caption font-medium transition-colors',
        selected
          ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]'
          : 'border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--text-primary)]',
        className
      )}
    >
      {label}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          aria-label={`Remove ${label}`}
        >
          <FiX className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  )
}
