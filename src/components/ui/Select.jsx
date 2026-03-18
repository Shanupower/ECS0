import React from 'react'
import { cn } from '../../utils/cn'

/**
 * Native select with theme styling (stroke, focus).
 * @param {Object} props
 * @param {string} [props.className]
 * @param {string} [props.label]
 * @param {React.ReactNode} [props.children]
 */
export function Select({ className, label, id, children, ...rest }) {
  const selectId = id || (label && label.toLowerCase().replace(/\s/g, '-'))
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-label text-[var(--text-secondary)]">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full rounded-input border border-[var(--stroke)] bg-[var(--card-bg-opaque)] px-4 py-2.5 text-body text-[var(--text-primary)] outline-none transition-colors',
          'focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--canvas)]',
          'dark:bg-[var(--card-bg-opaque)]',
          className
        )}
        {...rest}
      >
        {children}
      </select>
    </div>
  )
}
