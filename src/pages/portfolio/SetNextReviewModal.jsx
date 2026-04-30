import React, { useMemo, useState } from 'react'
import { FiX } from 'react-icons/fi'
import DatePickerInput from '../../components/ui/DatePickerInput.jsx'
import { useEscapeClose } from '../../hooks/useEscapeClose'

function addMonthsISO(ymd, months) {
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1, d))
  base.setUTCMonth(base.getUTCMonth() + Number(months || 0))
  return base.toISOString().slice(0, 10)
}

const PRESETS = [
  { months: 1, label: '+1 month' },
  { months: 3, label: '+3 months' },
  { months: 6, label: '+6 months' },
  { months: 12, label: '+1 year' }
]

export default function SetNextReviewModal({
  customer,
  customers = [],
  defaultMonths,
  tierCadenceMonths = { A: 12, B: 6, C: 3 },
  saving,
  onSave,
  onClose
}) {
  useEscapeClose(!saving, onClose)
  const multi = customers.length > 1
  const today = new Date().toISOString().slice(0, 10)

  const suggestedMonths = useMemo(() => {
    if (defaultMonths) return Number(defaultMonths)
    if (!customer) return 12
    return Number(customer.review_cadence_months || tierCadenceMonths[customer.review_tier] || tierCadenceMonths.A || 12)
  }, [customer, defaultMonths, tierCadenceMonths])

  const [next, setNext] = useState(() => {
    if (customer?.next_review_due) return String(customer.next_review_due).slice(0, 10)
    return addMonthsISO(today, suggestedMonths)
  })
  const [note, setNote] = useState('')

  const apply = (e) => {
    e?.preventDefault()
    onSave({ nextReviewDue: next, note })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-[var(--card-bg)] border border-[var(--stroke)] rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-[var(--stroke)]">
          <h3 className="font-semibold text-[var(--text-primary)]">
            {multi ? `Set next review · ${customers.length} customers` : `Set next review · ${customer?.name || ''}`}
          </h3>
          <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--card-hover)]" aria-label="Close">
            <FiX className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={apply} className="p-4 space-y-4">
          <div>
            <span className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Preset</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.months}
                  type="button"
                  onClick={() => setNext(addMonthsISO(today, p.months))}
                  className={`px-2.5 py-1 rounded-full text-xs border ${
                    next === addMonthsISO(today, p.months)
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-[var(--stroke)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              {!multi && customer && (
                <button
                  type="button"
                  onClick={() => setNext(addMonthsISO(today, suggestedMonths))}
                  className="px-2.5 py-1 rounded-full text-xs border border-dashed border-[var(--stroke)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]"
                  title="Use the customer's configured cadence"
                >
                  Use cadence ({suggestedMonths}m)
                </button>
              )}
            </div>
          </div>
          <div>
            <span className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Next review due</span>
            <DatePickerInput
              value={next}
              onChange={(v) => setNext(v)}
              inputClassName="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
              ariaLabel="Next review due"
            />
          </div>
          <div>
            <span className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Note (optional)</span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What changed this review?"
              className="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-sm text-[var(--text-primary)]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-[var(--stroke)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--card-hover)]">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !next}
              className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
