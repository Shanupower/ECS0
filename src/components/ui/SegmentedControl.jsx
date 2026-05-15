import React from 'react'
import { cn } from '../../utils/cn'

/**
 * Pill group for view modes / filters. Selected segment uses theme accent.
 * @param {Object} props
 * @param {{ value: string, label: string }[]} props.options
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {string} [props.className]
 */
export function SegmentedControl({ options, value, onChange, className }) {
  return (
    <div
      className={cn(
        'inline-flex rounded-pill border border-[var(--stroke)] bg-[var(--card-bg)] p-0.5',
        className
      )}
      role="tablist"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-pill px-4 py-2 text-caption font-medium transition-colors',
            value === opt.value
              ? 'bg-[var(--dashboard-primary)] text-white shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)]'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
