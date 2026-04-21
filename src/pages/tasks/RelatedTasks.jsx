import React, { useEffect, useRef, useState } from 'react'
import { FiCheckSquare, FiPlus, FiRefreshCw, FiExternalLink } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAppConfig } from '../../context/AppConfigContext'
import { api } from '../../api'
import UserAvatar from './components/UserAvatar'
import QuickAddModal from './components/QuickAddModal'
import { formatDue, isOverdue, priorityMeta, statusMeta, toneFor } from './utils'

/**
 * Reusable "Related Tasks" section for customer/lead/receipt/loan detail pages.
 *
 * Props:
 *   entityType: 'customer' | 'lead' | 'receipt' | 'loan'
 *   entityId:   string
 *   title:      optional override
 */
export default function RelatedTasks({ entityType, entityId, title }) {
  const { token } = useAuth()
  const cfg = useAppConfig()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [quickOpen, setQuickOpen] = useState(false)

  const load = async () => {
    if (!token || !entityId) return
    setLoading(true); setErr('')
    try {
      const res = await api.getTasksByEntity(token, entityType, entityId)
      const list = Array.isArray(res) ? res : (res?.items || [])
      setItems(list)
    } catch (e) { setErr(e?.message || 'Failed to load tasks') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token, entityType, entityId])

  const prefill = entityType === 'customer' ? { customer_id: entityId }
    : entityType === 'lead' ? { lead_id: entityId }
    : entityType === 'receipt' ? { receipt_id: entityId }
    : {}

  const onCreated = async (payload) => {
    const full = { ...payload, ...prefill }
    const created = await api.createTask(token, full)
    setItems(prev => [created, ...prev])
  }

  return (
    <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--stroke)]">
        <FiCheckSquare className="w-4 h-4 text-[var(--accent)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title || 'Tasks'}</h3>
        <span className="text-[10px] text-[var(--text-muted)] tabular-nums bg-[var(--card-hover)] px-1.5 py-0.5 rounded">{items.length}</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={load} className="p-1 rounded hover:bg-[var(--card-hover)]" title="Refresh">
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link to={`/tasks?${entityType}=${encodeURIComponent(entityId)}`} className="p-1 rounded hover:bg-[var(--card-hover)]" title="View all">
            <FiExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => setQuickOpen(true)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--accent)] text-white text-[11px] font-medium hover:bg-[var(--accent-hover)]"
          >
            <FiPlus className="w-3 h-3" /> New
          </button>
        </div>
      </div>
      {err && (
        <div className="p-3 text-xs text-rose-600">{err}</div>
      )}
      <div>
        {items.length === 0 && !loading && (
          <div className="p-4 text-xs text-[var(--text-muted)] text-center">No related tasks yet.</div>
        )}
        {items.map(t => {
          const s = statusMeta(cfg, t.status)
          const p = priorityMeta(cfg, t.priority)
          const stone = toneFor(s.color)
          const ptone = toneFor(p.color)
          const overdue = isOverdue(t)
          return (
            <Link
              key={t._key}
              to={`/tasks?taskId=${t._key}`}
              className="flex items-center gap-2 px-3 py-2 border-b border-[var(--stroke)] last:border-b-0 hover:bg-[var(--card-hover)]"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${ptone.dot} flex-shrink-0`} />
              <span className="text-sm text-[var(--text-primary)] truncate flex-1">{t.title}</span>
              <span className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${stone.chip}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${stone.dot}`} />
                {s.label}
              </span>
              {t.due_date && (
                <span className={`text-[11px] tabular-nums flex-shrink-0 ${overdue ? 'text-rose-600 dark:text-rose-300 font-semibold' : 'text-[var(--text-muted)]'}`}>
                  {formatDue(t.due_date)}
                </span>
              )}
              <UserAvatar name={t.assignee_emp_code} size={20} />
            </Link>
          )
        })}
      </div>
      <QuickAddModal
        open={quickOpen}
        prefill={prefill}
        onClose={() => setQuickOpen(false)}
        onCreate={onCreated}
      />
    </div>
  )
}
