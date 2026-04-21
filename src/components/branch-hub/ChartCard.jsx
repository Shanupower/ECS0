import React from 'react'
import { FiInbox } from 'react-icons/fi'
import { motion } from 'framer-motion'

export default function ChartCard({
  title,
  subtitle,
  children,
  rightSlot = null,
  className = '',
  minHeight = null,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`relative rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] p-4 ${className}`}
      style={minHeight ? { minHeight } : undefined}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          {title && (
            <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{title}</div>
          )}
          {subtitle && (
            <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">{subtitle}</div>
          )}
        </div>
        {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
      </div>
      {children}
    </motion.div>
  )
}

export function CardBadge({ children, tone = 'default' }) {
  const map = {
    default: 'bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] border-[var(--stroke)]',
    success: 'bg-[var(--success-muted)] text-[var(--success)] border-[var(--success)]/30',
    warn: 'bg-[var(--warn-muted)] text-[var(--warn)] border-[var(--warn)]/30',
    error: 'bg-[var(--error-muted)] text-[var(--error)] border-[var(--error)]/30',
    accent: 'bg-[var(--accent-muted)] text-[var(--accent)] border-[var(--accent)]/30',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${map[tone] || map.default}`}>
      {children}
    </span>
  )
}

export function SkeletonChart({ height = 240 }) {
  return (
    <div
      className="w-full rounded-lg bg-[var(--card-hover)] animate-pulse"
      style={{ height }}
    />
  )
}

export function EmptyState({ icon: Icon = FiInbox, message = 'No data available', hint }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 text-[var(--text-muted)]">
      <Icon className="w-6 h-6 mb-2" />
      <div className="text-sm font-medium">{message}</div>
      {hint && <div className="text-xs mt-1">{hint}</div>}
    </div>
  )
}
