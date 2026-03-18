import React from 'react'
import { cn } from '../../utils/cn'

/**
 * Button with primary / secondary / ghost variants. Soft pressed state, optional icon.
 * @param {Object} props
 * @param {'primary'|'secondary'|'ghost'} [props.variant]
 * @param {React.ReactNode} [props.icon]
 * @param {React.ReactNode} [props.children]
 * @param {string} [props.className]
 * @param {boolean} [props.disabled]
 */
export function Button({
  variant = 'primary',
  type = 'button',
  icon,
  children,
  className,
  disabled,
  ...rest
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--canvas)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none'

  const variants = {
    primary:
      'bg-[var(--dashboard-primary)] text-white border border-[var(--dashboard-primary)] shadow-sm hover:bg-[var(--dashboard-primary-hover)] hover:border-[var(--dashboard-primary-hover)] hover:shadow-card',
    secondary:
      'bg-[var(--card-bg)] border border-[var(--stroke)] text-[var(--text-primary)] hover:bg-[var(--card-hover)]',
    ghost:
      'bg-transparent text-[var(--text-primary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]',
  }

  return (
    <button
      type={type}
      className={cn(base, 'px-5 py-2.5 text-body', variants[variant], className)}
      disabled={disabled}
      {...rest}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  )
}
