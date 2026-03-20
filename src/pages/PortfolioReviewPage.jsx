import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { FiClipboard, FiRefreshCw, FiCheck, FiCalendar, FiSearch, FiAlertCircle } from 'react-icons/fi'
import DatePickerInput from '../components/ui/DatePickerInput.jsx'

const REVIEW_FILTERS = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'due_today', label: 'Due today' },
  { value: 'due_this_week', label: 'Due this week' },
  { value: 'all', label: 'All' }
]

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toISOString().slice(0, 10)
  } catch {
    return iso
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function PortfolioReviewPage() {
  const { token } = useAuth()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [reviewFilter, setReviewFilter] = useState('overdue')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [nextReviewModal, setNextReviewModal] = useState(null)

  const pageSize = 20

  const load = async () => {
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
      const res = await api.getPortfolioReview(token, params)
      setItems(res.items || [])
      setTotal(res.total ?? 0)
    } catch (err) {
      setError(err.message || 'Failed to load portfolio review')
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      setPage(1)
      load()
    }
  }, [token, reviewFilter, searchQuery])

  useEffect(() => {
    if (!searchInput.trim()) {
      setSearchQuery('')
      return
    }
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (token && page > 1) load()
  }, [page])

  const handleMarkReviewedToday = async (customer) => {
    const id = customer.investor_id
    if (id == null) return
    setUpdatingId(id)
    try {
      await api.updateCustomer(token, id, {
        last_reviewed_at: todayISO(),
        next_review_due: undefined
      })
      load()
    } catch (err) {
      alert(err.message || 'Failed to update')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleSetNextReview = async (customerId, nextReviewDue) => {
    if (customerId == null) return
    setUpdatingId(customerId)
    try {
      await api.updateCustomer(token, customerId, {
        next_review_due: nextReviewDue || null
      })
      setNextReviewModal(null)
      load()
    } catch (err) {
      alert(err.message || 'Failed to update')
    } finally {
      setUpdatingId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <FiClipboard className="w-6 h-6 sm:w-7 sm:h-7 text-red-600 dark:text-red-400 flex-shrink-0" />
          Portfolio review
        </h1>
      </div>

      {/* Toolbar: search, filter, refresh - single row, same card as table */}
      <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
          <div className="flex-1 min-w-0">
            <label htmlFor="portfolio-search" className="sr-only">Search clients</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              <input
                id="portfolio-search"
                type="text"
                placeholder="Search by name, mobile, or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
              />
            </div>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap gap-3 sm:gap-4 sm:items-center">
            <div className="flex items-center gap-2">
              <label htmlFor="review-filter" className="text-sm font-medium text-[var(--text-secondary)] whitespace-nowrap">Filter:</label>
              <select
                id="review-filter"
                value={reviewFilter}
                onChange={(e) => setReviewFilter(e.target.value)}
                className="px-3 py-2.5 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-primary)] text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
              >
                {REVIEW_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => load()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)] font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] p-12 text-center text-[var(--text-muted)]">
          Loading...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] p-12 text-center text-[var(--text-muted)]">
          {searchQuery ? 'No clients match your search or filter.' : 'No customers match the selected filter.'}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--stroke)] bg-[var(--card-hover)]">
                  <th className="px-4 py-3 font-semibold text-[var(--text-primary)] text-sm">Name</th>
                  <th className="px-4 py-3 font-semibold text-[var(--text-primary)] text-sm">Last reviewed</th>
                  <th className="px-4 py-3 font-semibold text-[var(--text-primary)] text-sm">Reviewed by</th>
                  <th className="px-4 py-3 font-semibold text-[var(--text-primary)] text-sm">Next review due</th>
                  <th className="px-4 py-3 font-semibold text-[var(--text-primary)] text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c._key || c.investor_id} className="border-b border-[var(--stroke)]/60 hover:bg-[var(--card-bg-opaque)]">
                    <td className="px-4 py-3 text-[var(--text-primary)] font-medium text-sm">{c.name || '—'}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-sm">{formatDate(c.last_reviewed_at)}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-sm">{c.last_reviewed_by_emp_code || c.last_reviewed_by_id || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${c.next_review_due && c.next_review_due < todayISO() ? 'text-[var(--error)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                        {formatDate(c.next_review_due)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleMarkReviewedToday(c)}
                          disabled={updatingId === c.investor_id}
                          className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1.5 text-[var(--success)] hover:bg-[var(--success-muted)] rounded-lg border border-[var(--success)]/40 disabled:opacity-50"
                        >
                          <FiCheck className="w-3.5 h-3.5" />
                          Mark reviewed today
                        </button>
                        <button
                          onClick={() => setNextReviewModal(c)}
                          disabled={updatingId === c.investor_id}
                          className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1.5 text-[var(--text-secondary)] hover:bg-[var(--card-bg-opaque)] rounded-lg border border-[var(--stroke)] disabled:opacity-50"
                        >
                          <FiCalendar className="w-3.5 h-3.5" />
                          Set next review
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[var(--stroke)] bg-[var(--card-bg-opaque)]">
              <span className="text-sm text-[var(--text-muted)]">
                {total} customer{total !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-[var(--stroke)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--card-bg-opaque)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-2 py-1 text-sm text-[var(--text-secondary)]">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-[var(--stroke)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--card-bg-opaque)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {nextReviewModal && (
        <SetNextReviewModal
          customer={nextReviewModal}
          onSave={(nextReviewDue) => handleSetNextReview(nextReviewModal.investor_id, nextReviewDue)}
          onClose={() => setNextReviewModal(null)}
          saving={updatingId === nextReviewModal.investor_id}
        />
      )}
    </div>
  )
}

function SetNextReviewModal({ customer, onSave, onClose, saving }) {
  const [nextReviewDue, setNextReviewDue] = useState(() => formatDate(customer.next_review_due) || todayISO())

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(nextReviewDue || null)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--card-bg)] border border-[var(--stroke)] rounded-xl shadow-xl max-w-sm w-full p-6">
        <h3 className="font-semibold text-[var(--text-primary)] mb-2">Set next review</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">{customer.name}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">Next review due</label>
          <DatePickerInput
            value={nextReviewDue}
            onChange={(v) => setNextReviewDue(v)}
            inputClassName="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
            ariaLabel="Next review due"
          />
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 border border-[var(--stroke)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
