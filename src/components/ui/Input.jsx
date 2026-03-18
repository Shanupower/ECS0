import React from 'react'
import { cn } from '../../utils/cn'

/**
 * Themed text input. Border, radius, focus ring, optional error state.
 * @param {Object} props
 * @param {string} [props.className]
 * @param {boolean} [props.error]
 * @param {string} [props.label]
 */
export function Input({ className, error, label, id, ...rest }) {
  const inputId = id || (label && label.toLowerCase().replace(/\s/g, '-'))
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-label text-[var(--text-secondary)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full rounded-input border bg-[var(--card-bg-opaque)] px-4 py-2.5 text-body text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--placeholder)]',
          'border-[var(--stroke)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--canvas)]',
          error && 'border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]/30',
          className
        )}
        {...rest}
      />
    </div>
  )
}
