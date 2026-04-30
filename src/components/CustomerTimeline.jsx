import React, { useEffect, useState } from 'react'
import { FiCheckSquare, FiDollarSign, FiEye, FiFileText } from 'react-icons/fi'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

function dateLabel(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

function kindMeta(kind) {
  switch (kind) {
    case 'task': return { icon: FiCheckSquare, color: 'text-blue-500', label: 'Task' }
    case 'receipt': return { icon: FiDollarSign, color: 'text-emerald-500', label: 'Receipt' }
    case 'review': return { icon: FiEye, color: 'text-amber-500', label: 'Portfolio review' }
    default: return { icon: FiFileText, color: 'text-[var(--text-muted)]', label: String(kind || '') }
  }
}

function itemSummary(it) {
  if (it.kind === 'task') return `${it.title || 'Task'} · ${it.status || ''}${it.assignee_emp_code ? ` · ${it.assignee_emp_code}` : ''}`
  if (it.kind === 'receipt') return `Receipt ${it.receipt_number || it._key}${it.amount ? ` · ₹${Number(it.amount).toLocaleString()}` : ''}${it.category ? ` · ${it.category}` : ''}`
  if (it.kind === 'review') return `Marked reviewed${it.next_review_due ? ` · next ${it.next_review_due}` : ''}${it.reviewer_name ? ` · by ${it.reviewer_name}` : ''}`
  return JSON.stringify(it).slice(0, 200)
}

export default function CustomerTimeline({ investorId, limit = 60 }) {
  const { token } = useAuth()
  const [items, setItems] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token || !investorId) return
    let alive = true
    setLoading(true)
    api.getCustomerTimeline(token, investorId, { limit: String(limit) })
      .then((res) => {
        if (!alive) return
        setItems(res?.items || [])
        setCounts(res?.counts || {})
      })
      .catch((err) => console.warn('timeline load failed:', err?.message))
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [token, investorId, limit])

  if (!investorId) return null

  return (
    <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)]">
      <div className="px-3 py-2 border-b border-[var(--stroke)] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Customer timeline</h3>
        <span className="text-[11px] text-[var(--text-muted)]">
          {counts.tasks || 0} tasks · {counts.receipts || 0} receipts · {counts.reviews || 0} reviews
        </span>
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        {loading && items.length === 0 && (
          <div className="px-3 py-4 text-xs text-[var(--text-muted)]">Loading…</div>
        )}
        {!loading && items.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-[var(--text-muted)]">No activity yet.</div>
        )}
        <ol className="divide-y divide-[var(--stroke)]/60">
          {items.map((it, idx) => {
            const meta = kindMeta(it.kind)
            const Icon = meta.icon
            return (
              <li key={`${it.kind}-${it._key || idx}`} className="px-3 py-2 flex items-start gap-2">
                <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${meta.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-[var(--text-primary)] truncate">{itemSummary(it)}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">{meta.label} · {dateLabel(it.at)}</div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
