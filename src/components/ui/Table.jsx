import React from 'react'
import { cn } from '../../utils/cn'
import { FiChevronUp, FiChevronDown } from 'react-icons/fi'

/**
 * Table with optional sticky header, sort indicators, row density, hover, zebra.
 * @param {Object} props
 * @param {{ key: string, label: string, sortKey?: string, align?: 'left'|'center'|'right' }[]} props.columns
 * @param {React.ReactNode} props.children - tbody content (e.g. rows)
 * @param {{ key: string, dir: 'asc'|'desc' }|null} [props.sort]
 * @param {(key: string, dir: 'asc'|'desc') => void} [props.onSortChange]
 * @param {'compact'|'default'|'comfortable'} [props.density]
 * @param {boolean} [props.stickyHeader]
 * @param {boolean} [props.zebra]
 * @param {string} [props.className]
 */
export function Table({
  columns,
  children,
  sort = null,
  onSortChange,
  density = 'default',
  stickyHeader = false,
  zebra = false,
  className,
}) {
  const densityRowClass = {
    compact: '[&_tr_td]:py-2',
    default: '[&_tr_td]:py-3',
    comfortable: '[&_tr_td]:py-4',
  }[density]

  return (
    <div className={cn('overflow-auto rounded-card border border-[var(--stroke)]', className)}>
      <table className="w-full min-w-[640px] border-collapse text-body">
        <thead>
          <tr className="bg-[var(--card-hover)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'border-b border-[var(--stroke)] px-4 py-3 text-left text-caption text-table-header',
                  stickyHeader && 'sticky top-0 z-10 bg-[var(--card-hover)] backdrop-blur-[12px]',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                  col.sortKey && onSortChange && 'cursor-pointer select-none hover:text-[var(--text-primary)]'
                )}
                onClick={
                  col.sortKey && onSortChange
                    ? () => {
                        const nextDir =
                          sort?.key === col.sortKey && sort?.dir === 'asc' ? 'desc' : 'asc'
                        onSortChange(col.sortKey, nextDir)
                      }
                    : undefined
                }
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortKey && sort?.key === col.sortKey && (
                    <span className="text-[var(--accent)]">
                      {sort.dir === 'asc' ? (
                        <FiChevronUp className="h-4 w-4" />
                      ) : (
                        <FiChevronDown className="h-4 w-4" />
                      )}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          className={cn(
            '[&_tr]:border-b [&_tr]:border-[var(--stroke)] [&_tr_td]:px-4 [&_tr]:transition-colors [&_tr:hover]:bg-[var(--card-hover)]',
            densityRowClass,
            zebra && '[&_tr:nth-child(even)]:bg-[var(--card-hover)]/50'
          )}
        >
          {children}
        </tbody>
      </table>
    </div>
  )
}

/** Table row – use with Table. Applies density padding to cells. */
export function TableRow({ children, className, ...rest }) {
  return (
    <tr className={cn(className)} {...rest}>
      {children}
    </tr>
  )
}

/** Table cell – use inside TableRow. Add density via parent Table. */
export function TableCell({ children, className, align, ...rest }) {
  return (
    <td
      className={cn(
        'px-4 text-body text-[var(--text-primary)]',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
      {...rest}
    >
      {children}
    </td>
  )
}
