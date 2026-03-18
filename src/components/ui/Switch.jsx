import React from 'react'
import { cn } from '../../utils/cn'

/**
 * Toggle switch. Clean track + elevated white thumb; accent when on.
 */
export function Switch({ checked = false, onChange, className, disabled, ...rest }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--canvas)] disabled:opacity-50',
        checked
          ? 'bg-[var(--accent)]'
          : 'bg-neutral-200 dark:bg-neutral-600',
        className
      )}
      {...rest}
    >
      <span
        className={cn(
          'pointer-events-none absolute top-0.5 left-0.5 inline-block h-5 w-5 rounded-full bg-blue-600 shadow transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}
