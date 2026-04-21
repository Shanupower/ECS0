import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  FiSearch, FiRefreshCw, FiPlus, FiClock, FiEye, FiEyeOff, FiArchive,
  FiSave, FiChevronDown, FiSliders, FiCheck, FiX, FiBookmark, FiTrash2
} from 'react-icons/fi'

const VIEWS_STORAGE_KEY = (sub) => `ecs_leads_saved_views_${sub || 'anon'}`

function loadSavedViews(sub) {
  try {
    const raw = localStorage.getItem(VIEWS_STORAGE_KEY(sub))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function storeSavedViews(sub, views) {
  try { localStorage.setItem(VIEWS_STORAGE_KEY(sub), JSON.stringify(views)) } catch { /* ignore */ }
}

function useClickAway(ref, onAway) {
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onAway() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [ref, onAway])
}

export default function LeadsToolbar({
  filters,
  onChange,
  onCreate,
  onRefresh,
  loading,
  sources = [],
  owners = [],
  branches = [],
  showOwnerFilter,
  showBranchPicker,
  userSub
}) {
  const [search, setSearch] = useState(filters.search || '')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [viewsOpen, setViewsOpen] = useState(false)
  const [views, setViews] = useState(() => loadSavedViews(userSub))
  const [newViewName, setNewViewName] = useState('')

  const filtersRef = useRef(null)
  const viewsRef = useRef(null)
  useClickAway(filtersRef, () => setFiltersOpen(false))
  useClickAway(viewsRef, () => setViewsOpen(false))

  useEffect(() => {
    const t = setTimeout(() => {
      if ((filters.search || '') !== search) onChange({ ...filters, search })
    }, 250)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if ((filters.search || '') !== search) setSearch(filters.search || '')
  }, [filters.search]) // eslint-disable-line react-hooks/exhaustive-deps

  const setKey = (key, value) => onChange({ ...filters, [key]: value })

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (filters.owner) n++
    if (filters.source) n++
    if (filters.branch) n++
    return n
  }, [filters])

  const clearFilters = () => {
    onChange({ ...filters, owner: '', source: '', branch: '' })
  }

  const saveCurrentView = () => {
    const name = (newViewName || '').trim()
    if (!name) return
    const next = [...views.filter((v) => v.name !== name), { name, filters }]
    setViews(next); storeSavedViews(userSub, next); setNewViewName('')
  }
  const deleteView = (name) => {
    const next = views.filter((v) => v.name !== name)
    setViews(next); storeSavedViews(userSub, next)
  }
  const applyView = (view) => {
    onChange(view.filters)
    setSearch(view.filters.search || '')
    setViewsOpen(false)
  }

  const branchLabel = filters.branch
    ? (branches.find((b) => b.value === filters.branch)?.label || filters.branch)
    : null
  const ownerLabel = filters.owner
    ? ((owners.find((u) => (u.id || u._key) === filters.owner)?.name) || filters.owner)
    : null

  return (
    <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] shadow-sm">
      <div className="flex items-center gap-2 p-2">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads…  (name, phone, email)"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[var(--card-bg-opaque)] border border-[var(--stroke)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
          />
        </div>

        {/* Filters popover */}
        <div className="relative" ref={filtersRef}>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={`h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border text-sm transition-colors ${
              activeFilterCount > 0
                ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5'
                : 'border-[var(--stroke)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]'
            }`}
          >
            <FiSliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-[var(--accent)] text-white text-[10px] font-semibold">
                {activeFilterCount}
              </span>
            )}
          </button>
          {filtersOpen && (
            <div className="absolute right-0 mt-2 w-80 z-30 rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] shadow-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Filters</span>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)]">Clear all</button>
                )}
              </div>

              {showBranchPicker && (
                <SelectField
                  label="Branch"
                  value={filters.branch || ''}
                  onChange={(v) => setKey('branch', v)}
                  options={[{ value: '', label: 'All branches' }, ...branches]}
                />
              )}

              {showOwnerFilter && (
                <SelectField
                  label="Owner"
                  value={filters.owner || ''}
                  onChange={(v) => setKey('owner', v)}
                  options={[
                    { value: '', label: 'All owners' },
                    ...owners.map((u) => ({ value: u.id || u._key, label: `${u.name || u.emp_code}${u.emp_code ? ` · ${u.emp_code}` : ''}` }))
                  ]}
                />
              )}

              <SelectField
                label="Source"
                value={filters.source || ''}
                onChange={(v) => setKey('source', v)}
                options={[{ value: '', label: 'All sources' }, ...sources.map((s) => ({ value: s, label: s }))]}
              />
            </div>
          )}
        </div>

        {/* Quick toggles — segmented */}
        <div className="hidden md:inline-flex items-center rounded-lg border border-[var(--stroke)] overflow-hidden">
          <SegBtn
            active={!!filters.staleOnly}
            onClick={() => setKey('staleOnly', !filters.staleOnly)}
            icon={<FiClock className="w-3.5 h-3.5" />}
            label="Stale"
            activeTone="amber"
          />
          <SegDivider />
          <SegBtn
            active={!!filters.showClosed}
            onClick={() => setKey('showClosed', !filters.showClosed)}
            icon={filters.showClosed ? <FiEye className="w-3.5 h-3.5" /> : <FiEyeOff className="w-3.5 h-3.5" />}
            label="Closed"
          />
          <SegDivider />
          <SegBtn
            active={!!filters.showArchived}
            onClick={() => setKey('showArchived', !filters.showArchived)}
            icon={<FiArchive className="w-3.5 h-3.5" />}
            label="Archived"
          />
        </div>

        {/* Views */}
        <div className="relative" ref={viewsRef}>
          <button
            onClick={() => setViewsOpen((v) => !v)}
            className="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border border-[var(--stroke)] text-sm text-[var(--text-secondary)] hover:bg-[var(--card-hover)]"
          >
            <FiBookmark className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Views</span>
            {views.length > 0 && <span className="text-[10px] text-[var(--text-muted)]">{views.length}</span>}
            <FiChevronDown className="w-3.5 h-3.5" />
          </button>
          {viewsOpen && (
            <div className="absolute right-0 mt-2 w-72 z-30 rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] shadow-xl p-2 space-y-1">
              <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Saved views</div>
              {views.length === 0 ? (
                <p className="px-2 py-2 text-xs text-[var(--text-muted)]">No saved views. Apply filters and save one below.</p>
              ) : (
                views.map((v) => (
                  <div key={v.name} className="flex items-center group rounded-lg hover:bg-[var(--card-hover)] px-2 py-1">
                    <button onClick={() => applyView(v)} className="flex-1 text-left text-sm text-[var(--text-primary)] truncate">
                      {v.name}
                    </button>
                    <button onClick={() => deleteView(v.name)} className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-red-600" title="Delete view">
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
              <div className="border-t border-[var(--stroke)] pt-2 mt-1 flex items-center gap-1 px-1">
                <input
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  placeholder="Save current as…"
                  className="flex-1 px-2 py-1.5 rounded-md text-xs bg-[var(--card-bg-opaque)] border border-[var(--stroke)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
                />
                <button
                  onClick={saveCurrentView}
                  disabled={!newViewName.trim()}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-[var(--accent)] text-white disabled:opacity-40"
                  title="Save view"
                >
                  <FiSave className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[var(--stroke)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] disabled:opacity-50"
          title="Refresh"
        >
          <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <div className="h-6 w-px bg-[var(--stroke)] mx-0.5 hidden sm:block" />

        <button
          onClick={onCreate}
          className="h-9 inline-flex items-center gap-1.5 px-3 sm:px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 shadow-sm"
        >
          <FiPlus className="w-4 h-4" />
          <span className="hidden sm:inline">New lead</span>
        </button>
      </div>

      {/* Active filter pills row — only shows when filters are set */}
      {(activeFilterCount > 0 || filters.staleOnly || filters.showArchived || !filters.showClosed) && (
        <div className="flex flex-wrap items-center gap-1.5 px-2 pb-2">
          {branchLabel && (
            <ActivePill onClear={() => setKey('branch', '')} label={`Branch: ${branchLabel}`} />
          )}
          {ownerLabel && (
            <ActivePill onClear={() => setKey('owner', '')} label={`Owner: ${ownerLabel}`} />
          )}
          {filters.source && (
            <ActivePill onClear={() => setKey('source', '')} label={`Source: ${filters.source}`} />
          )}
          {filters.staleOnly && (
            <ActivePill onClear={() => setKey('staleOnly', false)} label="Stale only" tone="amber" />
          )}
          {!filters.showClosed && (
            <ActivePill onClear={() => setKey('showClosed', true)} label="Hiding closed" tone="neutral" />
          )}
          {filters.showArchived && (
            <ActivePill onClear={() => setKey('showArchived', false)} label="Including archived" tone="neutral" />
          )}
        </div>
      )}
    </div>
  )
}

function SegBtn({ active, onClick, icon, label, activeTone = 'accent' }) {
  const tone =
    activeTone === 'amber' ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
    : 'bg-[var(--accent)]/10 text-[var(--accent)]'
  return (
    <button
      onClick={onClick}
      className={`h-9 inline-flex items-center gap-1.5 px-2.5 text-xs font-medium transition-colors ${
        active ? tone : 'text-[var(--text-secondary)] hover:bg-[var(--card-hover)]'
      }`}
    >
      {icon}
      <span>{label}</span>
      {active && <FiCheck className="w-3 h-3" />}
    </button>
  )
}

function SegDivider() {
  return <div className="h-5 w-px bg-[var(--stroke)]" />
}

function ActivePill({ label, onClear, tone = 'accent' }) {
  const toneCls =
    tone === 'amber' ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800'
    : tone === 'neutral' ? 'bg-[var(--card-hover)] text-[var(--text-secondary)] border-[var(--stroke)]'
    : 'bg-[var(--accent)]/5 text-[var(--accent)] border-[var(--accent)]/40'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneCls}`}>
      {label}
      <button onClick={onClear} className="opacity-70 hover:opacity-100" aria-label="Remove filter">
        <FiX className="w-3 h-3" />
      </button>
    </span>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)] mb-1">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none w-full h-9 pl-3 pr-8 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
      </div>
    </label>
  )
}
