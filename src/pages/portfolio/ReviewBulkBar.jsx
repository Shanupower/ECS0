import React, { useState } from 'react'
import { FiCheck, FiClock, FiUserCheck, FiX } from 'react-icons/fi'

export default function ReviewBulkBar({
  count,
  branches = [],
  assignableUsers = [],
  canReassign,
  onMarkReviewed,
  onPush,
  onReassign,
  onClear
}) {
  const [reassignOpen, setReassignOpen] = useState(false)
  const [target, setTarget] = useState('')

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 rounded-full border border-[var(--stroke)] bg-[var(--card-bg)] shadow-xl px-4 py-2 flex items-center gap-2 flex-wrap">
      <span className="text-sm font-medium text-[var(--text-primary)]">
        {count} selected
      </span>
      <button
        onClick={onMarkReviewed}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-full hover:bg-green-700"
        title="Mark reviewed today (uses each customer's cadence)"
      >
        <FiCheck className="w-3.5 h-3.5" /> Mark reviewed
      </button>
      <div className="flex items-center gap-1">
        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
          <FiClock className="w-3.5 h-3.5" /> Push
        </span>
        <button onClick={() => onPush(1)} className="px-2 py-1 text-xs rounded-full border border-[var(--stroke)] hover:bg-[var(--card-hover)]">+1m</button>
        <button onClick={() => onPush(3)} className="px-2 py-1 text-xs rounded-full border border-[var(--stroke)] hover:bg-[var(--card-hover)]">+3m</button>
        <button onClick={() => onPush(6)} className="px-2 py-1 text-xs rounded-full border border-[var(--stroke)] hover:bg-[var(--card-hover)]">+6m</button>
        <button onClick={() => onPush(12)} className="px-2 py-1 text-xs rounded-full border border-[var(--stroke)] hover:bg-[var(--card-hover)]">+1y</button>
      </div>
      {canReassign && (
        <div className="flex items-center gap-1 relative">
          <button
            onClick={() => setReassignOpen((v) => !v)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border border-[var(--stroke)] hover:bg-[var(--card-hover)]"
          >
            <FiUserCheck className="w-3.5 h-3.5" /> Reassign
          </button>
          {reassignOpen && (
            <div className="absolute bottom-full mb-2 right-0 w-64 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg)] shadow-xl p-2 space-y-2">
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full text-xs px-2 py-1.5 border border-[var(--stroke)] rounded bg-[var(--card-bg-opaque)] text-[var(--text-primary)]"
              >
                <option value="">Select user…</option>
                {assignableUsers.map((u) => (
                  <option key={u.id || u._key} value={u.id || u._key || u.emp_code}>{u.name} ({u.emp_code})</option>
                ))}
              </select>
              <button
                onClick={() => { if (target) { onReassign(target); setReassignOpen(false); setTarget('') } }}
                disabled={!target}
                className="w-full px-2 py-1.5 text-xs rounded bg-[var(--accent)] text-white disabled:opacity-50"
              >
                Reassign {count} customers
              </button>
            </div>
          )}
        </div>
      )}
      <button onClick={onClear} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-full hover:bg-[var(--card-hover)]" title="Clear selection">
        <FiX className="w-4 h-4" />
      </button>
    </div>
  )
}
