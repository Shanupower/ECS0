import React from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../../components/ui'

/**
 * @param {{
 *   title: string,
 *   icon: React.ReactNode,
 *   iconClassName?: string,
 *   href?: string,
 *   linkLabel?: string,
 *   count?: number,
 *   items: unknown[],
 *   maxItems?: number,
 *   emptyLabel: string,
 *   moreCount?: number,
 *   renderItem: (item: unknown, index: number) => React.ReactNode,
 *   getItemKey?: (item: unknown, index: number) => string,
 *   headerExtra?: React.ReactNode,
 * }} props
 */
export default function DashboardSnapshotListCard({
  title,
  icon,
  iconClassName = 'bg-[var(--accent-muted)]',
  href,
  linkLabel = 'View all',
  count,
  items = [],
  maxItems = 4,
  emptyLabel,
  moreCount = 0,
  renderItem,
  getItemKey,
  headerExtra
}) {
  const visible = items.slice(0, maxItems)
  const showCount = count != null ? count : items.length

  return (
    <Card
      padding="lg"
      hover
      className="dashboard-widget-card dashboard-snapshot-list animate-dashboard-widget h-full flex flex-col min-h-0 overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${iconClassName}`}>
            {icon}
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">{title}</h3>
          {showCount > 0 ? (
            <span className="text-xs font-medium text-[var(--text-muted)] tabular-nums shrink-0">
              ({showCount})
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {headerExtra}
          {href ? (
            <Link
              to={href}
              className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]"
            >
              {linkLabel}
            </Link>
          ) : null}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto dashboard-snapshot-list-body">
        {visible.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{emptyLabel}</p>
        ) : (
          <ul className="space-y-0">
            {visible.map((item, index) => (
              <li
                key={getItemKey ? getItemKey(item, index) : String(index)}
                className="py-2 border-b border-[var(--stroke)] last:border-0 last:pb-0"
              >
                {renderItem(item, index)}
              </li>
            ))}
          </ul>
        )}
        {moreCount > 0 ? (
          <p className="text-[11px] text-[var(--text-muted)] mt-2">+{moreCount} more</p>
        ) : null}
      </div>
    </Card>
  )
}
