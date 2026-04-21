import React, { useEffect, useState } from 'react'
import { FiCalendar, FiFilter, FiMenu, FiSliders, FiBookmark, FiPlus, FiRefreshCw, FiX } from 'react-icons/fi'
import { classNames, getPresetRange } from './utils'

const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'wtd', label: 'WTD' },
  { id: 'mtd', label: 'MTD' },
  { id: 'qtd', label: 'QTD' },
  { id: 'ytd', label: 'YTD' },
  { id: 'last7', label: 'Last 7' },
  { id: 'last30', label: 'Last 30' },
  { id: 'last90', label: 'Last 90' },
  { id: 'year', label: 'Year' },
]

const SAVED_KEY = 'branch-hub:saved-views:v1'

function loadSaved() {
  try {
    const raw = localStorage.getItem(SAVED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persistSaved(list) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list || []))
  } catch {
    /* ignore */
  }
}

export default function GlobalFilterBar({
  filters,
  setFilters,
  categories = [],
  employees = [],
  onRefresh,
  compareEnabled,
  setCompareEnabled,
  loading = false,
  embedded = false,
}) {
  const [advOpen, setAdvOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [saved, setSaved] = useState(loadSaved())
  const { from, to, includePending, dateBasis, category, emp } = filters

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  const applyPreset = (id) => {
    const r = getPresetRange(id)
    if (r) setFilters((f) => ({ ...f, from: r.from, to: r.to }))
    setMobileOpen(false)
  }

  const saveCurrent = () => {
    const name = prompt('Save current view as:')
    if (!name) return
    const entry = { id: Date.now(), name, filters: { ...filters } }
    const next = [...saved, entry].slice(-10)
    setSaved(next)
    persistSaved(next)
  }

  const applyView = (v) => {
    if (v?.filters) setFilters((prev) => ({ ...prev, ...v.filters }))
  }

  const removeView = (id) => {
    const next = saved.filter((v) => v.id !== id)
    setSaved(next)
    persistSaved(next)
  }

  const filterInner = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] mr-1">
          <FiCalendar className="w-4 h-4" />
          <span>Range</span>
        </div>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p.id)}
            className="px-2.5 py-1 text-xs rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]"
          >
            {p.label}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            className="md:hidden inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)]"
            onClick={() => setMobileOpen(false)}
            aria-label="Close filters"
          >
            <FiX className="w-3.5 h-3.5" />
            Done
          </button>
          <button
            type="button"
            onClick={() => setCompareEnabled?.(!compareEnabled)}
            className={classNames(
              'px-2.5 py-1 text-xs rounded-lg border transition-colors',
              compareEnabled
                ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]'
                : 'border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]'
            )}
            title="Compare to previous period"
          >
            Compare: {compareEnabled ? 'On' : 'Off'}
          </button>
          <button
            type="button"
            onClick={() => setAdvOpen((v) => !v)}
            className={classNames(
              'inline-flex items-center px-2.5 py-1 text-xs rounded-lg border',
              advOpen
                ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]'
                : 'border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]'
            )}
          >
            <FiSliders className="w-3.5 h-3.5 mr-1" />
            Advanced
          </button>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              aria-label="Refresh branch data"
              className="inline-flex items-center px-2.5 py-1 text-xs rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] disabled:opacity-50"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className="w-full px-2 py-1.5 text-xs rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)]"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className="w-full px-2 py-1.5 text-xs rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)]"
          />
        </div>
        {embedded ? null : (
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">Pending</label>
            <select
              value={includePending ? '1' : '0'}
              onChange={(e) => setFilters((f) => ({ ...f, includePending: e.target.value === '1' }))}
              className="w-full px-2 py-1.5 text-xs rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)]"
            >
              <option value="1">Include</option>
              <option value="0">Completed only</option>
            </select>
          </div>
        )}
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">Date basis</label>
          <select
            value={dateBasis}
            onChange={(e) => setFilters((f) => ({ ...f, dateBasis: e.target.value }))}
            className="w-full px-2 py-1.5 text-xs rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)]"
          >
            <option value="receipt">Receipt date</option>
            <option value="transaction">Transaction date</option>
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
            <FiBookmark className="inline w-3 h-3 mr-1" />
            Saved views
          </label>
          <div className="flex items-center gap-1 flex-wrap">
            {saved.length === 0 && (
              <button
                type="button"
                onClick={saveCurrent}
                className="inline-flex items-center px-2 py-1 text-[11px] rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]"
              >
                <FiPlus className="w-3 h-3 mr-1" /> Save
              </button>
            )}
            {saved.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => applyView(v)}
                onDoubleClick={() => removeView(v.id)}
                title="Click to apply, double-click to remove"
                className="px-2 py-1 text-[11px] rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] truncate max-w-[140px]"
              >
                {v.name}
              </button>
            ))}
            {saved.length > 0 && (
              <button
                type="button"
                onClick={saveCurrent}
                className="inline-flex items-center px-1.5 py-1 text-[11px] rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]"
                title="Save current view"
              >
                <FiPlus className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {advOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--stroke)]/70">
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
              <FiFilter className="inline w-3 h-3 mr-1" />
              Categories
            </label>
            <CategoryMultiSelect
              value={category}
              onChange={(next) => setFilters((f) => ({ ...f, category: next }))}
              options={categories}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
              <FiFilter className="inline w-3 h-3 mr-1" />
              Employees
            </label>
            <EmployeeMultiSelect
              value={emp}
              onChange={(next) => setFilters((f) => ({ ...f, emp: next }))}
              options={employees}
            />
          </div>
        </div>
      )}
    </>
  )

  return (
    <>
      <div className="md:hidden rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] px-3 py-2.5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--text-secondary)]">Filters and range</span>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)]"
        >
          <FiMenu className="w-4 h-4" aria-hidden />
          Open
        </button>
      </div>
      {mobileOpen && (
        <button
          type="button"
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          aria-label="Dismiss filters"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div
        className={classNames(
          'rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] p-3 space-y-3',
          'md:block',
          mobileOpen
            ? 'max-md:fixed max-md:inset-0 max-md:z-50 max-md:overflow-y-auto max-md:rounded-none max-md:p-4'
            : 'max-md:hidden'
        )}
        role="region"
        aria-label="Branch hub filters"
      >
        {filterInner}
      </div>
    </>
  )
}

function CategoryMultiSelect({ value = [], onChange, options = [] }) {
  const toggle = (id) => {
    const set = new Set(value || [])
    if (set.has(id)) set.delete(id)
    else set.add(id)
    onChange(Array.from(set))
  }
  if (!options.length) {
    return <div className="text-xs text-[var(--text-muted)]">No categories available.</div>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((c) => {
        const active = (value || []).includes(c)
        return (
          <button
            key={c}
            type="button"
            onClick={() => toggle(c)}
            className={classNames(
              'px-2 py-1 text-[11px] rounded-lg border transition-colors',
              active
                ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]'
                : 'border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]'
            )}
          >
            {c}
          </button>
        )
      })}
      {(value || []).length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="px-2 py-1 text-[11px] rounded-lg border border-[var(--stroke)] text-[var(--text-muted)] hover:bg-[var(--card-hover)]"
        >
          Clear
        </button>
      )}
    </div>
  )
}

function EmployeeMultiSelect({ value = [], onChange, options = [] }) {
  const toggle = (id) => {
    const set = new Set(value || [])
    if (set.has(id)) set.delete(id)
    else set.add(id)
    onChange(Array.from(set))
  }
  if (!options.length) {
    return <div className="text-xs text-[var(--text-muted)]">No employees available.</div>
  }
  return (
    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
      {options.map((u) => {
        const id = u.emp_code || u.id || u._key
        const active = (value || []).includes(id)
        return (
          <button
            key={id}
            type="button"
            onClick={() => toggle(id)}
            className={classNames(
              'px-2 py-1 text-[11px] rounded-lg border transition-colors truncate max-w-[160px]',
              active
                ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]'
                : 'border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]'
            )}
            title={`${u.name || id} (${u.emp_code || ''})`}
          >
            {u.name || id} · {u.emp_code || ''}
          </button>
        )
      })}
      {(value || []).length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="px-2 py-1 text-[11px] rounded-lg border border-[var(--stroke)] text-[var(--text-muted)] hover:bg-[var(--card-hover)]"
        >
          Clear
        </button>
      )}
    </div>
  )
}
