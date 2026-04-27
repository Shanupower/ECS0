import React, { useState } from 'react'
import { FiX } from 'react-icons/fi'
import { useEscapeClose } from '../../hooks/useEscapeClose'

export default function LostReasonModal({ reasons = [], leadName, onConfirm, onCancel, saving }) {
  const [selected, setSelected] = useState(reasons[0] || '')
  const [custom, setCustom] = useState('')
  useEscapeClose(!saving, onCancel)

  const submit = (e) => {
    e.preventDefault()
    const reason = (selected === 'Other' ? custom : selected).trim()
    if (!reason) return
    onConfirm(reason)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="bg-[var(--card-bg)] border border-[var(--stroke)] rounded-xl shadow-xl max-w-md w-full p-5 space-y-4"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Why lost?</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 truncate max-w-xs">{leadName}</p>
          </div>
          <button type="button" onClick={onCancel} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" aria-label="Close">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {reasons.map((r) => (
            <label
              key={r}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${
                selected === r
                  ? 'border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--text-primary)]'
                  : 'border-[var(--stroke)] hover:bg-[var(--card-hover)] text-[var(--text-secondary)]'
              }`}
            >
              <input
                type="radio"
                value={r}
                checked={selected === r}
                onChange={() => setSelected(r)}
                className="accent-[var(--accent)]"
              />
              {r}
            </label>
          ))}
          {selected === 'Other' && (
            <input
              type="text"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Custom reason"
              className="mt-1 px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-primary)] text-sm"
              autoFocus
              required
            />
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel} className="px-4 py-2 border border-[var(--stroke)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--card-hover)]">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || (!selected) || (selected === 'Other' && !custom.trim())}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Marking…' : 'Mark lost'}
          </button>
        </div>
      </form>
    </div>
  )
}
