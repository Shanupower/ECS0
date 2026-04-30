import React, { useEffect, useState } from 'react'
import { FiX, FiClock } from 'react-icons/fi'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useEscapeClose } from '../../hooks/useEscapeClose'

function fmtDate(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString() } catch { return String(iso) }
}

export default function ReviewHistoryDrawer({ open, customer, onClose }) {
  const { token } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  useEscapeClose(open, onClose)

  useEffect(() => {
    if (!open || !customer?.investor_id || !token) return
    setLoading(true)
    api.getCustomerReviewHistory(token, customer.investor_id)
      .then((res) => setItems(Array.isArray(res?.items) ? res.items : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [open, customer?.investor_id, token])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <aside className="relative ml-auto w-full max-w-md bg-[var(--card-bg)] border-l border-[var(--stroke)] shadow-xl flex flex-col">
        <header className="flex items-center justify-between px-5 py-3 border-b border-[var(--stroke)]">
          <div className="min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] truncate flex items-center gap-2">
              <FiClock className="w-4 h-4" /> Review history
            </h3>
            <p className="text-xs text-[var(--text-muted)] truncate">{customer?.name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--card-hover)]">
            <FiX className="w-5 h-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-[var(--text-muted)]">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No review events recorded yet.</p>
          ) : (
            <ol className="space-y-3">
              {items.map((ev) => (
                <li key={ev._key || ev.reviewed_at} className="rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[var(--text-primary)] font-medium">{fmtDate(ev.reviewed_at)}</span>
                    {ev.next_review_due && (
                      <span className="text-xs text-[var(--text-muted)]">Next: {ev.next_review_due}</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    by {ev.reviewer_name || ev.reviewer_emp_code || ev.reviewer_id || '—'}
                    {ev.branch_code ? ` · ${ev.branch_code}` : ''}
                  </p>
                  {ev.note && (
                    <p className="text-sm text-[var(--text-primary)] mt-1 whitespace-pre-wrap">{ev.note}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  )
}
