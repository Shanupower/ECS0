import * as React from 'react'
import { Input } from '../../../components/ui/Input.jsx'
import { Button } from '../../../components/ui/Button.jsx'
import { Switch } from '../../../components/ui/Switch.jsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../../components/ui/Select.jsx'
import {
  RECEIPT_PRODUCT_CATEGORY_FILTER_OPTIONS,
  RECEIPT_PRODUCT_CATEGORY_KEYS
} from '../../../data/receipt_product_categories.js'

const PRODUCT_CATEGORY_ALL = '__all__'

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--dashboard-muted)] mb-2">{children}</p>
  )
}

/**
 * @param {{
 *   from: string,
 *   to: string,
 *   dateBasis: string,
 *   branchCode: string,
 *   empCode: string,
 *   category: string,
 *   search: string,
 *   groupBy: string,
 *   includePending: boolean,
 *   onChange: (patch: object) => void,
 *   onApply: () => void,
 *   onReset?: () => void,
 *   showGroupBy?: boolean,
 *   showIncludePending?: boolean,
 *   filterProfile?: 'fullReceipt' | 'datesSearch' | 'minimal'
 * }} props
 */
export function ReportFilterBar({
  from,
  to,
  dateBasis,
  branchCode,
  empCode,
  category,
  search,
  groupBy,
  includePending,
  onChange,
  onApply,
  onReset,
  showGroupBy,
  showIncludePending,
  filterProfile = 'fullReceipt'
}) {
  const showScope = filterProfile === 'fullReceipt'
  const showDatesAndSearch = filterProfile !== 'minimal'
  const completedOnly = includePending === false
  const categoryTrimmed = (category || '').trim()
  const productCategoryRows = React.useMemo(() => {
    const rows = [...RECEIPT_PRODUCT_CATEGORY_FILTER_OPTIONS]
    if (categoryTrimmed && !RECEIPT_PRODUCT_CATEGORY_KEYS.has(categoryTrimmed)) {
      rows.push({ value: categoryTrimmed, label: `${categoryTrimmed} (custom)` })
    }
    return rows
  }, [categoryTrimmed])

  return (
    <div className="rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)]/80 backdrop-blur-sm p-4 sm:p-5 space-y-4">
      {filterProfile === 'minimal' && (
        <p className="text-sm text-[var(--dashboard-muted)]">
          This report loads a fixed snapshot from the server. Use refresh to reload.
        </p>
      )}

      {showDatesAndSearch && (
        <>
          <div>
            <SectionLabel>Date range</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--dashboard-muted)] mb-1">From</label>
                <Input type="date" value={from} onChange={(e) => onChange({ from: e.target.value })} className="min-h-10" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--dashboard-muted)] mb-1">To</label>
                <Input type="date" value={to} onChange={(e) => onChange({ to: e.target.value })} className="min-h-10" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--dashboard-muted)] mb-1">Date basis</label>
                <Select value={dateBasis || 'receipt'} onValueChange={(v) => onChange({ dateBasis: v })}>
                  <SelectTrigger className="min-h-10">
                    <SelectValue placeholder="Receipt date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receipt">Receipt date</SelectItem>
                    <SelectItem value="transaction">Transaction date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {showScope && (
            <div>
              <SectionLabel>Scope</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--dashboard-muted)] mb-1">Branch code</label>
                  <Input
                    placeholder="Admin filter"
                    value={branchCode}
                    onChange={(e) => onChange({ branchCode: e.target.value })}
                    className="min-h-10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--dashboard-muted)] mb-1">RM (emp code)</label>
                  <Input
                    placeholder="Emp code"
                    value={empCode}
                    onChange={(e) => onChange({ empCode: e.target.value })}
                    className="min-h-10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--dashboard-muted)] mb-1">Product category</label>
                  <Select
                    value={categoryTrimmed || PRODUCT_CATEGORY_ALL}
                    onValueChange={(v) => onChange({ category: v === PRODUCT_CATEGORY_ALL ? '' : v })}
                  >
                    <SelectTrigger className="min-h-10">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PRODUCT_CATEGORY_ALL}>All categories</SelectItem>
                      {productCategoryRows.map((row) => (
                        <SelectItem key={row.value} value={row.value}>
                          {row.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <div>
            <SectionLabel>Search</SectionLabel>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-[var(--dashboard-muted)] mb-1">Text</label>
                <Input
                  placeholder="Receipt / investor…"
                  value={search}
                  onChange={(e) => onChange({ search: e.target.value })}
                  className="min-h-10 w-full"
                />
              </div>
              {showGroupBy && (
                <div className="w-full sm:w-48 shrink-0">
                  <label className="block text-xs font-medium text-[var(--dashboard-muted)] mb-1">Group by</label>
                  <Select value={groupBy || 'none'} onValueChange={(v) => onChange({ groupBy: v === 'none' ? '' : v })}>
                    <SelectTrigger className="min-h-10">
                      <SelectValue placeholder="Detail rows" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Detail rows</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="amc">AMC / Issuer</SelectItem>
                      <SelectItem value="branch">Branch</SelectItem>
                      <SelectItem value="rm">RM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showIncludePending && showScope && (
        <div>
          <SectionLabel>Options</SectionLabel>
          <div className="flex flex-col gap-1.5 max-w-md">
            <div className="flex items-center gap-3">
              <Switch
                id="completed-only"
                checked={completedOnly}
                onCheckedChange={(checked) => onChange({ includePending: !checked })}
              />
              <label htmlFor="completed-only" className="text-sm font-medium text-[var(--dashboard-text)] cursor-pointer">
                Completed receipts only
              </label>
            </div>
            <p className="text-xs text-[var(--dashboard-muted)] pl-[3.25rem]">
              When off, pending and draft rows are included (matches broad KPI views).
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--dashboard-border)]/60">
        <Button type="button" onClick={onApply}>
          {filterProfile === 'minimal' ? 'Refresh' : 'Apply filters'}
        </Button>
        {onReset && (
          <Button type="button" variant="secondary" onClick={onReset}>
            Reset
          </Button>
        )}
      </div>
    </div>
  )
}
