import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as chrono from 'chrono-node'
import { FiX, FiCalendar, FiFlag, FiTag, FiUser, FiLink2, FiRepeat } from 'react-icons/fi'
import { useAppConfig } from '../../../context/AppConfigContext'
import { labelMeta, priorityMeta, toneFor } from '../utils'

/**
 * Natural-language quick add. Parses:
 *   due dates (tomorrow 5pm)
 *   priority  (!p0 !p1 !p2 !p3, !urgent/!high/!low)
 *   labels    (#label)
 *   assignee  (@name)
 *   entity    (+customer:id  +lead:id  +receipt:id)
 *   recur     (every monday, every 2 weeks)
 *   estimate  (~30m, ~2h)
 */
const PRIORITY_ALIASES = {
  urgent: 'p0', crit: 'p0', critical: 'p0',
  high: 'p1', hi: 'p1',
  normal: 'p2', med: 'p2', medium: 'p2',
  low: 'p3', lo: 'p3'
}

function parseInput(raw, cfg, users) {
  const tokens = []
  const labels = []
  let priority = null
  let assignee = null
  let customer_id = null
  let lead_id = null
  let receipt_id = null
  let recurrence = null
  let estimate_minutes = null

  // Strip markup one at a time; keep residue as the title.
  let text = raw || ''

  const stripAll = (regex, fn) => {
    text = text.replace(regex, (...args) => { fn(...args); return ' ' })
  }

  stripAll(/\+(customer|lead|receipt):([A-Za-z0-9_-]+)/g, (_, type, id) => {
    if (type === 'customer') customer_id = id
    if (type === 'lead') lead_id = id
    if (type === 'receipt') receipt_id = id
  })
  stripAll(/#([A-Za-z0-9_-]+)/g, (_, t) => { labels.push(t) })
  stripAll(/!(p[0-3])\b/gi, (_, p) => { priority = p.toLowerCase() })
  stripAll(/!(urgent|critical|crit|high|hi|normal|med|medium|low|lo)\b/gi, (_, p) => {
    priority = PRIORITY_ALIASES[p.toLowerCase()] || priority
  })
  stripAll(/~(\d+)(h|m)/gi, (_, n, unit) => {
    estimate_minutes = unit.toLowerCase() === 'h' ? Number(n) * 60 : Number(n)
  })

  // Assignee: best-effort match against known users.
  stripAll(/@([A-Za-z0-9_.-]+)/g, (_, name) => {
    const lower = String(name).toLowerCase()
    const match = (users || []).find(u =>
      String(u.emp_code || '').toLowerCase() === lower ||
      String(u.name || '').toLowerCase().replace(/\s+/g, '').includes(lower)
    )
    if (match) assignee = match
  })

  // Recurrence phrase (simple).
  const recurMatch = text.match(/every\s+(day|weekday|weekend|week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+\s+(days?|weeks?|months?|years?))/i)
  if (recurMatch) {
    recurrence = recurMatch[0]
    text = text.replace(recurMatch[0], ' ')
  }

  // Dates via chrono.
  const parsed = chrono.parse(text, new Date(), { forwardDate: true })
  let due_date = null
  let scheduled_date = null
  if (parsed && parsed.length) {
    const first = parsed[0]
    const d = first.start.date()
    due_date = d.toISOString().slice(0, 10)
    if (first.start.isCertain('hour')) {
      scheduled_date = d.toISOString()
    }
    text = text.replace(first.text, ' ')
  }

  const title = text.replace(/\s+/g, ' ').trim()
  return { title, due_date, scheduled_date, priority, labels, assignee, customer_id, lead_id, receipt_id, recurrence, estimate_minutes }
}

export default function QuickAddModal({ open, prefill, onClose, onCreate }) {
  const cfg = useAppConfig()
  const [raw, setRaw] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setRaw('')
    setError('')
    // Delay focus to wait for portal mount.
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  const parsed = useMemo(() => parseInput(raw, cfg, cfg?._users || []), [raw, cfg])

  const submit = async (e) => {
    e?.preventDefault()
    if (!parsed.title) { setError('Give the task a title.'); return }
    setSaving(true)
    try {
      const payload = {
        title: parsed.title,
        due_date: parsed.due_date || prefill?.due_date,
        scheduled_date: parsed.scheduled_date,
        priority: parsed.priority || 'p2',
        labels: parsed.labels,
        assignee_id: parsed.assignee?.id || parsed.assignee?._key,
        customer_id: parsed.customer_id || prefill?.customer_id,
        lead_id: parsed.lead_id || prefill?.lead_id,
        receipt_id: parsed.receipt_id || prefill?.receipt_id,
        estimate_minutes: parsed.estimate_minutes,
        recurrence_rule: parsed.recurrence || undefined,
        status: prefill?.status
      }
      await onCreate?.(payload)
      onClose?.()
    } catch (err) {
      setError(err?.message || 'Failed to create task')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const pMeta = parsed.priority ? priorityMeta(cfg, parsed.priority) : null
  const pTone = pMeta ? toneFor(pMeta.color) : null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh] bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--stroke)] bg-[var(--card-bg)] shadow-2xl overflow-hidden">
        <form onSubmit={submit}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--stroke)]">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Quick add</span>
            <span className="ml-auto text-[11px] text-[var(--text-muted)]">Cmd+Enter to save · Esc to close</span>
            <button type="button" onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <FiX className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4">
            <input
              ref={inputRef}
              type="text"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(e) }}
              placeholder="Call @priya tomorrow 4pm about invoice #billing !p1 +customer:ACME-1 every week ~30m"
              className="w-full text-base px-3 py-2.5 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {parsed.title && (
                <span className="inline-flex items-center px-2 py-0.5 rounded border border-[var(--stroke)] text-[11px] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)]">
                  Title · {parsed.title}
                </span>
              )}
              {parsed.due_date && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-[11px] text-blue-700 dark:text-blue-200">
                  <FiCalendar className="w-3 h-3" />
                  {parsed.scheduled_date ? new Date(parsed.scheduled_date).toLocaleString() : parsed.due_date}
                </span>
              )}
              {pMeta && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] ${pTone.chip}`}>
                  <FiFlag className="w-3 h-3" /> {pMeta.label}
                </span>
              )}
              {parsed.labels.map(l => {
                const lm = labelMeta(cfg, l)
                const tone = toneFor(lm.color)
                return (
                  <span key={l} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] ${tone.chip}`}>
                    <FiTag className="w-3 h-3" /> {lm.label || l}
                  </span>
                )
              })}
              {parsed.assignee && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--stroke)] text-[11px]">
                  <FiUser className="w-3 h-3" /> {parsed.assignee.name || parsed.assignee.emp_code}
                </span>
              )}
              {(parsed.customer_id || parsed.lead_id || parsed.receipt_id) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--stroke)] text-[11px]">
                  <FiLink2 className="w-3 h-3" />
                  {parsed.customer_id ? `Customer: ${parsed.customer_id}` : parsed.lead_id ? `Lead: ${parsed.lead_id}` : `Receipt: ${parsed.receipt_id}`}
                </span>
              )}
              {parsed.recurrence && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 text-[11px] text-violet-700 dark:text-violet-200">
                  <FiRepeat className="w-3 h-3" /> {parsed.recurrence}
                </span>
              )}
              {parsed.estimate_minutes != null && (
                <span className="inline-flex items-center px-2 py-0.5 rounded border border-[var(--stroke)] text-[11px]">
                  ~{parsed.estimate_minutes < 60 ? `${parsed.estimate_minutes}m` : `${(parsed.estimate_minutes/60).toFixed(1)}h`}
                </span>
              )}
            </div>
            {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--stroke)] bg-[var(--card-bg-opaque)]">
            <span className="text-[11px] text-[var(--text-muted)]">
              Tip · try: <code>#onsite</code>, <code>@priya</code>, <code>!p0</code>, <code>+lead:LD-12</code>, <code>every monday</code>
            </span>
            <button
              type="submit"
              disabled={saving || !parsed.title}
              className="px-3 py-1.5 rounded-md bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
