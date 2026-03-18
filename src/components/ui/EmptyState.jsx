import React from 'react'
import { cn } from '../../utils/cn'
import { FiInbox } from 'react-icons/fi'

/**
 * Empty state with icon, message, and optional primary/secondary actions.
 * @param {Object} props
 * @param {React.ReactNode} [props.icon]
 * @param {string} [props.title]
 * @param {string} [props.message]
 * @param {React.ReactNode} [props.primaryAction]
 * @param {React.ReactNode} [props.secondaryAction]
 * @param {string} [props.className]
 */
export function EmptyState({
  icon,
  title = 'No results',
  message,
  primaryAction,
  secondaryAction,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-card border border-[var(--stroke)] bg-[var(--card-bg)]/50 py-12 px-6 text-center backdrop-blur-[20px]',
        className
      )}
    >
      <div className="text-[var(--text-muted)]">
        {icon ?? <FiInbox className="mx-auto h-12 w-12" />}
      </div>
      <div className="space-y-1">
        <h3 className="text-title font-semibold text-[var(--text)]">{title}</h3>
        {message && <p className="text-body text-[var(--text-muted)]">{message}</p>}
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {primaryAction}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}
