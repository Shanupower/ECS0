import React from 'react'
import { FiAlertCircle } from 'react-icons/fi'

export default function EditTargetModal({
  employee,
  draft,
  setDraft,
  onClose,
  onSave,
  saving,
  error,
}) {
  if (!employee) return null
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--stroke)] bg-[var(--card-bg-opaque)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-[var(--text-primary)]">Update personal target</div>
          <button
            type="button"
            onClick={() => {
              if (!saving) onClose?.()
            }}
            className="px-2 py-1 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] text-xs"
          >
            Close
          </button>
        </div>

        <div className="text-xs text-[var(--text-secondary)] mb-3">
          {employee.name} ({employee.emp_code})
        </div>

        {error && (
          <div className="mb-3 border border-[var(--error)]/60 bg-[var(--error-muted)] text-[var(--error)] px-3 py-2 rounded-lg text-sm flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
          Personal monthly target (₹)
        </label>
        <input
          type="number"
          min="0"
          step="any"
          value={draft}
          onChange={(e) => setDraft?.(e.target.value)}
          disabled={saving}
          placeholder="Leave blank to clear"
          className="w-full px-3 py-2 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] text-sm"
        />

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 text-sm"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!saving) onClose?.()
            }}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
