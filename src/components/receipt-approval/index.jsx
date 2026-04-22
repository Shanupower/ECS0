import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  FiCheck, FiCornerUpRight, FiSlash, FiSend, FiAlertTriangle, FiClock, FiCheckCircle,
  FiX, FiShield, FiInfo, FiMessageSquare, FiChevronRight, FiPaperclip, FiFile,
  FiDownload, FiTrash2, FiImage
} from 'react-icons/fi'
import { Button, Card, Input } from '../ui'

/** @typedef {{ id: string, name: string, is_active?: boolean }} Team */

function formatTs(ts) {
  if (!ts) return '—'
  try { return new Date(ts).toLocaleString() } catch { return String(ts) }
}

function userLabel(u) {
  if (!u) return 'System'
  if (typeof u === 'string') return u
  return u.name || u.emp_code || u.email || u.sub || 'User'
}

function formatBytes(n) {
  if (!Number.isFinite(n) || n <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0; let v = n
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

const ACCEPT_EXT = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt'
const MAX_FILES = 10
const MAX_FILE_BYTES = 10 * 1024 * 1024

// ---------------------------------------------------------------------------
// ApprovalAttachmentsPicker — staged file picker used by every action modal.
// It does NOT upload on its own; callers pass the selected `File[]` into the
// `uploadApprovalEvidence` api helper right before submitting the action so
// files and the action commit (or fail) together.
// ---------------------------------------------------------------------------

export function ApprovalAttachmentsPicker({
  value = [],
  onChange,
  disabled = false,
  label = 'Supporting documents (optional)',
  help = 'Attach photos, PDFs, or documents that support this decision. Max 10 files, 10 MB each.'
}) {
  const inputRef = useRef(null)

  const handlePick = (fileList) => {
    const incoming = Array.from(fileList || [])
    if (!incoming.length) return
    // Filter out files that exceed size limits and de-dupe on name+size so
    // the user doesn't accidentally attach the same file twice.
    const seen = new Set(value.map((f) => `${f.name}:${f.size}`))
    const next = [...value]
    let overLimit = 0
    for (const f of incoming) {
      if (f.size > MAX_FILE_BYTES) { overLimit++; continue }
      const key = `${f.name}:${f.size}`
      if (seen.has(key)) continue
      seen.add(key)
      next.push(f)
      if (next.length >= MAX_FILES) break
    }
    onChange(next.slice(0, MAX_FILES))
    if (overLimit > 0) {
      console.warn(`${overLimit} file(s) rejected: exceeds 10 MB`)
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleRemove = (idx) => {
    const next = value.filter((_, i) => i !== idx)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-label text-[var(--text-secondary)] flex items-center gap-1.5">
        <FiPaperclip className="w-3.5 h-3.5" /> {label}
      </label>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_EXT}
        disabled={disabled || value.length >= MAX_FILES}
        onChange={(e) => handlePick(e.target.files)}
        className="text-xs text-[var(--text-primary)] file:mr-3 file:py-1.5 file:px-3 file:rounded-input file:border file:border-[var(--stroke)] file:bg-[var(--card-bg-opaque)] file:text-[var(--text-primary)] file:cursor-pointer"
      />
      <p className="text-[11px] text-[var(--text-muted)]">{help}</p>
      {value.length > 0 && (
        <ul className="mt-1 space-y-1">
          {value.map((f, i) => (
            <li
              key={`${f.name}-${f.size}-${i}`}
              className="flex items-center gap-2 px-2 py-1 rounded border border-[var(--stroke)] bg-[var(--card-bg-opaque)]"
            >
              {(f.type || '').startsWith('image/')
                ? <FiImage className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                : <FiFile className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />}
              <span className="flex-1 min-w-0 truncate text-xs text-[var(--text-primary)]" title={f.name}>{f.name}</span>
              <span className="text-[11px] text-[var(--text-muted)] shrink-0">{formatBytes(f.size)}</span>
              <button
                type="button"
                aria-label="Remove file"
                disabled={disabled}
                onClick={() => handleRemove(i)}
                className="p-1 rounded hover:bg-[var(--card-hover)] text-[var(--text-muted)] hover:text-[var(--error)]"
              >
                <FiTrash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ActionBar — primary call-to-action on ReceiptViewPage
// ---------------------------------------------------------------------------

/**
 * Compact CTA bar that decides which buttons to show based on receipt state +
 * current user's role / team membership. Delegates actual work to the parent.
 */
export function ReceiptActionBar({
  receipt,
  currentTeam,
  currentUser,
  isCreator,
  canActOnCurrentTeam,
  loading = false,
  onSubmit,
  onRoute,
  onComplete,
  onReject,
}) {
  if (!receipt) return null

  const status = receipt.status
  const isDraft = status === 'Draft' || status === 'Pending' || !status
  const isNeedsChanges = status === 'Needs Changes'
  const inFlight = !!receipt.current_team_id
  const isAdmin = currentUser?.role === 'admin'

  // No receipt-level actions possible for completed receipts.
  if (!isDraft && !isNeedsChanges && !inFlight) return null

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-center gap-2">
        <FiShield className="text-[var(--accent)]" />
        <h3 className="font-semibold text-[var(--text-primary)]">Approval workflow</h3>
        {inFlight && currentTeam && (
          <span className="ml-auto text-sm text-[var(--text-secondary)]">
            Pending with <b className="text-[var(--text-primary)]">{currentTeam.name}</b>
          </span>
        )}
        {isNeedsChanges && (
          <span className="ml-auto text-sm text-[var(--warn)]">
            Needs changes — update the receipt and resubmit
          </span>
        )}
      </div>

      {(isDraft || isNeedsChanges) && (isCreator || isAdmin) && (
        <div className="flex flex-wrap gap-2">
          <Button
            icon={<FiSend />}
            disabled={loading}
            onClick={onSubmit}
          >
            {isNeedsChanges ? 'Resubmit for approval' : 'Submit for approval'}
          </Button>
        </div>
      )}

      {inFlight && canActOnCurrentTeam && (
        <div className="flex flex-wrap gap-2">
          <Button icon={<FiCornerUpRight />} disabled={loading} onClick={onRoute}>Approve &amp; route to…</Button>
          <Button icon={<FiCheckCircle />} disabled={loading} variant="secondary" onClick={onComplete}>Approve &amp; complete</Button>
          <Button icon={<FiSlash />} disabled={loading} variant="ghost" onClick={onReject}>Reject to creator</Button>
        </div>
      )}

      {inFlight && !canActOnCurrentTeam && !isAdmin && (
        <p className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
          <FiInfo /> Waiting for <b className="text-[var(--text-primary)]">{currentTeam?.name || 'the current team'}</b> to act.
        </p>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// TeamPickerModal — pick next team (excluding already-approved teams)
// ---------------------------------------------------------------------------

export function TeamPickerModal({
  open,
  title = 'Route to next team',
  teams = [],
  currentTeamId = null,
  excludedTeamIds = [],
  defaultComment = '',
  submitLabel = 'Approve & route',
  onClose,
  onSubmit,
}) {
  const [teamId, setTeamId] = useState('')
  const [comment, setComment] = useState(defaultComment)
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) { setTeamId(''); setComment(defaultComment); setFiles([]); setError('') }
  }, [open, defaultComment])

  // Hide the team currently holding the receipt (no self-loop) and any team
  // that already approved in this cycle (no backward routing).
  const currentKey = currentTeamId != null ? String(currentTeamId) : null
  const excludedSet = useMemo(
    () => new Set(excludedTeamIds.map(String).concat(currentKey ? [currentKey] : [])),
    [excludedTeamIds, currentKey]
  )
  const choices = useMemo(
    () => teams.filter((t) => t.is_active !== false && !excludedSet.has(String(t.id || t._key))),
    [teams, excludedSet]
  )

  if (!open) return null

  const handleSubmit = async () => {
    if (!teamId) return setError('Pick a team to continue')
    setBusy(true); setError('')
    try {
      await onSubmit(teamId, comment.trim() || null, files)
    } catch (err) { setError(err.message || 'Failed to route'); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <Card padding="lg" className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
          <button aria-label="Close" onClick={() => !busy && onClose()} className="p-1 rounded hover:bg-[var(--card-hover)]"><FiX /></button>
        </div>
        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-label text-[var(--text-secondary)]">Next team</label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="w-full rounded-input border border-[var(--stroke)] bg-[var(--card-bg-opaque)] px-4 py-2.5 text-body text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="">— Select a team —</option>
              {choices.map((t) => (
                <option key={t.id || t._key} value={t.id || t._key}>{t.name}</option>
              ))}
            </select>
            {choices.length === 0 && (
              <p className="text-xs text-[var(--warn)]">No teams left to route to. Choose <b>Approve &amp; complete</b> instead.</p>
            )}
            <p className="text-[11px] text-[var(--text-muted)]">
              The current team and any team that already approved in this cycle are hidden to prevent loops.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-label text-[var(--text-secondary)]">Comment (optional)</label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-input border border-[var(--stroke)] bg-[var(--card-bg-opaque)] px-4 py-2.5 text-body text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="Add context for the next team…"
            />
          </div>
          <ApprovalAttachmentsPicker value={files} onChange={setFiles} disabled={busy} />
          {error && <p className="text-sm text-[var(--error)] flex items-center gap-1.5"><FiAlertTriangle /> {error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button disabled={busy || !teamId} icon={<FiCheck />} onClick={handleSubmit}>{busy ? 'Submitting…' : submitLabel}</Button>
        </div>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RejectModal — reject back to creator (comment required)
// ---------------------------------------------------------------------------

export function RejectModal({
  open,
  title = 'Reject to creator',
  onClose,
  onSubmit,
}) {
  const [comment, setComment] = useState('')
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (open) { setComment(''); setFiles([]); setError('') } }, [open])

  if (!open) return null

  const handleSubmit = async () => {
    if (!comment.trim()) return setError('A rejection reason is required')
    setBusy(true); setError('')
    try { await onSubmit(comment.trim(), files) }
    catch (err) { setError(err.message || 'Failed to reject'); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <Card padding="lg" className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <FiSlash className="text-[var(--error)]" /> {title}
          </h2>
          <button aria-label="Close" onClick={() => !busy && onClose()} className="p-1 rounded hover:bg-[var(--card-hover)]"><FiX /></button>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          The receipt will return to the creator with status <b>Needs Changes</b>.
          They can edit and resubmit; a new approval cycle will start.
        </p>
        <div className="flex flex-col gap-1.5">
          <label className="text-label text-[var(--text-secondary)]">Reason <span className="text-[var(--error)]">*</span></label>
          <textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full rounded-input border border-[var(--stroke)] bg-[var(--card-bg-opaque)] px-4 py-2.5 text-body text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
            placeholder="Describe what needs to change…"
            autoFocus
          />
        </div>
        <div className="mt-3">
          <ApprovalAttachmentsPicker value={files} onChange={setFiles} disabled={busy} />
        </div>
        {error && <p className="text-sm text-[var(--error)] flex items-center gap-1.5 mt-2"><FiAlertTriangle /> {error}</p>}
        <div className="flex items-center justify-end gap-2 mt-5">
          <Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button disabled={busy || !comment.trim()} icon={<FiSlash />} onClick={handleSubmit}>{busy ? 'Rejecting…' : 'Send back to creator'}</Button>
        </div>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SubmitForApprovalModal — optional comment + evidence attachments.
// Submitting with empty state is equivalent to the old direct submit click.
// ---------------------------------------------------------------------------

export function SubmitForApprovalModal({
  open,
  isResubmit = false,
  onClose,
  onSubmit,
}) {
  const [comment, setComment] = useState('')
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (open) { setComment(''); setFiles([]); setError('') } }, [open])

  if (!open) return null

  const handleSubmit = async () => {
    setBusy(true); setError('')
    try { await onSubmit(comment.trim() || null, files) }
    catch (err) { setError(err.message || 'Failed to submit'); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <Card padding="lg" className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <FiSend className="text-[var(--accent)]" /> {isResubmit ? 'Resubmit for approval' : 'Submit for approval'}
          </h2>
          <button aria-label="Close" onClick={() => !busy && onClose()} className="p-1 rounded hover:bg-[var(--card-hover)]"><FiX /></button>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          The receipt will be routed to the intake team. Attach supporting documents if you want to give reviewers extra context.
        </p>
        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-label text-[var(--text-secondary)]">Note (optional)</label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-input border border-[var(--stroke)] bg-[var(--card-bg-opaque)] px-4 py-2.5 text-body text-[var(--text-primary)]"
              placeholder="Anything reviewers should know…"
            />
          </div>
          <ApprovalAttachmentsPicker value={files} onChange={setFiles} disabled={busy} />
          {error && <p className="text-sm text-[var(--error)] flex items-center gap-1.5"><FiAlertTriangle /> {error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button disabled={busy} icon={<FiSend />} onClick={handleSubmit}>
            {busy ? 'Submitting…' : (isResubmit ? 'Resubmit' : 'Submit for approval')}
          </Button>
        </div>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CompleteApprovalModal — final-approve a receipt, optional evidence/comment.
// ---------------------------------------------------------------------------

export function CompleteApprovalModal({
  open,
  currentTeamName = '',
  finalLabel = 'Completed',
  onClose,
  onSubmit,
}) {
  const [comment, setComment] = useState('')
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (open) { setComment(''); setFiles([]); setError('') } }, [open])

  if (!open) return null

  const handleSubmit = async () => {
    setBusy(true); setError('')
    try { await onSubmit(comment.trim() || null, files) }
    catch (err) { setError(err.message || 'Failed to complete'); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <Card padding="lg" className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <FiCheckCircle className="text-[var(--success)]" /> Approve &amp; complete
          </h2>
          <button aria-label="Close" onClick={() => !busy && onClose()} className="p-1 rounded hover:bg-[var(--card-hover)]"><FiX /></button>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          {currentTeamName ? <>As <b className="text-[var(--text-primary)]">{currentTeamName}</b>, this will finalize the receipt as <b>{finalLabel}</b>.</> :
            <>This will finalize the receipt as <b>{finalLabel}</b>.</>}
          {' '}Attach verification documents if needed.
        </p>
        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-label text-[var(--text-secondary)]">Comment (optional)</label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-input border border-[var(--stroke)] bg-[var(--card-bg-opaque)] px-4 py-2.5 text-body text-[var(--text-primary)]"
              placeholder="Any closing note…"
            />
          </div>
          <ApprovalAttachmentsPicker value={files} onChange={setFiles} disabled={busy} />
          {error && <p className="text-sm text-[var(--error)] flex items-center gap-1.5"><FiAlertTriangle /> {error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button disabled={busy} icon={<FiCheckCircle />} onClick={handleSubmit}>
            {busy ? 'Finalizing…' : 'Approve & complete'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// HistoryTimeline — chronological log of cycles, teams, resolutions
// ---------------------------------------------------------------------------

const RESOLUTION_META = {
  approved: { tone: 'text-[var(--success)]', Icon: FiCheckCircle, label: 'Approved' },
  routed:   { tone: 'text-[var(--accent)]',  Icon: FiCornerUpRight, label: 'Approved & routed' },
  rejected: { tone: 'text-[var(--error)]',   Icon: FiSlash, label: 'Rejected' },
  forced:   { tone: 'text-[var(--warn)]',    Icon: FiAlertTriangle, label: 'Admin override' },
}

function AttachmentChips({ attachments, token, receiptId }) {
  if (!Array.isArray(attachments) || !attachments.length) return null
  const base = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE_URL) || ''
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {attachments.map((a) => {
        if (a.missing) {
          return (
            <span key={a.id} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--stroke)] text-[11px] text-[var(--text-muted)]" title="File no longer available">
              <FiFile className="w-3 h-3" /> (deleted)
            </span>
          )
        }
        // Build a short-lived download URL. The browser fetch will send the
        // Authorization header via the global axios wrapper… but here we use
        // a plain anchor, so we rely on the session cookie OR we open via
        // window.fetch-and-blob. Simple approach: open in new tab; backend
        // requires Bearer token, so we do a JS fetch-as-blob click.
        const href = `${base}${a.url}`
        const Icon = (a.mime_type || '').startsWith('image/') ? FiImage : FiFile
        const handleDownload = async (e) => {
          e.preventDefault()
          if (!token) { window.open(href, '_blank'); return }
          try {
            const res = await fetch(href, { headers: { Authorization: `Bearer ${token}` } })
            if (!res.ok) throw new Error(await res.text())
            const blob = await res.blob()
            const objectUrl = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = objectUrl
            link.download = a.original_name || a.filename || 'attachment'
            document.body.appendChild(link)
            link.click()
            link.remove()
            setTimeout(() => URL.revokeObjectURL(objectUrl), 2000)
          } catch (err) {
            console.warn('Attachment download failed:', err?.message || err)
          }
        }
        return (
          <a
            key={a.id}
            href={href}
            onClick={handleDownload}
            title={`${a.original_name}${a.uploaded_by_name ? ' · uploaded by ' + a.uploaded_by_name : ''}`}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-[var(--stroke)] bg-[var(--card-bg-opaque)] hover:bg-[var(--card-hover)] text-[11px] text-[var(--text-primary)] max-w-[220px]"
          >
            <Icon className="w-3 h-3 text-[var(--accent)] shrink-0" />
            <span className="truncate">{a.original_name || a.filename || a.id}</span>
            <span className="text-[var(--text-muted)] shrink-0">{formatBytes(a.file_size)}</span>
            <FiDownload className="w-3 h-3 shrink-0 text-[var(--text-muted)]" />
          </a>
        )
      })}
    </div>
  )
}

export function HistoryTimeline({ history, emptyMessage = 'No approval activity yet.', token, receiptId }) {
  const events = Array.isArray(history?.stage_history) ? history.stage_history : []
  if (!events.length) {
    return (
      <Card padding="md">
        <p className="text-sm text-[var(--text-secondary)] flex items-center gap-2"><FiClock /> {emptyMessage}</p>
      </Card>
    )
  }

  // Group entries by cycle for clearer presentation.
  const byCycle = events.reduce((acc, ev) => {
    const id = ev.cycle_id || '—'
    if (!acc[id]) acc[id] = []
    acc[id].push(ev)
    return acc
  }, {})
  const cycles = Object.entries(byCycle)

  return (
    <Card padding="md" className="space-y-4">
      <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2"><FiClock /> Approval history</h3>
      {cycles.map(([cycleId, entries], idx) => (
        <div key={cycleId} className="relative">
          <div className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-2">
            Cycle {cycles.length - idx}
            {entries[0]?.entered_at && <span className="ml-2">· started {formatTs(entries[0].entered_at)}</span>}
          </div>
          <ol className="space-y-2 border-l border-[var(--stroke)] pl-4 ml-2">
            {entries.map((ev, i) => {
              const res = ev.resolution
              const meta = (ev.forced && RESOLUTION_META.forced) || RESOLUTION_META[res] || null
              const Icon = meta?.Icon || FiClock
              return (
                <li key={`${cycleId}-${i}`} className="relative">
                  <span className="absolute -left-[22px] top-1 w-3 h-3 rounded-full bg-[var(--card-bg)] border border-[var(--stroke)] flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
                  </span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <b className="text-[var(--text-primary)]">{ev.team_name || ev.team_id}</b>
                    {meta && (
                      <span className={`inline-flex items-center gap-1 text-xs ${meta.tone}`}>
                        <Icon /> {ev.forced ? 'Admin override' : meta.label}
                      </span>
                    )}
                    {!meta && (
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                        <FiClock /> Pending
                      </span>
                    )}
                    {ev.next_team_name && (
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                        <FiChevronRight /> {ev.next_team_name}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">
                    Entered {formatTs(ev.entered_at)} by {userLabel(ev.entered_by)}
                    {ev.exited_at && <> · Closed {formatTs(ev.exited_at)} by {userLabel(ev.exited_by)}</>}
                  </div>
                  {ev.comment && (
                    <div className="mt-1 text-sm text-[var(--text-primary)] bg-[var(--card-hover)] rounded p-2 flex gap-2">
                      <FiMessageSquare className="shrink-0 mt-0.5 text-[var(--text-secondary)]" />
                      <span className="whitespace-pre-wrap">{ev.comment}</span>
                    </div>
                  )}
                  <AttachmentChips attachments={ev.attachments} token={token} receiptId={receiptId} />
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// AdminOverrideModal — requires x-admin-reason; can complete/reject/route/edit-status
// ---------------------------------------------------------------------------

const OVERRIDE_ACTIONS = [
  { key: 'complete', label: 'Force complete',   help: 'Mark as final — bypasses remaining teams.' },
  { key: 'reject',   label: 'Force reject',     help: 'Send back to creator as Needs Changes.' },
  { key: 'route',    label: 'Route to team…',   help: 'Force-approve current team and send to a team you pick.' },
  { key: 'status',   label: 'Set legacy status', help: 'Directly set the receipt.status value (compat).' },
]

export function AdminOverrideModal({
  open,
  teams = [],
  currentStatus = '',
  currentTeamId = null,
  onClose,
  onSubmit, // (payload, reason) => Promise
}) {
  const [action, setAction] = useState('complete')
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [teamId, setTeamId] = useState('')
  const [status, setStatus] = useState(currentStatus || '')
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setAction('complete'); setReason(''); setComment(''); setTeamId('')
      setStatus(currentStatus || ''); setFiles([]); setError('')
    }
  }, [open, currentStatus])

  if (!open) return null

  // Legacy-status overrides don't flow through the engine, so attachments
  // can't be tagged with a stage_event_id there. Hide the picker in that mode.
  const allowAttachments = action !== 'status'

  const submit = async () => {
    if (!reason.trim()) return setError('Admin reason is required for audit')
    let payload
    if (action === 'complete') payload = { complete: true, comment: comment || null }
    else if (action === 'reject') {
      if (!comment.trim()) return setError('Comment is required when rejecting')
      payload = { reject: true, comment: comment.trim() }
    }
    else if (action === 'route') {
      if (!teamId) return setError('Pick a team to route to')
      payload = { next_team_id: teamId, comment: comment || null }
    }
    else if (action === 'status') {
      if (!status.trim()) return setError('Pick a status value')
      payload = { status: status.trim() }
    }
    setBusy(true); setError('')
    try { await onSubmit(payload, reason.trim(), allowAttachments ? files : []) }
    catch (err) { setError(err.message || 'Override failed'); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <Card padding="lg" className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <FiShield className="text-[var(--warn)]" /> Admin override
          </h2>
          <button aria-label="Close" onClick={() => !busy && onClose()} className="p-1 rounded hover:bg-[var(--card-hover)]"><FiX /></button>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          Bypass the normal workflow. Every override is recorded with your reason and marked <b>forced</b> in history.
        </p>

        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-label text-[var(--text-secondary)]">Action</label>
            <div className="grid grid-cols-1 gap-2">
              {OVERRIDE_ACTIONS.map((a) => (
                <label key={a.key} className={`flex items-start gap-2 p-2 rounded border cursor-pointer ${action === a.key ? 'border-[var(--accent)] bg-[var(--accent-muted)]' : 'border-[var(--stroke)] hover:bg-[var(--card-hover)]'}`}>
                  <input type="radio" name="override-action" value={a.key} checked={action === a.key} onChange={() => setAction(a.key)} className="mt-1" />
                  <span>
                    <span className="block text-sm font-medium text-[var(--text-primary)]">{a.label}</span>
                    <span className="block text-[11px] text-[var(--text-muted)]">{a.help}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {action === 'route' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-label text-[var(--text-secondary)]">Route to team</label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full rounded-input border border-[var(--stroke)] bg-[var(--card-bg-opaque)] px-4 py-2.5 text-body text-[var(--text-primary)]"
              >
                <option value="">— Select a team —</option>
                {teams
                  .filter((t) => t.is_active !== false && String(t.id || t._key) !== String(currentTeamId ?? ''))
                  .map((t) => (
                    <option key={t.id || t._key} value={t.id || t._key}>{t.name}</option>
                  ))}
              </select>
            </div>
          )}

          {action === 'status' && (
            <Input label="Legacy status value" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="e.g. Completed" />
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-label text-[var(--text-secondary)]">Comment {action === 'reject' && <span className="text-[var(--error)]">*</span>}</label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-input border border-[var(--stroke)] bg-[var(--card-bg-opaque)] px-4 py-2.5 text-body text-[var(--text-primary)]"
              placeholder="Optional context, unless rejecting…"
            />
          </div>

          <Input
            label="Admin reason (audit) *"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is an override necessary?"
          />

          {allowAttachments && (
            <ApprovalAttachmentsPicker value={files} onChange={setFiles} disabled={busy} />
          )}

          {error && <p className="text-sm text-[var(--error)] flex items-center gap-1.5"><FiAlertTriangle /> {error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button disabled={busy || !reason.trim()} icon={<FiShield />} onClick={submit}>
            {busy ? 'Applying…' : 'Apply override'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
