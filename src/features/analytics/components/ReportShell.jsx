import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel,
  getSortedRowModel
} from '@tanstack/react-table'
import { Button } from '../../../components/ui/Button.jsx'
import { cn } from '../../../utils/cn'

export function ReportDataTable({
  columns,
  data,
  pageSize = 25,
  totalRows = [],
  formatTotalValue = (_field, value) => value,
  manualPagination = false
}) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(manualPagination ? {} : { getPaginationRowModel: getPaginationRowModel() }),
    getSortedRowModel: getSortedRowModel(),
    manualPagination,
    initialState: { pagination: { pageSize } }
  })

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[var(--dashboard-border)] overflow-hidden bg-[var(--dashboard-card)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--dashboard-border)]/20 text-left text-[var(--dashboard-muted)]">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-4 py-3 font-medium whitespace-nowrap">
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-[var(--dashboard-border)]/60 hover:bg-[var(--dashboard-border)]/10"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2.5 text-[var(--dashboard-text)] whitespace-nowrap max-w-[280px] truncate">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {totalRows.length > 0 && (
              <tfoot className="border-t-2 border-[var(--dashboard-border)] bg-[var(--dashboard-border)]/15">
                {totalRows.map((totalRow) => (
                  <tr key={totalRow.label}>
                    {table.getVisibleLeafColumns().map((column, index) => {
                      const hasValue = Object.prototype.hasOwnProperty.call(totalRow.values, column.id)
                      return (
                        <td
                          key={column.id}
                          className="px-4 py-3 font-semibold text-[var(--dashboard-text)] whitespace-nowrap tabular-nums"
                        >
                          {index === 0
                            ? totalRow.label
                            : hasValue
                              ? formatTotalValue(column.id, totalRow.values[column.id])
                              : ''}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tfoot>
            )}
          </table>
        </div>
      </div>
      {!manualPagination && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--dashboard-muted)]">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function SummaryCards({ items, className }) {
  if (!items?.length) return null
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3', className)}>
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] p-4 shadow-card"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--dashboard-muted)]">{it.label}</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--dashboard-text)] tabular-nums">{it.value}</p>
        </div>
      ))}
    </div>
  )
}

export function ReportShell({ title, description, actions, summaryCards, filters, children }) {
  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 min-w-0 flex-1">
          <nav className="text-xs text-[var(--dashboard-muted)] flex flex-wrap items-center gap-1.5 tracking-wide">
            <Link to="/analytics" className="hover:text-[var(--dashboard-text)] transition-colors">
              Business Analytics
            </Link>
            <span aria-hidden className="text-[var(--dashboard-border)]">
              /
            </span>
            <span className="text-[var(--dashboard-text)] font-medium truncate">{title}</span>
          </nav>
          <h1 className="text-headline font-semibold text-[var(--dashboard-text)] tracking-tight">{title}</h1>
          {description ? (
            <p className="text-sm text-[var(--dashboard-muted)] max-w-3xl leading-relaxed">{description}</p>
          ) : null}
        </div>
        {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
      </header>
      {summaryCards && <SummaryCards items={summaryCards} />}
      {filters}
      {children}
    </div>
  )
}
