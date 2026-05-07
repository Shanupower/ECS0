import React, { useState } from 'react'
import { FiX } from 'react-icons/fi'
import { Modal } from '../../components/ui/Modal'

export default function LostReasonModal({ reasons = [], leadName, onConfirm, onCancel, saving }) {
  const [selected, setSelected] = useState(reasons[0] || '')
  const [custom, setCustom] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const reason = (selected === 'Other' ? custom : selected).trim()
    if (!reason) return
    onConfirm(reason)
  }

  return (
    <Modal open={true} variant="glass" size="md" onClose={onCancel} closeOnEscape={!saving}>
      <form
        onSubmit={submit}
        className="flex max-h-[inherit] min-h-0 flex-1 flex-col overflow-hidden rounded-xl"
      >
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto overscroll-contain">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-[var(--text-primary)]">Why lost?</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1 break-words">{leadName}</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="min-h-10 min-w-10 shrink-0 inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg"
              aria-label="Close"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {reasons.map((r) => (
              <label
                key={r}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm min-h-11 ${
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
                className="mt-1 min-h-11 px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-primary)] text-sm"
                autoFocus
                required
              />
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--stroke)] p-4 sm:flex-row sm:justify-end sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 px-4 py-2 border border-[var(--stroke)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--card-hover)] w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || (!selected) || (selected === 'Other' && !custom.trim())}
            className="min-h-11 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 w-full sm:w-auto"
          >
            {saving ? 'Marking…' : 'Mark lost'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
