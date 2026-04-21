import React, { useState } from 'react'
import { FiEdit3, FiPhoneCall, FiVideo, FiSend } from 'react-icons/fi'

const KINDS = [
  { value: 'note', label: 'Note', icon: FiEdit3 },
  { value: 'call', label: 'Call', icon: FiPhoneCall },
  { value: 'meeting', label: 'Meeting', icon: FiVideo }
]

export default function LeadActivityComposer({ onSubmit, saving, defaultFollowUp = '' }) {
  const [kind, setKind] = useState('note')
  const [body, setBody] = useState('')
  const [outcome, setOutcome] = useState('')
  const [nextFollowUp, setNextFollowUp] = useState(defaultFollowUp || '')

  const submit = async (e) => {
    e.preventDefault()
    if (!body.trim()) return
    await onSubmit({
      kind,
      body: body.trim(),
      outcome: outcome.trim() || undefined,
      next_follow_up_at: nextFollowUp || undefined
    })
    setBody('')
    setOutcome('')
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] p-3">
      <div className="flex items-center gap-1.5">
        {KINDS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
              kind === value
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'border-[var(--stroke)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]'
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={kind === 'note' ? 'Add a note…' : kind === 'call' ? 'What was discussed?' : 'Meeting summary…'}
        rows={2}
        className="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(kind === 'call' || kind === 'meeting') && (
          <input
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="Outcome (optional)"
            className="px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg)] text-sm text-[var(--text-primary)]"
          />
        )}
        <input
          type="date"
          value={nextFollowUp || ''}
          onChange={(e) => setNextFollowUp(e.target.value)}
          title="Next follow-up"
          className="px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg)] text-sm text-[var(--text-primary)]"
        />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || !body.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          <FiSend className="w-3.5 h-3.5" />
          Log activity
        </button>
      </div>
    </form>
  )
}
