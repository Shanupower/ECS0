import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FiX, FiSave, FiTrash2, FiRotateCcw, FiUserCheck } from 'react-icons/fi'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useAppConfig } from '../../context/AppConfigContext'
import LeadActivityComposer from './LeadActivityComposer'
import LeadActivityFeed from './LeadActivityFeed'
import RelatedTasks from '../tasks/RelatedTasks'

const TABS = [
  { id: 'details', label: 'Details' },
  { id: 'activity', label: 'Activity' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'convert', label: 'Convert' }
]

/**
 * Unified drawer for create/edit/convert + activity. Controlled by parent.
 * - `mode`: 'create' | 'edit'
 * - When opened from "dragged to Won", parent passes initialTab='convert' to force the Convert tab.
 */
export default function LeadDrawer({
  open,
  mode = 'edit',
  lead,
  initialTab = 'details',
  assignableUsers = [],
  onClose,
  onCreated,
  onUpdated,
  onConverted,
  onDeleted,
  onReactivated
}) {
  const { token } = useAuth()
  const cfg = useAppConfig()
  const [tab, setTab] = useState(initialTab)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activities, setActivities] = useState([])
  const [loadingActivity, setLoadingActivity] = useState(false)

  const blankForm = useMemo(() => ({
    name: '',
    contact_phone: '',
    contact_email: '',
    stage: 'New',
    notes: '',
    assigned_to_id: '',
    source: '',
    value: '',
    next_follow_up_at: '',
    tags: []
  }), [])

  const [form, setForm] = useState(blankForm)
  const [convertPayload, setConvertPayload] = useState({ name: '', pan: '', email: '', mobile: '' })

  // Sync form state whenever the provided lead changes.
  useEffect(() => {
    if (mode === 'edit' && lead) {
      setForm({
        name: lead.name || '',
        contact_phone: lead.contact_phone || '',
        contact_email: lead.contact_email || '',
        stage: lead.stage || 'New',
        notes: lead.notes || '',
        assigned_to_id: lead.assigned_to_id || '',
        source: lead.source || '',
        value: lead.value ?? lead.expected_value ?? '',
        next_follow_up_at: (lead.next_follow_up_at || '').slice(0, 10),
        tags: Array.isArray(lead.tags) ? lead.tags : []
      })
      setConvertPayload({
        name: lead.name || '',
        pan: '',
        email: lead.contact_email || '',
        mobile: lead.contact_phone || ''
      })
    } else if (mode === 'create') {
      setForm(blankForm)
      setConvertPayload({ name: '', pan: '', email: '', mobile: '' })
    }
  }, [lead, mode, blankForm])

  useEffect(() => {
    if (open) setTab(initialTab || 'details')
  }, [open, lead?._key, initialTab])

  // Load activity when the drawer opens or tab switches to activity.
  const refreshActivity = useCallback(async () => {
    if (!token || !lead?._key) return
    setLoadingActivity(true)
    try {
      const res = await api.listLeadActivities(token, lead._key)
      setActivities(Array.isArray(res?.items) ? res.items : [])
    } catch {
      setActivities([])
    } finally {
      setLoadingActivity(false)
    }
  }, [token, lead?._key])

  useEffect(() => {
    if (open && mode === 'edit' && lead?._key && tab === 'activity') refreshActivity()
  }, [open, mode, lead?._key, tab, refreshActivity])

  if (!open) return null

  const isCreate = mode === 'create'
  const archived = !!lead?.archived_at
  const isLost = lead?.stage === 'Lost'

  const toggleTag = (tag) => {
    setForm((prev) => {
      const has = prev.tags.includes(tag)
      return { ...prev, tags: has ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag] }
    })
  }

  const save = async () => {
    if (!token || !form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        contact_phone: form.contact_phone.trim() || null,
        contact_email: form.contact_email.trim() || null,
        notes: form.notes.trim() || null,
        assigned_to_id: form.assigned_to_id || undefined,
        source: form.source.trim() || null,
        value: form.value === '' ? null : Number(form.value),
        next_follow_up_at: form.next_follow_up_at || null,
        tags: form.tags
      }
      if (isCreate) {
        payload.stage = form.stage
        const created = await api.createLead(token, payload)
        onCreated && onCreated(created)
      } else {
        // Do not let the drawer change stage; the board + DnD own stage transitions.
        const updated = await api.updateLead(token, lead._key, payload)
        onUpdated && onUpdated(updated)
      }
    } catch (err) {
      alert(err.message || 'Failed to save lead')
    } finally {
      setSaving(false)
    }
  }

  const submitActivity = async (activity) => {
    if (!token || !lead?._key) return
    try {
      await api.createLeadActivity(token, lead._key, activity)
      await refreshActivity()
      if (activity.next_follow_up_at) {
        setForm((prev) => ({ ...prev, next_follow_up_at: activity.next_follow_up_at }))
        onUpdated && onUpdated({ ...lead, next_follow_up_at: activity.next_follow_up_at })
      }
    } catch (err) {
      alert(err.message || 'Failed to log activity')
    }
  }

  const convert = async () => {
    if (!token || !lead?._key) return
    setSaving(true)
    try {
      const result = await api.convertLeadToCustomer(token, lead._key, { customer: convertPayload })
      onConverted && onConverted(result)
      onClose && onClose()
    } catch (err) {
      alert(err.message || 'Failed to convert lead')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!token || !lead?._key) return
    if (!confirm('Delete this lead? This cannot be undone.')) return
    setDeleting(true)
    try {
      await api.deleteLead(token, lead._key)
      onDeleted && onDeleted(lead)
      onClose && onClose()
    } catch (err) {
      alert(err.message || 'Failed to delete lead')
    } finally {
      setDeleting(false)
    }
  }

  const handleReactivate = async () => {
    if (!token || !lead?._key) return
    setSaving(true)
    try {
      const updated = await api.reactivateLead(token, lead._key)
      onReactivated && onReactivated(updated)
      setTab('details')
    } catch (err) {
      alert(err.message || 'Failed to reactivate')
    } finally {
      setSaving(false)
    }
  }

  const availableTags = Array.from(new Set([...(cfg.lead_tags || []), ...(form.tags || [])]))

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <aside className="relative ml-auto w-full max-w-xl bg-[var(--card-bg)] border-l border-[var(--stroke)] shadow-xl flex flex-col">
        <header className="flex items-center justify-between px-5 py-3 border-b border-[var(--stroke)]">
          <div className="min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] truncate">
              {isCreate ? 'New lead' : (lead?.name || 'Lead')}
            </h3>
            {!isCreate && lead?.stage && (
              <p className="text-xs text-[var(--text-muted)]">
                {lead.stage}{archived ? ' · archived' : ''}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--card-hover)]" aria-label="Close">
            <FiX className="w-5 h-5" />
          </button>
        </header>

        {!isCreate && (
          <nav className="flex items-center border-b border-[var(--stroke)] px-3">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                  tab === t.id
                    ? 'border-[var(--accent)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {(isCreate || tab === 'details') && (
            <div className="space-y-3">
              <Field label="Name" required>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-sm text-[var(--text-primary)]"
                  required
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Phone">
                  <input
                    value={form.contact_phone}
                    onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-sm text-[var(--text-primary)]"
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-sm text-[var(--text-primary)]"
                  />
                </Field>
                <Field label="Source">
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-sm text-[var(--text-primary)]"
                  >
                    <option value="">—</option>
                    {(cfg.lead_sources || []).map((src) => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Value (₹)">
                  <input
                    type="number"
                    min="0"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-sm text-[var(--text-primary)]"
                  />
                </Field>
                <Field label="Next follow-up">
                  <input
                    type="date"
                    value={form.next_follow_up_at}
                    onChange={(e) => setForm({ ...form, next_follow_up_at: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-sm text-[var(--text-primary)]"
                  />
                </Field>
                <Field label="Owner">
                  <select
                    value={form.assigned_to_id}
                    onChange={(e) => setForm({ ...form, assigned_to_id: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-sm text-[var(--text-primary)]"
                  >
                    <option value="">—</option>
                    {assignableUsers.map((u) => (
                      <option key={u.id || u._key} value={u.id || u._key}>{u.name} ({u.emp_code})</option>
                    ))}
                  </select>
                </Field>
                {isCreate && (
                  <Field label="Stage">
                    <select
                      value={form.stage}
                      onChange={(e) => setForm({ ...form, stage: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-sm text-[var(--text-primary)]"
                    >
                      {(cfg.lead_stages || []).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>
              <Field label="Tags">
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map((tag) => {
                    const active = form.tags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-xs px-2 py-1 rounded-full border ${
                          active
                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                            : 'border-[var(--stroke)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </Field>
              <Field label="Notes">
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-sm text-[var(--text-primary)]"
                />
              </Field>
              {!isCreate && isLost && (
                <Field label="Lost reason">
                  <input
                    value={lead?.lost_reason || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-hover)] text-sm text-[var(--text-secondary)]"
                  />
                </Field>
              )}
            </div>
          )}

          {!isCreate && tab === 'activity' && (
            <div className="space-y-3">
              <LeadActivityComposer
                onSubmit={submitActivity}
                saving={saving}
                defaultFollowUp={form.next_follow_up_at}
              />
              <LeadActivityFeed items={activities} loading={loadingActivity} />
            </div>
          )}

          {!isCreate && tab === 'tasks' && lead?._key && (
            <div className="space-y-3">
              <RelatedTasks
                entityType="lead"
                entityId={lead._key}
                title="Tasks linked to this lead"
              />
            </div>
          )}

          {!isCreate && tab === 'convert' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] p-3 text-sm text-[var(--text-secondary)]">
                Convert &quot;{lead?.name}&quot; into a customer. Required details will be validated. You can finish filling the profile in Customer Management later.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Name" required>
                  <input
                    value={convertPayload.name}
                    onChange={(e) => setConvertPayload({ ...convertPayload, name: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-sm text-[var(--text-primary)]"
                  />
                </Field>
                <Field label="PAN">
                  <input
                    value={convertPayload.pan}
                    onChange={(e) => setConvertPayload({ ...convertPayload, pan: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-sm text-[var(--text-primary)]"
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={convertPayload.email}
                    onChange={(e) => setConvertPayload({ ...convertPayload, email: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-sm text-[var(--text-primary)]"
                  />
                </Field>
                <Field label="Mobile">
                  <input
                    value={convertPayload.mobile}
                    onChange={(e) => setConvertPayload({ ...convertPayload, mobile: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-sm text-[var(--text-primary)]"
                  />
                </Field>
              </div>
              <button
                onClick={convert}
                disabled={saving || !convertPayload.name.trim() || !!lead?.converted_to_customer_id}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <FiUserCheck className="w-4 h-4" />
                {lead?.converted_to_customer_id ? 'Already converted' : (saving ? 'Converting…' : 'Convert to customer')}
              </button>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 px-5 py-3 border-t border-[var(--stroke)]">
          <div className="flex items-center gap-2">
            {!isCreate && isLost && (
              <button
                onClick={handleReactivate}
                disabled={saving || archived}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[var(--stroke)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--card-hover)] disabled:opacity-50"
              >
                <FiRotateCcw className="w-3.5 h-3.5" />
                Reactivate
              </button>
            )}
            {!isCreate && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
              >
                <FiTrash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
          </div>
          {(isCreate || tab === 'details') && (
            <button
              onClick={save}
              disabled={saving || !form.name.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              <FiSave className="w-4 h-4" />
              {saving ? 'Saving…' : (isCreate ? 'Create lead' : 'Save changes')}
            </button>
          )}
        </footer>
      </aside>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  )
}
