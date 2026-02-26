import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { FiClipboard, FiRefreshCw, FiCheck, FiCalendar } from 'react-icons/fi'

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
      const res = await api.getPortfolioReview(token, {
        review_filter: reviewFilter,
        page: String(page),
        size: String(pageSize)
      })
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
  }, [token, reviewFilter])

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
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FiClipboard className="w-7 h-7 text-red-600 dark:text-red-400" />
          Portfolio review
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={reviewFilter}
            onChange={(e) => setReviewFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            {REVIEW_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <button
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 py-8">Loading...</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
          No customers match the selected filter.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                  <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white">Name</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white">Last reviewed</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white">Next review due</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c._key || c.investor_id} className="border-b border-gray-100 dark:border-gray-700/80 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{c.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(c.last_reviewed_at)}</td>
                    <td className="px-4 py-3">
                      <span className={c.next_review_due && c.next_review_due < todayISO() ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-600 dark:text-gray-400'}>
                        {formatDate(c.next_review_due)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleMarkReviewedToday(c)}
                          disabled={updatingId === c.investor_id}
                          className="inline-flex items-center gap-1 text-sm px-2 py-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded border border-green-200 dark:border-green-800"
                        >
                          <FiCheck className="w-3.5 h-3.5" />
                          Mark reviewed today
                        </button>
                        <button
                          onClick={() => setNextReviewModal(c)}
                          disabled={updatingId === c.investor_id}
                          className="inline-flex items-center gap-1 text-sm px-2 py-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded border border-gray-300 dark:border-gray-600"
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {total} customer{total !== 1 ? 's' : ''}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-2 py-1 text-sm text-gray-600 dark:text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Set next review</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{customer.name}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Next review due</label>
          <input
            type="date"
            value={nextReviewDue}
            onChange={(e) => setNextReviewDue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
