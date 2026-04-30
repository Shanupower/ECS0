import React, { useEffect, useState, useCallback } from 'react'
import { FiCheck, FiChevronRight, FiRefreshCw, FiX } from 'react-icons/fi'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

export default function HandoffBanner() {
  const { token } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await api.listHandoffInbox(token)
      setItems(Array.isArray(data?.items) ? data.items : [])
    } catch (err) {
      console.warn('handoff inbox load failed:', err?.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  if (!items.length) return null

  const ack = async (id) => {
    try {
      await api.acknowledgeHandoff(token, id)
      setItems((prev) => prev.filter((h) => h._key !== id))
    } catch (err) {
      console.error('ack failed:', err?.message)
    }
  }

  return (
    <div className="border-b border-amber-300 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
      <div className="px-3 sm:px-6 py-2 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
            {items.length} shift hand-off{items.length > 1 ? 's' : ''} waiting for you
          </span>
          <button onClick={load} disabled={loading} className="text-[11px] text-amber-800 dark:text-amber-200 hover:underline inline-flex items-center gap-1 disabled:opacity-50">
            <FiRefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <div className="mt-1 space-y-1">
          {items.map((h) => (
            <div key={h._key} className="rounded border border-amber-300 dark:border-amber-800 bg-white dark:bg-amber-900/20 px-2 py-1.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpandedId(expandedId === h._key ? null : h._key)}
                  className="flex-1 min-w-0 flex items-center gap-2 text-left"
                >
                  <FiChevronRight className={`w-3 h-3 text-amber-700 dark:text-amber-300 transition-transform ${expandedId === h._key ? 'rotate-90' : ''}`} />
                  <span className="text-xs text-amber-900 dark:text-amber-100 truncate">
                    From <strong>{h.from_name || h.from_emp_code || 'teammate'}</strong>
                    {' · '}{Array.isArray(h.tasks_snapshot) ? h.tasks_snapshot.length : 0} task(s)
                    {h.note ? ` · ${h.note}` : ''}
                  </span>
                </button>
                <button onClick={() => ack(h._key)} className="text-[11px] px-2 py-0.5 rounded bg-amber-600 text-white hover:bg-amber-700 inline-flex items-center gap-1">
                  <FiCheck className="w-3 h-3" />
                  Acknowledge
                </button>
              </div>
              {expandedId === h._key && Array.isArray(h.tasks_snapshot) && h.tasks_snapshot.length > 0 && (
                <ul className="mt-1 pl-4 text-[11px] text-amber-800 dark:text-amber-200 space-y-0.5">
                  {h.tasks_snapshot.slice(0, 20).map((t) => (
                    <li key={t.id}>
                      [{t.status}] [{t.priority}] {t.title}{t.due_date ? ` · due ${t.due_date}` : ''}
                    </li>
                  ))}
                  {h.tasks_snapshot.length > 20 && (
                    <li>…and {h.tasks_snapshot.length - 20} more</li>
                  )}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
