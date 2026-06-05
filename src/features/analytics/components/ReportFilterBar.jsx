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
import {
  buildInvestorOptions,
  filterBranchOptions,
  filterInvestorOptions,
  filterRmOptions,
  filterIssuerOptions,
  filterSchemeOptions,
  formatBranchOptionLabel,
  formatInvestorOptionLabel,
  formatRmOptionLabel,
  formatIssuerOptionLabel,
  formatSchemeOptionLabel,
  toggleListValue
} from '../lib/report-filters.js'
import { api } from '../../../api.js'

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--dashboard-muted)] mb-2">{children}</p>
  )
}

function SelectionChips({ items = [], onRemove, onClear }) {
  if (!items.length) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map((item) => (
        <span
          key={item.key}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-border)]/25 px-2 py-0.5 text-xs text-[var(--dashboard-text)]"
        >
          <span className="truncate max-w-[200px]">{item.label}</span>
          <button
            type="button"
            onClick={() => onRemove(item.key)}
            className="text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)]"
            aria-label={`Remove ${item.label}`}
          >
            ×
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="px-2 py-0.5 text-xs text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)]"
      >
        Clear all
      </button>
    </div>
  )
}

function ChipToggleMultiSelect({ value = [], onChange, options = [], emptyLabel }) {
  if (!options.length) {
    return <div className="text-xs text-[var(--dashboard-muted)]">{emptyLabel}</div>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => {
        const id = typeof opt === 'string' ? opt : opt.value
        const label = typeof opt === 'string' ? opt : opt.label
        const active = (value || []).includes(id)
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(toggleListValue(value, id))}
            className={`px-2 py-1 text-[11px] rounded-lg border transition-colors ${
              active
                ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                : 'border-[var(--dashboard-border)] bg-[var(--dashboard-card)] text-[var(--dashboard-muted)] hover:bg-[var(--dashboard-border)]/40'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function SearchableMultiFilterDropdown({
  value = [],
  options = [],
  onChange,
  filterOptions,
  formatOptionLabel,
  placeholder,
  fallbackPlaceholder,
  allLabel,
  emptyLabel,
  metaKey = 'email'
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const listboxId = React.useId()
  const selectedSet = React.useMemo(() => new Set((value || []).map(String)), [value])
  const filtered = React.useMemo(() => filterOptions(options, query).slice(0, 50), [filterOptions, options, query])
  const selectedOptions = React.useMemo(
    () => options.filter((o) => selectedSet.has(String(o.value))),
    [options, selectedSet]
  )
  const triggerLabel =
    selectedOptions.length === 0
      ? placeholder
      : selectedOptions.length === 1
        ? formatOptionLabel(selectedOptions[0])
        : `${selectedOptions.length} selected`

  const toggle = (optValue) => {
    onChange(toggleListValue(value, optValue))
  }

  if (!options.length) {
    return (
      <Input
        placeholder={fallbackPlaceholder}
        value={(value || []).join(', ')}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          )
        }
        className="min-h-10"
      />
    )
  }

  return (
    <div className="relative">
      <Input
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        placeholder={open ? placeholder : triggerLabel}
        value={open ? query : ''}
        readOnly={!open && selectedOptions.length > 0}
        onFocus={() => {
          setOpen(true)
          setQuery('')
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false)
            setQuery('')
          }
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150)
        }}
        className="min-h-10 pr-16"
      />
      {selectedOptions.length > 0 && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onChange([])
            setQuery('')
            setOpen(false)
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-[var(--dashboard-muted)] hover:bg-[var(--dashboard-border)]/50 hover:text-[var(--dashboard-text)]"
        >
          Clear
        </button>
      )}
      {open && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] p-1 text-sm text-[var(--dashboard-text)] shadow-glass-md"
        >
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange([])
              setOpen(false)
              setQuery('')
            }}
            className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-[var(--dashboard-border)]/40"
          >
            <span>{allLabel}</span>
            <span className="text-xs text-[var(--dashboard-muted)]">No filter</span>
          </button>
          {filtered.map((option) => {
            const checked = selectedSet.has(String(option.value))
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={checked}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggle(option.value)}
                className="flex w-full items-start justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-[var(--dashboard-border)]/40"
              >
                <span className="min-w-0 flex items-start gap-2">
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--dashboard-border)]'
                    }`}
                  >
                    {checked ? '✓' : ''}
                  </span>
                  <span>
                    <span className="block truncate font-medium">{option.label}</span>
                    {option[metaKey] ? (
                      <span className="block truncate text-xs text-[var(--dashboard-muted)]">{option[metaKey]}</span>
                    ) : null}
                  </span>
                </span>
                <span className="shrink-0 rounded-md bg-[var(--dashboard-border)]/35 px-1.5 py-0.5 text-xs text-[var(--dashboard-muted)]">
                  {option.value}
                </span>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div className="px-2 py-3 text-sm text-[var(--dashboard-muted)]">{emptyLabel}</div>
          )}
        </div>
      )}
      <SelectionChips
        items={selectedOptions.map((o) => ({ key: o.value, label: formatOptionLabel(o) }))}
        onRemove={(key) => onChange((value || []).filter((v) => String(v) !== String(key)))}
        onClear={() => onChange([])}
      />
    </div>
  )
}

function InvestorMultiSelect({ value = [], selectedOptions = [], onChange, token }) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [searchOptions, setSearchOptions] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const [picked, setPicked] = React.useState(() => selectedOptions)
  const listboxId = React.useId()
  const selectedSet = React.useMemo(() => new Set((value || []).map(String)), [value])

  React.useEffect(() => {
    setPicked((prev) => {
      const map = new Map(prev.map((o) => [String(o.value), o]))
      for (const id of value || []) {
        const key = String(id)
        if (!map.has(key)) map.set(key, { value: key, label: key })
      }
      return Array.from(map.values()).filter((o) => selectedSet.has(String(o.value)))
    })
  }, [value, selectedSet])

  const filtered = React.useMemo(() => filterInvestorOptions(searchOptions, query).slice(0, 50), [searchOptions, query])

  React.useEffect(() => {
    if (!open || !token) return
    const q = query.trim()
    if (q.length < 2) {
      setSearchOptions([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    const timer = window.setTimeout(() => {
      api
        .searchInvestors(token, { q, limit: '20' })
        .then((result) => {
          if (!cancelled) setSearchOptions(buildInvestorOptions(result))
        })
        .catch(() => {
          if (!cancelled) setSearchOptions([])
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, query, token])

  const addInvestor = (option) => {
    const key = String(option.value)
    if (!selectedSet.has(key)) {
      onChange([...(value || []), key])
      setPicked((prev) => {
        const map = new Map(prev.map((o) => [String(o.value), o]))
        map.set(key, option)
        return Array.from(map.values())
      })
    }
    setQuery('')
  }

  if (!token) {
    return (
      <Input
        placeholder="Investor IDs (comma-separated)"
        value={(value || []).join(', ')}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          )
        }
        className="min-h-10"
      />
    )
  }

  return (
    <div className="relative">
      <Input
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        placeholder={
          picked.length ? `${picked.length} investor(s) selected — search to add more` : 'Search investor by name, PAN, or ID'
        }
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false)
            setQuery('')
          }
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150)
        }}
        className="min-h-10"
      />
      {open && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] p-1 text-sm shadow-glass-md"
        >
          {query.trim().length < 2 && (
            <div className="px-2 py-3 text-sm text-[var(--dashboard-muted)]">Type at least 2 characters to search.</div>
          )}
          {query.trim().length >= 2 && loading && (
            <div className="px-2 py-3 text-sm text-[var(--dashboard-muted)]">Searching investors…</div>
          )}
          {query.trim().length >= 2 &&
            !loading &&
            filtered.map((option) => {
              const checked = selectedSet.has(String(option.value))
              return (
                <button
                  key={option.value}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addInvestor(option)}
                  disabled={checked}
                  className="flex w-full items-start justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-[var(--dashboard-border)]/40 disabled:opacity-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{option.label}</span>
                    <span className="block truncate text-xs text-[var(--dashboard-muted)]">
                      {[option.pan, option.mobile].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-[var(--dashboard-muted)]">{checked ? 'Added' : option.value}</span>
                </button>
              )
            })}
          {query.trim().length >= 2 && !loading && filtered.length === 0 && (
            <div className="px-2 py-3 text-sm text-[var(--dashboard-muted)]">No matching investor found.</div>
          )}
        </div>
      )}
      <SelectionChips
        items={picked.filter((o) => selectedSet.has(String(o.value))).map((o) => ({
          key: o.value,
          label: formatInvestorOptionLabel(o)
        }))}
        onRemove={(key) => onChange((value || []).filter((v) => String(v) !== String(key)))}
        onClear={() => onChange([])}
      />
    </div>
  )
}

/**
 * @param {{
 *   from: string,
 *   to: string,
 *   dateBasis: string,
 *   branchCodes: string[],
 *   empCodes: string[],
 *   productCategories: string[],
 *   schemeCategories: string[],
 *   investorIds: string[],
 *   search: string,
 *   groupBy: string,
 *   includePending: boolean,
 *   hideCc: boolean,
 *   hideSi: boolean,
 *   onChange: (patch: object) => void,
 *   onApply: () => void,
 *   onReset?: () => void,
 *   showGroupBy?: boolean,
 *   showIncludePending?: boolean,
 *   token?: string,
 *   filterProfile?: 'fullReceipt' | 'datesSearch' | 'minimal' | 'customerDetail',
 *   requireInvestorSelection?: boolean,
 *   customerSearch?: string,
 *   dateBasisOptions?: Array<{ value: string, label: string }>
 *   branchOptions?: Array<{ value: string, label: string, type?: string, aliases?: string[], searchText: string }>
 *   rmOptions?: Array<{ value: string, label: string, email?: string, role?: string, searchText: string }>
 *   schemeCategoryOptions?: string[]
 *   schemeCategoriesLoading?: boolean
 *   appliedFrom?: string
 *   appliedTo?: string
 *   appliedDateBasis?: string
 * }} props
 */
export function ReportFilterBar({
  from,
  to,
  dateBasis,
  branchCodes,
  empCodes,
  productCategories,
  schemeCategories,
  issuerNames,
  schemeNames,
  investorIds,
  groupBy,
  includePending,
  hideCc,
  hideSi,
  onChange,
  onApply,
  onReset,
  showGroupBy,
  showIncludePending,
  token,
  filterProfile = 'fullReceipt',
  requireInvestorSelection = false,
  customerSearch = '',
  dateBasisOptions = [
    { value: 'receipt', label: 'Receipt date' },
    { value: 'transaction', label: 'Transaction date' }
  ],
  branchOptions = [],
  rmOptions = [],
  schemeCategoryOptions = [],
  schemeCategoriesLoading = false,
  issuerOptions = [],
  schemeOptions = [],
  issuerLoading = false,
  schemeLoading = false,
  showIssuerSchemeFilters = false,
  showFundSearch = false,
  fundSearch = '',
  appliedFrom = '',
  appliedTo = '',
  appliedDateBasis = ''
}) {
  const isCustomerDetail = filterProfile === 'customerDetail'
  const showScope = filterProfile === 'fullReceipt' || isCustomerDetail
  const showIssuerScheme = showScope && showIssuerSchemeFilters
  const showDatesAndSearch = filterProfile !== 'minimal'
  const completedOnly = includePending === false
  const canApply = true
  const productCategoryRows = React.useMemo(() => {
    const rows = [...RECEIPT_PRODUCT_CATEGORY_FILTER_OPTIONS]
    for (const v of productCategories || []) {
      if (v && !RECEIPT_PRODUCT_CATEGORY_KEYS.has(v)) {
        rows.push({ value: v, label: `${v} (custom)` })
      }
    }
    return rows
  }, [productCategories])

  const schemeRows = React.useMemo(() => {
    const base = (schemeCategoryOptions || []).map((c) => ({ value: c, label: c }))
    for (const v of schemeCategories || []) {
      if (v && !base.some((r) => r.value === v)) base.push({ value: v, label: v })
    }
    return base.sort((a, b) => a.label.localeCompare(b.label))
  }, [schemeCategoryOptions, schemeCategories])

  return (
    <div className="rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)]/80 backdrop-blur-sm p-4 sm:p-5 space-y-4">
      {filterProfile === 'minimal' && (
        <p className="text-sm text-[var(--dashboard-muted)]">
          This report loads a fixed snapshot from the server. Use refresh to reload.
        </p>
      )}

      {isCustomerDetail && (
        <div className="space-y-3">
          <div>
            <SectionLabel>Find customers</SectionLabel>
            <Input
              placeholder="Search name, PAN, mobile, or ID (min 2 characters)"
              value={customerSearch || ''}
              onChange={(e) => onChange({ customerSearch: e.target.value })}
              className="min-h-10"
            />
          </div>
          <p className="text-xs text-[var(--dashboard-muted)]">
            Use branch or product filters to narrow the customer list. Select customers below, or run the report for all
            customers in selected branches / products.
          </p>
        </div>
      )}

      {showFundSearch && (
        <div>
          <SectionLabel>Search funds</SectionLabel>
          <Input
            placeholder="Filter by fund name"
            value={fundSearch || ''}
            onChange={(e) => onChange({ fundSearch: e.target.value })}
            className="min-h-10"
          />
        </div>
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
                <Select value={dateBasis || dateBasisOptions[0]?.value || 'receipt'} onValueChange={(v) => onChange({ dateBasis: v })}>
                  <SelectTrigger className="min-h-10">
                    <SelectValue placeholder="Receipt date" />
                  </SelectTrigger>
                  <SelectContent>
                    {dateBasisOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {showScope && (
            <div>
              <SectionLabel>Scope</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--dashboard-muted)] mb-1">Branches</label>
                  <SearchableMultiFilterDropdown
                    value={branchCodes || []}
                    options={branchOptions}
                    onChange={(branchCodes) => onChange({ branchCodes })}
                    filterOptions={filterBranchOptions}
                    formatOptionLabel={formatBranchOptionLabel}
                    placeholder="Search branches"
                    fallbackPlaceholder="Branch codes"
                    allLabel="All branches"
                    emptyLabel="No matching branch found."
                    metaKey="type"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--dashboard-muted)] mb-1">Employees</label>
                  <SearchableMultiFilterDropdown
                    value={empCodes || []}
                    options={rmOptions}
                    onChange={(empCodes) => onChange({ empCodes })}
                    filterOptions={filterRmOptions}
                    formatOptionLabel={formatRmOptionLabel}
                    placeholder="Search employees"
                    fallbackPlaceholder="Emp codes"
                    allLabel="All employees"
                    emptyLabel="No matching employee found."
                    metaKey="email"
                  />
                </div>
                {showIssuerScheme && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--dashboard-muted)] mb-1">Issuers</label>
                    {issuerLoading ? (
                      <div className="text-xs text-[var(--dashboard-muted)]">Loading issuers…</div>
                    ) : (
                      <SearchableMultiFilterDropdown
                        value={issuerNames || []}
                        options={issuerOptions}
                        onChange={(issuerNames) => onChange({ issuerNames })}
                        filterOptions={filterIssuerOptions}
                        formatOptionLabel={formatIssuerOptionLabel}
                        placeholder="Search issuers"
                        fallbackPlaceholder="Issuer names"
                        allLabel="All issuers"
                        emptyLabel="No matching issuer found."
                      />
                    )}
                  </div>
                )}
                {showIssuerScheme && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--dashboard-muted)] mb-1">Schemes</label>
                    {schemeLoading ? (
                      <div className="text-xs text-[var(--dashboard-muted)]">Loading schemes…</div>
                    ) : (
                      <SearchableMultiFilterDropdown
                        value={schemeNames || []}
                        options={schemeOptions}
                        onChange={(schemeNames) => onChange({ schemeNames })}
                        filterOptions={filterSchemeOptions}
                        formatOptionLabel={formatSchemeOptionLabel}
                        placeholder="Search schemes"
                        fallbackPlaceholder="Scheme names"
                        allLabel="All schemes"
                        emptyLabel="No matching scheme found."
                      />
                    )}
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[var(--dashboard-muted)] mb-1">Products</label>
                  <ChipToggleMultiSelect
                    value={productCategories || []}
                    onChange={(productCategories) => onChange({ productCategories })}
                    options={productCategoryRows}
                    emptyLabel="No product categories configured."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[var(--dashboard-muted)] mb-1">Categories (MF scheme)</label>
                  <ChipToggleMultiSelect
                    value={schemeCategories || []}
                    onChange={(schemeCategories) => onChange({ schemeCategories })}
                    options={schemeRows}
                    emptyLabel={
                      schemeCategoriesLoading
                        ? 'Loading scheme categories…'
                        : 'No MF scheme categories found.'
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {!isCustomerDetail && (
          <div>
            <SectionLabel>Search</SectionLabel>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-[var(--dashboard-muted)] mb-1">Investors</label>
                <InvestorMultiSelect
                  value={investorIds || []}
                  onChange={(investorIds) => onChange({ investorIds, search: '' })}
                  token={token}
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
          )}
        </>
      )}

      {showIncludePending && showScope && (
        <div>
          <SectionLabel>Options</SectionLabel>
          <div className="grid gap-3 md:grid-cols-3">
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
            <div className="flex items-center gap-3">
              <Switch id="hide-cc" checked={!!hideCc} onCheckedChange={(checked) => onChange({ hideCc: checked })} />
              <label htmlFor="hide-cc" className="text-sm font-medium text-[var(--dashboard-text)] cursor-pointer">
                Hide CC
              </label>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="hide-si" checked={!!hideSi} onCheckedChange={(checked) => onChange({ hideSi: checked })} />
              <label htmlFor="hide-si" className="text-sm font-medium text-[var(--dashboard-text)] cursor-pointer">
                Hide SI
              </label>
            </div>
          </div>
          <p className="mt-2 text-xs text-[var(--dashboard-muted)]">
            Hide CC/SI affects on-screen reports and downloaded CSV/Excel files.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--dashboard-border)]/60">
        <Button type="button" onClick={onApply}>
          {filterProfile === 'minimal' ? 'Refresh' : isCustomerDetail ? 'Apply filters & load customers' : 'Apply filters'}
        </Button>
        {onReset && (
          <Button type="button" variant="secondary" onClick={onReset}>
            Reset
          </Button>
        )}
        {showDatesAndSearch && appliedFrom && appliedTo && (
          <p className="text-xs text-[var(--dashboard-muted)] ml-auto">
            Active period:{' '}
            <span className="font-medium text-[var(--dashboard-text)] tabular-nums">
              {appliedFrom} → {appliedTo}
            </span>
            {appliedDateBasis ? (
              <span className="text-[var(--dashboard-muted)]">
                {' '}
                ({dateBasisOptions.find((o) => o.value === appliedDateBasis)?.label || appliedDateBasis})
              </span>
            ) : null}
          </p>
        )}
      </div>
    </div>
  )
}
