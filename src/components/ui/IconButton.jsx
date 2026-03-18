import React, { useState } from 'react'
import { cn } from '../../utils/cn'

/**
 * Icon-only button with tooltip and aria-label for accessibility.
 * @param {Object} props
 * @param {React.ReactNode} props.icon
 * @param {string} [props.label] – tooltip and aria-label
 * @param {'primary'|'secondary'|'ghost'} [props.variant]
 * @param {string} [props.className]
 * @param {boolean} [props.disabled]
 */
export function IconButton({
  icon,
  label,
  variant = 'ghost',
  className,
  disabled,
  ...rest
}) {
  const [showTooltip, setShowTooltip] = useState(false)

  const base =
    'inline-flex items-center justify-center rounded-card p-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--canvas)] active:scale-95 disabled:opacity-50 disabled:pointer-events-none'
  const variants = {
    primary: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]',
    secondary: 'bg-[var(--card-bg)] border border-[var(--stroke)] text-[var(--text-primary)] hover:bg-[var(--card-hover)]',
    ghost: 'text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]',
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className={cn(base, variants[variant], className)}
        aria-label={label || undefined}
        title={label || undefined}
        disabled={disabled}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        {...rest}
      >
        <span className="flex h-5 w-5 items-center justify-center" aria-hidden>
          {icon}
        </span>
      </button>
      {label && showTooltip && (
        <span
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-card bg-[var(--card-bg-opaque)] px-2.5 py-1.5 text-small font-medium text-[var(--text-primary)] shadow-lg border border-[var(--stroke)]"
          role="tooltip"
        >
          {label}
        </span>
      )}
    </span>
  )
}
