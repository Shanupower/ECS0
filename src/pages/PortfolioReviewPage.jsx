import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAppConfig } from '../context/AppConfigContext'
import { api } from '../api'
import {
  FiClipboard, FiRefreshCw, FiCheck, FiCalendar, FiSearch, FiAlertCircle,
  FiArrowDown, FiArrowUp, FiClock, FiExternalLink, FiMapPin
} from 'react-icons/fi'
import ReviewFilterChips from './portfolio/ReviewFilterChips'
import ReviewBulkBar from './portfolio/ReviewBulkBar'
import SetNextReviewModal from './portfolio/SetNextReviewModal'
import ReviewHistoryDrawer from './portfolio/ReviewHistoryDrawer'
import SearchableSelect from '../components/SearchableSelect'

function todayIso() { return new Date().toISOString().slice(0, 10) }

function daysBetween(aIso, bIso) {
  if (!aIso || !bIso) return null
  const a = new Date(aIso).getTime()
  const b = new Date(bIso).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return Math.round((b - a) / 86_400_000)
}

function daysOverdue(iso) {
  if (!iso) return null
  const diff = daysBetween(iso, todayIso())
  return diff > 0 ? diff : 0
}

function ownerLabel(customer) {
  return customer.last_reviewed_by_name || customer.last_reviewed_by_emp_code || customer.last_reviewed_by_id || '—'
}

function rawBranchRef(customer) {
  if (Array.isArray(customer.branches) && customer.branches.length) return customer.branches[0]
  if (Array.isArray(customer.relationship_manager) && customer.relationship_manager.length) return customer.relationship_manager[0]
  return customer.relationship_manager || ''
}

function makeBranchLabel(branchNameLookup) {
  return (customer) => {
    const ref = rawBranchRef(customer)
    if (!ref) return '—'
    const key = String(ref).trim().toLowerCase()
    return branchNameLookup.get(key) || ref || '—'
  }
}

function makeRmLabel(userByKey) {
  const resolve = (raw) => {
    if (raw == null || raw === '') return null
    const k = String(raw).trim().toLowerCase()
    const u = userByKey?.get(k)
    return u?.name || u?.email || null
  }
  return (customer) => {
    if (customer.relationship_manager_display) return customer.relationship_manager_display
    if (customer.last_reviewed_by_name) return customer.last_reviewed_by_name
    const fromEmp = resolve(customer.last_reviewed_by_emp_code)
    if (fromEmp) return fromEmp
    const fromRm = resolve(rawBranchRef(customer))
    if (fromRm) return fromRm
    if (customer.last_reviewed_by_emp_code) return customer.last_reviewed_by_emp_code
    return '—'
  }
}

const PAGE_SIZE_OPTIONS = [20, 50, 100]

export default function PortfolioReviewPage() {
  const { token, user } = useAuth()
  const cfg = useAppConfig()

  const [items, setItems] = useState([])
  const [counts, setCounts] = useState({ overdue: 0, due_today: 0, due_this_week: 0, due_this_month: 0, all: 0 })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [reviewFilter, setReviewFilter] = useState('overdue')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [branchOptions, setBranchOptions] = useState([])
  const [branchRows, setBranchRows] = useState([])
  const [assignableUsers, setAssignableUsers] = useState([])

  const branchNameLookup = useMemo(() => {
    const map = new Map()
    for (const b of branchRows) {
      const name = b.branch_name || b.name || b.branch_code || b.code
      if (!name) continue
      const candidates = [b.branch_code, b.code, b._key, b.key, b.branch, b.branch_name, b.name]
      for (const c of candidates) {
        if (c == null || c === '') continue
        map.set(String(c).trim().toLowerCase(), name)
      }
    }
    return map
  }, [branchRows])

  const branchLabel = useMemo(() => makeBranchLabel(branchNameLookup), [branchNameLookup])
  const rmUserLookup = useMemo(() => {
    const m = new Map()
    for (const u of assignableUsers || []) {
      for (const k of [u.id, u._key, u.emp_code, u.email]) {
        if (k == null || String(k).trim() === '') continue
        m.set(String(k).trim().toLowerCase(), u)
      }
    }
    return m
  }, [assignableUsers])
  const rmLabel = useMemo(() => makeRmLabel(rmUserLookup), [rmUserLookup])

  const [sortKey, setSortKey] = useState('next_review_due')
  const [sortDir, setSortDir] = useState('asc')

  const [selectedIds, setSelectedIds] = useState(new Set())
  const lastAnchorRef = useRef(null)

  const [nextReviewModal, setNextReviewModal] = useState(null) // { customers, defaultMonths? }
  const [historyTarget, setHistoryTarget] = useState(null)
  const [saving, setSaving] = useState(false)

  const isAdmin = user?.role === 'admin'
  const isManager = user?.role === 'manager'
  const canReassign = isAdmin

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const params = {
        review_filter: reviewFilter,
        page: String(page),
        size: String(pageSize)
      }
      if (searchQuery.trim()) params.search = searchQuery.trim()
      if (branchFilter && isAdmin) params.branch_code = branchFilter
      const res = await api.getPortfolioReview(token, params)
      setItems(Array.isArray(res?.items) ? res.items : [])
      setTotal(res?.total ?? 0)
      if (res?.counts) setCounts({ ...counts, ...res.counts })
    } catch (err) {
      setError(err.message || 'Failed to load portfolio review')
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [token, reviewFilter, searchQuery, page, pageSize, branchFilter, isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setPage(1) }, [reviewFilter, searchQuery, branchFilter, pageSize])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (!token) return
    api.listAssignableUsers(token).then((list) => setAssignableUsers(Array.isArray(list) ? list : [])).catch(() => {})
    // Branch directory is needed for the Branch / RM column lookups regardless of role.
    api.listBranches(token).then((rows) => {
      const list = Array.isArray(rows) ? rows : []
      setBranchRows(list)
      setBranchOptions(
        list
          .filter((b) => b.is_active !== false)
          .map((b) => ({
            value: b.branch_code || b._key || b.branch_name,
            label: b.branch_name || b.branch_code,
          }))
      )
    }).catch(() => {
      setBranchRows([])
      setBranchOptions([])
    })
  }, [token])

  const sortedItems = useMemo(() => {
    const list = [...items]
    const dir = sortDir === 'asc' ? 1 : -1
    const getVal = (item, key) => {
      switch (key) {
        case 'name': return (item.name || '').toLowerCase()
        case 'branch': {
          const v = branchLabel(item)
          return (v === '—' ? '' : v).toLowerCase()
        }
        case 'rm': {
          const v = rmLabel(item)
          return (v === '—' ? '' : v).toLowerCase()
        }
        case 'review_tier': return item.review_tier || ''
        case 'last_reviewed_at': return item.last_reviewed_at || ''
        case 'reviewer': return (item.last_reviewed_by_name || item.last_reviewed_by_emp_code || '').toLowerCase()
        case 'next_review_due': return item.next_review_due || ''
        case 'days_overdue': {
          if (!item.next_review_due) return -1
          return item.next_review_due < todayIso() ? Math.round((Date.now() - new Date(item.next_review_due).getTime()) / 86_400_000) : -1
        }
        default: return null
      }
    }
    list.sort((a, b) => {
      const av = getVal(a, sortKey)
      const bv = getVal(b, sortKey)
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
    return list
  }, [items, sortKey, sortDir, branchLabel, rmLabel])

  const selectedList = useMemo(() => sortedItems.filter((i) => selectedIds.has(i.investor_id)), [sortedItems, selectedIds])
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const showBranchColumn = isAdmin && !branchFilter

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const toggleSelect = (customer, mode) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (mode === 'shift' && lastAnchorRef.current != null) {
        const flat = sortedItems.map((i) => i.investor_id)
        const fromIdx = flat.indexOf(lastAnchorRef.current)
        const toIdx = flat.indexOf(customer.investor_id)
        if (fromIdx >= 0 && toIdx >= 0) {
          const [a, b] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx]
          for (let i = a; i <= b; i++) next.add(flat[i])
        } else next.add(customer.investor_id)
      } else {
        if (next.has(customer.investor_id)) next.delete(customer.investor_id)
        else next.add(customer.investor_id)
        lastAnchorRef.current = customer.investor_id
      }
      return next
    })
  }

  const selectPage = (checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const row of sortedItems) {
        if (checked) next.add(row.investor_id)
        else next.delete(row.investor_id)
      }
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const reload = () => load()

  const bulkMarkReviewed = async ({ note } = {}) => {
    if (selectedList.length === 0) return
    setSaving(true)
    try {
      await api.bulkUpdatePortfolioReview(token, {
        investor_ids: selectedList.map((r) => r.investor_id),
        action: 'mark_reviewed',
        note
      })
      clearSelection()
      await load()
    } catch (err) { alert(err.message || 'Failed to mark reviewed') } finally { setSaving(false) }
  }

  const bulkPush = async (months) => {
    if (selectedList.length === 0) return
    setSaving(true)
    try {
      await api.bulkUpdatePortfolioReview(token, {
        investor_ids: selectedList.map((r) => r.investor_id),
        action: 'push_next_review',
        months
      })
      clearSelection()
      await load()
    } catch (err) { alert(err.message || 'Failed to push review') } finally { setSaving(false) }
  }

  const bulkReassign = async (toUserId) => {
    if (!toUserId || selectedList.length === 0) return
    setSaving(true)
    try {
      await api.bulkUpdatePortfolioReview(token, {
        investor_ids: selectedList.map((r) => r.investor_id),
        action: 'reassign',
        to_user_id: toUserId
      })
      clearSelection()
      await load()
    } catch (err) { alert(err.message || 'Failed to reassign') } finally { setSaving(false) }
  }

  const markReviewedSingle = async (customer) => {
    setSaving(true)
    try {
      await api.bulkUpdatePortfolioReview(token, {
        investor_ids: [customer.investor_id],
        action: 'mark_reviewed'
      })
      // Auto-open the Set-next-review modal with the just-computed default.
      setNextReviewModal({ customers: [customer], auto: true })
      await load()
    } catch (err) { alert(err.message || 'Failed to mark reviewed') } finally { setSaving(false) }
  }

  const saveNextReview = async ({ nextReviewDue, note }) => {
    if (!nextReviewModal) return
    const { customers } = nextReviewModal
    setSaving(true)
    try {
      await Promise.all(customers.map((c) => api.updateCustomer(token, c.investor_id, {
        next_review_due: nextReviewDue || null,
        ...(note ? { review_note: note } : {})
      })))
      setNextReviewModal(null)
      clearSelection()
      await load()
    } catch (err) { alert(err.message || 'Failed to update') } finally { setSaving(false) }
  }

  const onRowNavigate = (customer) => {
    if (!customer.investor_id) return
    window.location.href = `/customers/${customer.investor_id}`
  }

  const sortIndicator = (key) =>
    sortKey === key ? (sortDir === 'asc' ? <FiArrowUp className="w-3 h-3" /> : <FiArrowDown className="w-3 h-3" />) : null

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-600/10 text-red-600 dark:text-red-400">
              <FiClipboard className="w-5 h-5" />
            </span>
            Portfolio review
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1 ml-[2.9rem]">
            {total} customer{total !== 1 ? 's' : ''} in the current view · select rows for bulk actions
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] shadow-sm">
        <div className="flex items-center gap-2 p-2">
          <div className="relative flex-1 min-w-0">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search customers…  (name, PAN, mobile, email)"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-[var(--card-bg-opaque)] border border-[var(--stroke)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
            />
          </div>
          {isAdmin && (
            <div className="w-56">
              <SearchableSelect
                options={[{ value: '', label: 'All branches' }, ...branchOptions]}
                value={branchFilter}
                onChange={(v) => setBranchFilter(v || '')}
                placeholder="All branches"
                emptyText="No branches"
              />
            </div>
          )}
          <button
            onClick={reload}
            disabled={loading}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[var(--stroke)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] disabled:opacity-50"
            title="Refresh"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="border-t border-[var(--stroke)] px-2 py-2 overflow-x-auto">
          <ReviewFilterChips value={reviewFilter} onChange={setReviewFilter} counts={counts} />
        </div>
      </div>

      {error && (
        <div className="rounded-lg p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--stroke)] bg-[var(--card-hover)]">
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all rows on this page"
                    checked={sortedItems.length > 0 && sortedItems.every((i) => selectedIds.has(i.investor_id))}
                    onChange={(e) => selectPage(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--stroke)] text-[var(--accent)]"
                  />
                </th>
                <SortableHeader label="Customer" onClick={() => toggleSort('name')} indicator={sortIndicator('name')} />
                {showBranchColumn && <SortableHeader label="Branch" onClick={() => toggleSort('branch')} indicator={sortIndicator('branch')} />}
                <SortableHeader label="RM" onClick={() => toggleSort('rm')} indicator={sortIndicator('rm')} />
                <SortableHeader label="Tier" onClick={() => toggleSort('review_tier')} indicator={sortIndicator('review_tier')} />
                <SortableHeader label="Last reviewed" onClick={() => toggleSort('last_reviewed_at')} indicator={sortIndicator('last_reviewed_at')} />
                <SortableHeader label="Reviewer" onClick={() => toggleSort('reviewer')} indicator={sortIndicator('reviewer')} />
                <SortableHeader label="Next due" onClick={() => toggleSort('next_review_due')} indicator={sortIndicator('next_review_due')} />
                <SortableHeader label="Days over" onClick={() => toggleSort('days_overdue')} indicator={sortIndicator('days_overdue')} />
                <th className="px-3 py-3 font-semibold text-[var(--text-primary)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && sortedItems.length === 0 ? (
                <tr><td colSpan={10} className="px-3 py-16 text-center text-[var(--text-muted)]">Loading…</td></tr>
              ) : sortedItems.length === 0 ? (
                <tr><td colSpan={10} className="px-3 py-16 text-center text-[var(--text-muted)]">
                  {searchQuery || branchFilter ? 'No customers match your filters.' : 'No customers in this bucket.'}
                </td></tr>
              ) : sortedItems.map((c) => {
                const isSelected = selectedIds.has(c.investor_id)
                const overdue = daysOverdue(c.next_review_due)
                const overdueTone = overdue > 30 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                  : overdue > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                  : null
                return (
                  <tr
                    key={c._key || c.investor_id}
                    className={`border-b border-[var(--stroke)]/60 hover:bg-[var(--card-bg-opaque)] ${isSelected ? 'bg-[var(--accent)]/5' : ''}`}
                  >
                    <td className="px-3 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onClick={(e) => {
                          if (e.shiftKey) {
                            e.preventDefault()
                            toggleSelect(c, 'shift')
                          }
                        }}
                        onChange={() => toggleSelect(c, 'toggle')}
                        className="w-4 h-4 rounded border-[var(--stroke)] text-[var(--accent)]"
                        aria-label={`Select ${c.name}`}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => onRowNavigate(c)}
                        className="inline-flex items-center gap-1 font-medium text-[var(--text-primary)] hover:text-[var(--accent)] text-left"
                        title="Open customer"
                      >
                        <span className="truncate">{c.name || '—'}</span>
                        <FiExternalLink className="w-3 h-3 opacity-60" />
                      </button>
                      <div className="text-[11px] text-[var(--text-muted)]">{c.mobile || c.email || `#${c.investor_id}`}</div>
                    </td>
                    {showBranchColumn && (
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                          <FiMapPin className="w-3 h-3" /> {branchLabel(c)}
                        </span>
                      </td>
                    )}
                    <td className="px-3 py-3 text-[var(--text-secondary)]">{rmLabel(c)}</td>
                    <td className="px-3 py-3">
                      {c.review_tier ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--card-hover)] text-[var(--text-primary)]">
                          {c.review_tier}{c.review_cadence_months ? ` · ${c.review_cadence_months}m` : ''}
                        </span>
                      ) : <span className="text-[var(--text-muted)]">—</span>}
                    </td>
                    <td className="px-3 py-3 text-[var(--text-secondary)]">{c.last_reviewed_at || '—'}</td>
                    <td className="px-3 py-3 text-[var(--text-secondary)]">{ownerLabel(c)}</td>
                    <td className="px-3 py-3">
                      <span className={c.next_review_due && c.next_review_due < todayIso() ? 'text-red-600 dark:text-red-400 font-medium' : 'text-[var(--text-secondary)]'}>
                        {c.next_review_due || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {overdue != null && overdue > 0 ? (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${overdueTone}`}>
                          <FiClock className="w-3 h-3" /> {overdue}d
                        </span>
                      ) : <span className="text-[var(--text-muted)]">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => markReviewedSingle(c)}
                          disabled={saving}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50"
                          title="Mark reviewed today"
                        >
                          <FiCheck className="w-3 h-3" />
                          Mark reviewed
                        </button>
                        <button
                          onClick={() => setNextReviewModal({ customers: [c] })}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-[var(--stroke)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]"
                          title="Set next review"
                        >
                          <FiCalendar className="w-3 h-3" />
                          Set next
                        </button>
                        <button
                          onClick={() => setHistoryTarget(c)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          title="Review history"
                        >
                          <FiClock className="w-3 h-3" />
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[var(--stroke)] bg-[var(--card-bg-opaque)]">
          <span className="text-sm text-[var(--text-muted)]">
            {total} customer{total !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              Rows:
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="ml-1 px-2 py-1 border border-[var(--stroke)] rounded bg-[var(--card-bg)] text-[var(--text-primary)] text-xs"
              >
                {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-[var(--stroke)] text-sm text-[var(--text-secondary)] hover:bg-[var(--card-bg)] disabled:opacity-50">Previous</button>
                <span className="px-2 py-1 text-sm text-[var(--text-secondary)]">Page {page} of {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg border border-[var(--stroke)] text-sm text-[var(--text-secondary)] hover:bg-[var(--card-bg)] disabled:opacity-50">Next</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedList.length > 0 && (
        <ReviewBulkBar
          count={selectedList.length}
          branches={branchOptions}
          assignableUsers={assignableUsers}
          canReassign={canReassign}
          onMarkReviewed={() => bulkMarkReviewed()}
          onPush={(months) => bulkPush(months)}
          onReassign={(id) => bulkReassign(id)}
          onClear={clearSelection}
        />
      )}

      {nextReviewModal && (
        <SetNextReviewModal
          customer={nextReviewModal.customers[0]}
          customers={nextReviewModal.customers}
          tierCadenceMonths={cfg.review_tier_cadence_months}
          saving={saving}
          onSave={saveNextReview}
          onClose={() => setNextReviewModal(null)}
        />
      )}

      {historyTarget && (
        <ReviewHistoryDrawer
          open={!!historyTarget}
          customer={historyTarget}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  )
}

function SortableHeader({ label, onClick, indicator }) {
  return (
    <th className="px-3 py-3 font-semibold text-[var(--text-primary)] cursor-pointer select-none hover:bg-[var(--card-bg-opaque)]" onClick={onClick}>
      <span className="inline-flex items-center gap-1">{label}{indicator}</span>
    </th>
  )
}

