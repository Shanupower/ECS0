import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FiSettings, FiSave, FiRefreshCw, FiAlertCircle, FiCheck, FiPlus, FiX, FiLoader, FiAlertTriangle } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { useAppConfig, useAppConfigActions, APP_CONFIG_DEFAULTS } from '../context/AppConfigContext'
import { api } from '../api'
import { canAccessSystemSettings } from '../constants/system-settings-access.js'

function normaliseList(raw) {
  return String(raw || '')
    .split(/\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean)
}

function validStages(list) {
  if (!Array.isArray(list) || list.length < 2) return false
  return list.includes('Won') && list.includes('Lost')
}

export default function SystemSettingsPage() {
  const { user, token } = useAuth()
  const cfg = useAppConfig()
  const { update, reload, loading } = useAppConfigActions()

  const canEdit = canAccessSystemSettings(user)
  const isAdmin = user?.role === 'admin'

  const [draft, setDraft] = useState(cfg)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  // Receipt-migration modal state. `migration.patch` is the intake-config
  // patch to send to the backend; while it's set the modal is open and Save
  // is disabled until the migration completes / is dismissed.
  const [migration, setMigration] = useState(null) // { patch } | null

  // Mirror live config into draft when loaded.
  useEffect(() => { setDraft(cfg) }, [cfg])

  const probabilityEntries = useMemo(() => {
    const stages = draft.lead_stages || []
    return stages.map((s) => ({ stage: s, value: draft.lead_stage_probabilities?.[s] ?? APP_CONFIG_DEFAULTS.lead_stage_probabilities[s] ?? 0 }))
  }, [draft])

  if (!canEdit) {
    return (
      <div className="max-w-3xl mx-auto p-6 rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--text-secondary)]">
        You don&apos;t have permission to view system settings.
      </div>
    )
  }

  const setList = (key) => (raw) => setDraft({ ...draft, [key]: normaliseList(raw) })
  const setNumber = (key, min, max) => (raw) => {
    let n = Number(raw)
    if (!Number.isFinite(n)) n = APP_CONFIG_DEFAULTS[key]
    if (min != null) n = Math.max(min, n)
    if (max != null) n = Math.min(max, n)
    setDraft({ ...draft, [key]: n })
  }
  const setProbability = (stage, raw) => {
    let n = Number(raw)
    if (!Number.isFinite(n)) n = 0
    n = Math.max(0, Math.min(1, n))
    setDraft({
      ...draft,
      lead_stage_probabilities: { ...(draft.lead_stage_probabilities || {}), [stage]: n }
    })
  }
  const setTierCadence = (tier, raw) => {
    let n = Number(raw)
    if (!Number.isFinite(n)) n = 12
    n = Math.max(1, Math.min(60, n))
    setDraft({
      ...draft,
      review_tier_cadence_months: { ...(draft.review_tier_cadence_months || {}), [tier]: n }
    })
  }

  const save = async () => {
    setError(''); setSuccess('')
    if (!validStages(draft.lead_stages)) {
      setError('Lead stages must include "Won" and "Lost" and have at least 2 entries.')
      return
    }
    // Snapshot intake config from the *previous* live cfg before the update,
    // so we can decide whether to offer a receipt-migration after save succeeds.
    const prevIntake = {
      receipt_intake_team_id: cfg.receipt_intake_team_id || null,
      receipt_intake_non_online_team_id: cfg.receipt_intake_non_online_team_id || null,
      receipt_intake_teams_by_category: normalizeIntakeMap(cfg.receipt_intake_teams_by_category)
    }
    setSaving(true)
    try {
      await update(draft)
      setSuccess('Settings saved. Changes take effect for all users.')
      setTimeout(() => setSuccess(''), 4000)

      const nextIntake = {
        receipt_intake_team_id: draft.receipt_intake_team_id || null,
        receipt_intake_non_online_team_id: draft.receipt_intake_non_online_team_id || null,
        receipt_intake_teams_by_category: normalizeIntakeMap(draft.receipt_intake_teams_by_category)
      }
      if (isAdmin && hasIntakeChanged(prevIntake, nextIntake)) {
        setMigration({
          patch: {
            receipt_intake_team_id: nextIntake.receipt_intake_team_id,
            receipt_intake_non_online_team_id: nextIntake.receipt_intake_non_online_team_id,
            receipt_intake_teams_by_category: nextIntake.receipt_intake_teams_by_category
          }
        })
      }
    } catch (err) {
      setError(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const resetDefaults = () => {
    if (!confirm('Reset all system settings to defaults? This affects every user.')) return
    setDraft(APP_CONFIG_DEFAULTS)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <FiSettings className="w-7 h-7 text-red-600 dark:text-red-400" />
          System settings
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={reload} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--stroke)] rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--card-hover)] disabled:opacity-50">
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Reload
          </button>
          <button onClick={resetDefaults} className="px-3 py-2 text-sm text-[var(--text-secondary)] border border-[var(--stroke)] rounded-lg hover:bg-[var(--card-hover)]">
            Reset to defaults
          </button>
          <button onClick={save} disabled={saving || !!migration} className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
            <FiSave className="w-4 h-4" />
            {saving ? 'Saving…' : migration ? 'Migration in progress…' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <FiAlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm flex items-center gap-2">
          <FiCheck className="w-4 h-4" /> {success}
        </div>
      )}

      <Section title="Leads — pipeline">
        <TagEditor
          label="Stages (ordered)"
          value={draft.lead_stages || []}
          onChange={(list) => {
            // Always keep at least Won and Lost present at the end.
            const cleaned = list.filter(Boolean)
            if (!cleaned.includes('Won')) cleaned.push('Won')
            if (!cleaned.includes('Lost')) cleaned.push('Lost')
            setDraft({ ...draft, lead_stages: cleaned })
          }}
          help="Comma or newline separated. Must include Won and Lost."
        />

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Stage probabilities (0–1)</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {probabilityEntries.map(({ stage, value }) => (
              <div key={stage} className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-secondary)] flex-1 truncate" title={stage}>{stage}</span>
                <input
                  type="number" min="0" max="1" step="0.05"
                  value={value}
                  onChange={(e) => setProbability(stage, e.target.value)}
                  className="w-20 px-2 py-1 border border-[var(--stroke)] rounded bg-[var(--card-bg-opaque)] text-sm text-[var(--text-primary)]"
                />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Used to compute weighted pipeline value on the Leads page.</p>
        </div>
      </Section>

      <Section title="Leads — taxonomy">
        <TagEditor label="Sources" value={draft.lead_sources || []} onChange={(list) => setDraft({ ...draft, lead_sources: list })} />
        <TagEditor label="Lost reasons" value={draft.lead_lost_reasons || []} onChange={(list) => setDraft({ ...draft, lead_lost_reasons: list })} />
        <TagEditor label="Tags" value={draft.lead_tags || []} onChange={(list) => setDraft({ ...draft, lead_tags: list })} />
      </Section>

      <Section title="Leads — lifecycle">
        <NumberField label="Stale threshold (days)" value={draft.lead_stale_threshold_days} min={1} max={90} onChange={setNumber('lead_stale_threshold_days', 1, 90)} help="Cards with no activity for this long are flagged as stale." />
        <NumberField label="Won auto-archive (days)" value={draft.lead_won_archive_days} min={1} max={365} onChange={setNumber('lead_won_archive_days', 1, 365)} help="Converted-won leads archive after this many days." />
        <NumberField label="Lost auto-archive (days)" value={draft.lead_lost_archive_days} min={1} max={365} onChange={setNumber('lead_lost_archive_days', 1, 365)} help="Lost leads archive after this many days." />
      </Section>

      <Section title="Portfolio review — tier cadences">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {['A', 'B', 'C'].map((t) => (
            <NumberField
              key={t}
              label={`Tier ${t} (months)`}
              value={(draft.review_tier_cadence_months || {})[t] ?? 12}
              min={1} max={60}
              onChange={(v) => setTierCadence(t, v)}
            />
          ))}
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-1">Default cadence used when marking a customer reviewed if they have no explicit cadence.</p>
      </Section>

      <Section title="Tasks — labels">
        <ObjectListEditor
          value={draft.task_labels || []}
          onChange={(list) => setDraft({ ...draft, task_labels: list })}
          columns={[
            { key: 'key', label: 'Key', placeholder: 'urgent' },
            { key: 'label', label: 'Label', placeholder: 'Urgent' },
            { key: 'color', label: 'Color', placeholder: 'rose' }
          ]}
          emptyRow={{ key: '', label: '', color: 'slate' }}
          idField="key"
          help="Labels available to tag tasks. Colors: slate, blue, emerald, amber, rose, violet."
        />
      </Section>

      <Section title="Tasks — SLA tiers">
        <ObjectListEditor
          value={draft.task_sla_tiers || []}
          onChange={(list) => setDraft({ ...draft, task_sla_tiers: list })}
          columns={[
            { key: 'key', label: 'Key', placeholder: 'sla_same_day' },
            { key: 'label', label: 'Label', placeholder: 'Same day' },
            { key: 'warn_hours', label: 'Warn (h)', type: 'number' },
            { key: 'escalate_hours', label: 'Escalate (h)', type: 'number' },
            { key: 'escalate_to', label: 'Escalate to', placeholder: 'manager' }
          ]}
          emptyRow={{ key: '', label: '', warn_hours: 4, escalate_hours: 8, escalate_to: 'manager', notify_channels: ['in_app'] }}
          idField="key"
          help="Breach = hours since created_at when task still isn't done. Sweep runs every 15 minutes."
        />
      </Section>

      <Section title="Tasks — default view">
        <label className="block">
          <span className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Default view on /tasks</span>
          <select
            value={draft.task_default_view || 'list'}
            onChange={(e) => setDraft({ ...draft, task_default_view: e.target.value })}
            className="w-full max-w-xs px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-sm text-[var(--text-primary)]"
          >
            <option value="list">List</option>
            <option value="kanban">Kanban</option>
            <option value="calendar">Calendar</option>
          </select>
        </label>
      </Section>

      <Section title="Tasks — Autopilot (event → task rules)">
        <EventRulesEditor
          rules={draft.task_event_rules || []}
          onChange={(next) => setDraft({ ...draft, task_event_rules: next })}
          slaTiers={draft.task_sla_tiers || []}
          priorities={draft.task_priorities || []}
        />
      </Section>

      <Section title="Receipt approvals (v2)">
        <ReceiptApprovalSection draft={draft} setDraft={setDraft} />
      </Section>

      {migration && (
        <ReceiptMigrationModal
          token={token}
          patch={migration.patch}
          onClose={() => { setMigration(null); reload() }}
        />
      )}
    </div>
  )
}

// Compare two normalized intake-config snapshots and return true if anything
// the migration cares about (default team or per-category map) actually changed.
function hasIntakeChanged(a, b) {
  if (!a || !b) return false
  if ((a.receipt_intake_team_id || null) !== (b.receipt_intake_team_id || null)) return true
  if ((a.receipt_intake_non_online_team_id || null) !== (b.receipt_intake_non_online_team_id || null)) return true
  const am = a.receipt_intake_teams_by_category || {}
  const bm = b.receipt_intake_teams_by_category || {}
  const keys = new Set([...Object.keys(am), ...Object.keys(bm)])
  for (const k of keys) {
    if ((am[k] || null) !== (bm[k] || null)) return true
  }
  return false
}

// Strip blank/null values and uppercase keys so equality checks ignore noise
// like trimmed whitespace or a category being toggled to "" then "" again.
function normalizeIntakeMap(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const [k, v] of Object.entries(raw)) {
    const id = v == null ? '' : String(v).trim()
    if (id) out[String(k).trim().toUpperCase()] = id
  }
  return out
}

const INTAKE_PRODUCT_ROWS = [
  { key: 'MF', label: 'Mutual Funds' },
  { key: 'FD', label: 'Fixed Deposit' },
  { key: 'GOVT_FD', label: 'Government Schemes' },
  { key: 'INS', label: 'Insurance' },
  { key: 'BOND', label: 'Bonds' },
  { key: 'NCD', label: 'NCD' },
  { key: 'MISC', label: 'Misc Services' }
]

function ReceiptApprovalSection({ draft, setDraft }) {
  const { token } = useAuth()
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    api.listTeams(token)
      .then((list) => { if (!cancelled) setTeams(Array.isArray(list) ? list : []) })
      .catch(() => { if (!cancelled) setTeams([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token])

  const flags = draft.feature_flags || {}
  const flagOn = !!flags.receipts_approval_v2
  const intakeId = draft.receipt_intake_team_id || ''
  const nonOnlineId = draft.receipt_intake_non_online_team_id || ''
  const byCat = draft.receipt_intake_teams_by_category && typeof draft.receipt_intake_teams_by_category === 'object'
    ? draft.receipt_intake_teams_by_category
    : {}
  const activeTeams = teams.filter((t) => t.is_active !== false)
  const intakeTeamObj = teams.find((t) => String(t.id || t._key) === String(intakeId))
  const intakeValid = !!intakeTeamObj && intakeTeamObj.is_active !== false
  const nonOnlineTeamObj = teams.find((t) => String(t.id || t._key) === String(nonOnlineId))
  const nonOnlineValid = !nonOnlineId || (!!nonOnlineTeamObj && nonOnlineTeamObj.is_active !== false)
  const anyCategoryMapped = INTAKE_PRODUCT_ROWS.some(({ key: k }) => {
    const v = byCat[k]
    return v != null && String(v).trim() !== ''
  })
  const canEnableWorkflow = intakeValid || anyCategoryMapped

  const setCategoryTeam = (catKey, teamIdRaw) => {
    const teamId = teamIdRaw || null
    const next = { ...byCat }
    if (teamId) next[catKey] = teamId
    else delete next[catKey]
    setDraft({ ...draft, receipt_intake_teams_by_category: next })
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--text-secondary)]">Default intake team (fallback)</label>
        <select
          value={intakeId}
          onChange={(e) => setDraft({ ...draft, receipt_intake_team_id: e.target.value || null })}
          className="w-full max-w-md px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-sm text-[var(--text-primary)]"
        >
          <option value="">— None —</option>
          {activeTeams.map((t) => (
            <option key={t.id || t._key} value={t.id || t._key}>{t.name}</option>
          ))}
          {/* Include the currently-set team even if inactive, so it's still visible */}
          {intakeId && !activeTeams.some((t) => String(t.id || t._key) === String(intakeId)) && (
            <option value={intakeId}>{(intakeTeamObj && intakeTeamObj.name) || intakeId} (inactive)</option>
          )}
        </select>
        <p className="text-[11px] text-[var(--text-muted)]">
          Used when a product category has no dedicated team below, and as a safety fallback. With auto-routing on create, set this and/or per-product teams.
          {loading ? ' Loading teams…' : teams.length === 0 ? ' No teams yet — create one in the Teams page.' : ''}
        </p>
      </div>

      <div className="flex flex-col gap-1.5 mt-3">
        <label className="text-xs font-medium text-[var(--text-secondary)]">Offline/Others intake team (override)</label>
        <select
          value={nonOnlineId}
          onChange={(e) => setDraft({ ...draft, receipt_intake_non_online_team_id: e.target.value || null })}
          className="w-full max-w-md px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-sm text-[var(--text-primary)]"
        >
          <option value="">Default fallback</option>
          {activeTeams.map((t) => (
            <option key={`nononline-${t.id || t._key}`} value={t.id || t._key}>{t.name}</option>
          ))}
          {nonOnlineId && !activeTeams.some((t) => String(t.id || t._key) === String(nonOnlineId)) && (
            <option value={nonOnlineId}>{(nonOnlineTeamObj && nonOnlineTeamObj.name) || nonOnlineId} (inactive)</option>
          )}
        </select>
        <p className="text-[11px] text-[var(--text-muted)]">
          If a receipt&apos;s payment entry mode is <b>Offline</b> or <b>Others</b>, it will start here regardless of product category.
          {!nonOnlineValid ? ' Pick an active team (or clear to use default intake).' : ''}
        </p>
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <span className="text-xs font-medium text-[var(--text-secondary)]">Intake by product category (optional)</span>
        <p className="text-[11px] text-[var(--text-muted)] max-w-2xl">
          Map each receipt type to its first approval team. Unmapped categories use the default intake team. NCD falls back to BOND&apos;s team in the engine if NCD is unset.
        </p>
        <div className="overflow-x-auto rounded-lg border border-[var(--stroke)] max-w-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--stroke)] bg-[var(--card-hover)]/50 text-left text-[11px] text-[var(--text-secondary)]">
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Team</th>
              </tr>
            </thead>
            <tbody>
              {INTAKE_PRODUCT_ROWS.map(({ key, label }) => (
                <tr key={key} className="border-b border-[var(--stroke)]/60 last:border-0">
                  <td className="px-3 py-2 text-[var(--text-primary)] whitespace-nowrap">{label} <span className="text-[var(--text-muted)]">({key})</span></td>
                  <td className="px-3 py-2">
                    <select
                      value={byCat[key] || ''}
                      onChange={(e) => setCategoryTeam(key, e.target.value)}
                      className="w-full min-w-[12rem] px-2 py-1.5 border border-[var(--stroke)] rounded-md bg-[var(--card-bg-opaque)] text-[var(--text-primary)] text-xs"
                    >
                      <option value="">Default fallback</option>
                      {activeTeams.map((t) => (
                        <option key={`${key}-${t.id || t._key}`} value={t.id || t._key}>{t.name}</option>
                      ))}
                      {byCat[key] && !activeTeams.some((t) => String(t.id || t._key) === String(byCat[key])) && (
                        <option value={byCat[key]}>{byCat[key]} (inactive)</option>
                      )}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-3">
        <label className="text-xs font-medium text-[var(--text-secondary)]">Final-status label</label>
        <input
          type="text"
          value={draft.receipt_final_status_label || 'Completed'}
          onChange={(e) => setDraft({ ...draft, receipt_final_status_label: e.target.value })}
          className="w-full max-w-md px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-sm text-[var(--text-primary)]"
          placeholder="Completed"
        />
        <p className="text-[11px] text-[var(--text-muted)]">Label used on a receipt once all teams have approved it.</p>
      </div>

      <div className="mt-4 p-3 rounded-lg border border-[var(--stroke)] bg-[var(--card-hover)]/40">
        <label className="flex items-start gap-3 select-none">
          <input
            type="checkbox"
            checked={flagOn}
            disabled={!flagOn && !canEnableWorkflow}
            onChange={(e) => setDraft({ ...draft, feature_flags: { ...flags, receipts_approval_v2: e.target.checked } })}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-medium text-[var(--text-primary)]">
              Enable team-based receipt approval workflow
            </span>
            <span className="block text-[11px] text-[var(--text-muted)] mt-0.5">
              When on, new receipts are auto-submitted to the intake team for their product category (or default). Receipts move through configured teams before completion and an <b>approval task</b> is created for each stage.
              Admins keep the legacy status override (now behind an “Admin override” disclosure on the receipt).
            </span>
            {!flagOn && !canEnableWorkflow && (
              <span className="block text-[11px] text-[var(--error)] mt-1">
                Set a valid default intake team or map at least one product category to a team.
              </span>
            )}
          </span>
        </label>
      </div>
    </>
  )
}

function ObjectListEditor({ value = [], onChange, columns, emptyRow, idField, help }) {
  const update = (i, k, v) => {
    const next = value.slice()
    next[i] = { ...next[i], [k]: v }
    onChange(next)
  }
  const addRow = () => onChange([...(value || []), { ...(emptyRow || {}) }])
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[var(--text-muted)]">
              {columns.map((c) => (
                <th key={c.key} className="py-1 pr-2 font-normal">{c.label}</th>
              ))}
              <th className="py-1 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {(value || []).map((row, i) => (
              <tr key={(idField && row[idField]) || i} className="border-t border-[var(--stroke)]">
                {columns.map((c) => (
                  <td key={c.key} className="py-1 pr-2">
                    <input
                      type={c.type || 'text'}
                      value={row[c.key] ?? ''}
                      placeholder={c.placeholder || ''}
                      onChange={(e) => update(i, c.key, c.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
                      className="w-full px-2 py-1 border border-[var(--stroke)] rounded bg-[var(--card-bg-opaque)] text-xs text-[var(--text-primary)]"
                    />
                  </td>
                ))}
                <td className="py-1">
                  <button onClick={() => remove(i)} className="text-[var(--text-muted)] hover:text-red-600" aria-label="Remove">
                    <FiX className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <button onClick={addRow} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-[var(--stroke)] hover:bg-[var(--card-hover)] text-[var(--text-primary)]">
          <FiPlus className="w-3 h-3" /> Add row
        </button>
        {help && <span className="text-[11px] text-[var(--text-muted)]">{help}</span>}
      </div>
    </div>
  )
}

const EVENT_OPTIONS = [
  { value: 'lead.created',               label: 'Lead · Created' },
  { value: 'lead.stage_changed',         label: 'Lead · Stage changed' },
  { value: 'lead.won',                   label: 'Lead · Won' },
  { value: 'lead.lost',                  label: 'Lead · Lost' },
  { value: 'customer.created',           label: 'Customer · Created' },
  { value: 'portfolio_review.completed', label: 'Portfolio review · Completed' },
  { value: 'receipt.created',            label: 'Receipt · Created' },
  { value: 'task.created',               label: 'Task · Created' },
  { value: 'task.updated',               label: 'Task · Updated' },
  { value: 'task.completed',             label: 'Task · Completed' },
  { value: 'task.sla.breached',          label: 'Task · SLA breached' }
]

function EventRulesEditor({ rules, onChange, slaTiers, priorities }) {
  const update = (i, patch) => {
    const next = rules.slice()
    next[i] = { ...next[i], ...patch }
    onChange(next)
  }
  const updateTemplate = (i, patch) => update(i, { template: { ...(rules[i]?.template || {}), ...patch } })
  const addRule = () => onChange([...(rules || []), {
    key: `rule_${Date.now()}`,
    event: 'lead.created',
    enabled: false,
    label: 'New rule',
    assignee_strategy: 'event.assignee_id',
    priority: 'p2',
    sla_tier: null,
    conditions: [],
    template: { title: 'New task', due_in_hours: 24 }
  }])
  const remove = (i) => onChange(rules.filter((_, idx) => idx !== i))

  if (!rules.length) {
    return (
      <div className="space-y-3">
        <AiRuleDraft onCreate={(rule) => onChange([...(rules || []), rule])} />
        <div className="text-sm text-[var(--text-muted)] py-4 text-center border border-dashed border-[var(--stroke)] rounded-lg">
          No automation rules configured.
          <button onClick={addRule} className="ml-2 underline hover:text-[var(--text-primary)]">Add one</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <AiRuleDraft onCreate={(rule) => onChange([...(rules || []), rule])} />
      {rules.map((r, i) => (
        <details key={r.key || i} className="rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] overflow-hidden group" open={!r.enabled}>
          <summary className="flex items-center gap-3 px-3 py-2 cursor-pointer select-none list-none">
            <label className="flex items-center gap-2 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
              <input type="checkbox" checked={!!r.enabled} onChange={(e) => update(i, { enabled: e.target.checked })} className="h-4 w-4" />
              <span className={`text-sm truncate ${r.enabled ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{r.label || r.key}</span>
            </label>
            <span className="text-[11px] text-[var(--text-muted)] truncate max-w-[200px]">on <code className="text-[10px] px-1 rounded bg-[var(--card-hover)]">{r.event}</code></span>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(i) }} className="text-[var(--text-muted)] hover:text-red-600" aria-label="Delete rule">
              <FiX className="w-4 h-4" />
            </button>
          </summary>
          <div className="px-3 py-3 border-t border-[var(--stroke)] grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Key (stable id)">
              <input className="rule-input" value={r.key || ''} onChange={(e) => update(i, { key: e.target.value })} />
            </Field>
            <Field label="Label">
              <input className="rule-input" value={r.label || ''} onChange={(e) => update(i, { label: e.target.value })} />
            </Field>
            <Field label="Trigger event">
              <select className="rule-input" value={r.event || ''} onChange={(e) => update(i, { event: e.target.value })}>
                {EVENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Assignee strategy">
              <select className="rule-input" value={r.assignee_strategy || 'event.assignee_id'} onChange={(e) => update(i, { assignee_strategy: e.target.value })}>
                <option value="event.assignee_id">Event assignee</option>
                <option value="event.actor_id">Event actor</option>
                <option value="branch_manager">Branch manager</option>
                <option value="round_robin">Round-robin (branch)</option>
                <option value="fixed">Fixed user (set assignee_id)</option>
              </select>
            </Field>
            {r.assignee_strategy === 'fixed' && (
              <Field label="Fixed assignee id or emp_code">
                <input className="rule-input" value={r.assignee_id || ''} onChange={(e) => update(i, { assignee_id: e.target.value })} />
              </Field>
            )}
            <Field label="Priority">
              <select className="rule-input" value={r.priority || 'p2'} onChange={(e) => update(i, { priority: e.target.value })}>
                {(priorities?.length ? priorities : [{ key: 'p0', label: 'Urgent' }, { key: 'p1', label: 'High' }, { key: 'p2', label: 'Normal' }, { key: 'p3', label: 'Low' }]).map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </Field>
            <Field label="SLA tier">
              <select className="rule-input" value={r.sla_tier || ''} onChange={(e) => update(i, { sla_tier: e.target.value || null })}>
                <option value="">None</option>
                {(slaTiers || []).map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Task title template">
              <input className="rule-input" value={r.template?.title || ''} onChange={(e) => updateTemplate(i, { title: e.target.value })} placeholder="Call {{payload.lead_id}}" />
            </Field>
            <Field label="Due in hours (optional)">
              <input type="number" className="rule-input" value={r.template?.due_in_hours ?? ''} onChange={(e) => updateTemplate(i, { due_in_hours: e.target.value === '' ? null : Number(e.target.value) })} />
            </Field>
            <Field label="Due in days (optional)">
              <input type="number" className="rule-input" value={r.template?.due_in_days ?? ''} onChange={(e) => updateTemplate(i, { due_in_days: e.target.value === '' ? null : Number(e.target.value) })} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Description template (optional)">
                <textarea className="rule-input min-h-[60px]" value={r.template?.description || ''} onChange={(e) => updateTemplate(i, { description: e.target.value })} />
              </Field>
            </div>
          </div>
        </details>
      ))}
      <button onClick={addRule} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-[var(--stroke)] hover:bg-[var(--card-hover)] text-[var(--text-primary)]">
        <FiPlus className="w-3 h-3" /> Add rule
      </button>
      <style>{`
        .rule-input {
          width: 100%;
          padding: 6px 10px;
          border: 1px solid var(--stroke);
          border-radius: 6px;
          background: var(--card-bg-opaque);
          color: var(--text-primary);
          font-size: 12px;
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">{label}</span>
      {children}
    </label>
  )
}

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] p-4 shadow-sm space-y-3">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function NumberField({ label, value, min, max, onChange, help }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-sm text-[var(--text-primary)]"
      />
      {help && <span className="block text-[11px] text-[var(--text-muted)] mt-1">{help}</span>}
    </label>
  )
}

function TagEditor({ label, value = [], onChange, help }) {
  const [input, setInput] = useState('')
  const add = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    if (value.includes(trimmed)) { setInput(''); return }
    onChange([...value, trimmed])
    setInput('')
  }
  const remove = (tag) => onChange(value.filter((t) => t !== tag))

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add()
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{label}</label>
      <div className="flex flex-wrap items-center gap-1.5 p-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)]">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--card-hover)] text-xs text-[var(--text-primary)]">
            {tag}
            <button onClick={() => remove(tag)} className="text-[var(--text-muted)] hover:text-red-600" aria-label={`Remove ${tag}`}>
              <FiX className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add then press Enter"
          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent text-[var(--text-primary)]"
        />
        <button
          onClick={add}
          disabled={!input.trim()}
          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-[var(--accent)] text-white rounded-full disabled:opacity-50"
        >
          <FiPlus className="w-3 h-3" /> Add
        </button>
      </div>
      {help && <span className="block text-[11px] text-[var(--text-muted)] mt-1">{help}</span>}
    </div>
  )
}

function AiRuleDraft({ onCreate }) {
  const { token } = useAuth()
  const [prompt, setPrompt] = useState('')
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    if (!prompt.trim()) return
    setBusy(true)
    setError('')
    try {
      const r = await api.aiSuggestRule(token, prompt.trim())
      setDraft(r?.rule || null)
      if (!r?.rule) setError('Unable to produce a rule for that prompt.')
    } catch (err) {
      setError(err?.message || 'AI rule suggestion failed')
    } finally { setBusy(false) }
  }

  const accept = () => {
    if (!draft) return
    onCreate({ ...draft, enabled: false })
    setDraft(null)
    setPrompt('')
  }

  return (
    <div className="rounded-lg border border-dashed border-[var(--stroke)] p-3 bg-[var(--card-bg-opaque)] space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Describe a rule in plain English</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--stroke)] text-[var(--text-muted)]">AI draft</span>
      </div>
      <div className="flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') run() }}
          placeholder='e.g. "when a new lead is created, assign the branch manager a same-day call"'
          className="flex-1 text-sm px-2 py-1.5 rounded border border-[var(--stroke)] bg-[var(--card-bg-opaque)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
        <button onClick={run} disabled={busy} className="text-xs px-3 rounded bg-[var(--accent)] text-white">
          {busy ? 'Thinking…' : 'Draft rule'}
        </button>
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
      {draft && (
        <div className="text-xs bg-[var(--card-hover)] rounded p-2 space-y-1">
          <div><span className="text-[var(--text-muted)]">Event:</span> <code>{draft.event}</code></div>
          <div><span className="text-[var(--text-muted)]">Priority:</span> {draft.priority} {draft.sla_tier && <span>· SLA {draft.sla_tier}</span>}</div>
          <div><span className="text-[var(--text-muted)]">Assignee:</span> {draft.assignee_strategy}</div>
          <div><span className="text-[var(--text-muted)]">Task title:</span> {draft.template?.title}</div>
          <div>
            <span className="text-[var(--text-muted)]">Due:</span>{' '}
            {draft.template?.due_in_hours != null ? `in ${draft.template.due_in_hours}h` :
             draft.template?.due_in_days != null ? `in ${draft.template.due_in_days}d` : '—'}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button onClick={accept} className="text-xs px-2 py-1 rounded bg-[var(--accent)] text-white">Add to rules (disabled)</button>
            <button onClick={() => setDraft(null)} className="text-xs px-2 py-1 rounded border border-[var(--stroke)]">Discard</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Receipt-migration modal
//
// Lifecycle:
//   phase = 'preview'  -> fetches preview, shows summary, "Migrate now" / "Cancel"
//   phase = 'running'  -> POSTs run, polls /run/:jobId every 2s, shows progress
//   phase = 'done'     -> shows final summary, "OK" closes the modal
//   phase = 'error'    -> shows error + "Close" / "Retry" (preview re-fetch)
//
// Closing while running is allowed (the backend job keeps running) — we just
// stop polling and reset state. Re-opening is not auto-attempted because
// app-config has already been saved at this point.
// ---------------------------------------------------------------------------
function ReceiptMigrationModal({ token, patch, onClose }) {
  const [phase, setPhase] = useState('preview') // 'preview' | 'running' | 'done' | 'error'
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [options, setOptions] = useState({
    filter_entry_mode: 'all',
    include_draft: true,
    include_needs_changes: true,
    include_in_flight_intake_stage: true
  })
  const [reason, setReason] = useState('')

  // Initial preview fetch.
  useEffect(() => {
    let cancelled = false
    setPhase('preview')
    setError('')
    setBusy(true)
    api.migrateReceiptIntake(token, { dry_run: true, ...options })
      .then((p) => { if (!cancelled) setPreview(p) })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || 'Failed to load preview')
        setPhase('error')
      })
      .finally(() => { if (!cancelled) setBusy(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshPreview = async () => {
    setBusy(true); setError('')
    try {
      const p = await api.migrateReceiptIntake(token, { dry_run: true, ...options })
      setPreview(p)
      setPhase('preview')
    } catch (err) {
      setError(err?.message || 'Failed to load preview')
      setPhase('error')
    } finally {
      setBusy(false)
    }
  }

  const runMigration = async () => {
    setBusy(true); setError('')
    try {
      setPhase('running')
      const result = await api.migrateReceiptIntake(token, { dry_run: false, reason, ...options })
      setPreview(result)
      setPhase('done')
    } catch (err) {
      const detail = err?.detail || err?.message || 'Failed to start migration'
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail))
      setPhase('error')
    } finally {
      setBusy(false)
    }
  }

  const total = preview?.counts?.filtered ?? 0
  const moved = preview?.counts?.moved ?? 0
  const skipped = preview?.counts?.skipped ?? 0
  const errorCount = preview?.counts?.errors ?? 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--stroke)] shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--stroke)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            {phase === 'running' && <FiLoader className="w-4 h-4 animate-spin text-red-500" />}
            {phase === 'done' && <FiCheck className="w-4 h-4 text-emerald-500" />}
            {phase === 'error' && <FiAlertTriangle className="w-4 h-4 text-amber-500" />}
            {phase === 'preview' && 'Move existing receipts to new intake teams?'}
            {phase === 'running' && 'Re-routing receipts…'}
            {phase === 'done' && (errorCount > 0 ? 'Migration finished with errors' : 'Migration complete')}
            {phase === 'error' && 'Migration error'}
          </h3>
          <button
            onClick={onClose}
            disabled={phase === 'running' && busy}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
            aria-label="Close"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-3">
          {phase === 'preview' && (
            busy
              ? <div className="text-sm text-[var(--text-muted)]">Calculating impact…</div>
              : <PreviewSummary preview={preview} options={options} onOptionsChange={setOptions} reason={reason} onReasonChange={setReason} onRefresh={refreshPreview} />
          )}

          {phase === 'running' && (
            <div className="text-sm text-[var(--text-muted)]">Running migration…</div>
          )}

          {phase === 'done' && preview && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-[11px] text-[var(--text-secondary)]">
                <div>Moved: <b className="text-[var(--text-primary)]">{moved}</b></div>
                <div>Skipped: <b className="text-[var(--text-primary)]">{skipped}</b></div>
                <div>Errors: <b className={errorCount ? 'text-red-500' : 'text-[var(--text-primary)]'}>{errorCount}</b></div>
              </div>
              {(preview.errors?.length || 0) > 0 && (
                <div>
                  <button
                    onClick={() => setShowErrors((v) => !v)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    {showErrors ? 'Hide' : 'Show'} {preview.errors.length} failure{preview.errors.length === 1 ? '' : 's'}
                  </button>
                  {showErrors && (
                    <ul className="mt-1 text-[11px] bg-[var(--card-hover)] rounded p-2 space-y-1 max-h-40 overflow-y-auto">
                      {preview.errors.slice(0, 10).map((e, i) => (
                        <li key={`${e.id || i}-${i}`} className="text-[var(--text-secondary)]">
                          <code className="text-[var(--text-primary)]">{e.id || '—'}</code>
                          <span className="text-[var(--text-muted)]"> · {e.code}</span>
                          {e.detail && <span className="text-[var(--text-muted)]"> — {e.detail}</span>}
                        </li>
                      ))}
                      {preview.errors.length > 10 && (
                        <li className="text-[var(--text-muted)] italic">+ {preview.errors.length - 10} more (truncated)</li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {phase === 'error' && (
            <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              {error || 'Something went wrong.'}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[var(--stroke)] flex items-center justify-end gap-2">
          {phase === 'preview' && (
            <>
              <button
                onClick={onClose}
                className="text-sm px-3 py-2 rounded-lg border border-[var(--stroke)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]"
              >
                Cancel
              </button>
              <button
                onClick={runMigration}
                disabled={busy || !preview || !String(reason || '').trim() || (preview?.counts?.filtered ?? 0) === 0}
                className="text-sm px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {(preview?.counts?.filtered ?? 0) === 0 ? 'Nothing to migrate' : `Migrate ${preview?.counts?.filtered || 0} receipt${(preview?.counts?.filtered || 0) === 1 ? '' : 's'}`}
              </button>
            </>
          )}
          {phase === 'done' && (
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              OK
            </button>
          )}
          {phase === 'error' && (
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function PreviewSummary({ preview, options, onOptionsChange, reason, onReasonChange, onRefresh }) {
  const counts = preview?.counts || {}
  const errors = Array.isArray(preview?.errors) ? preview.errors : []
  const toMove = counts.filtered ?? 0

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-[var(--stroke)] bg-[var(--card-hover)]/30 p-3 space-y-2">
        <div className="text-xs font-medium text-[var(--text-secondary)]">Migration options</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="text-[11px] text-[var(--text-muted)]">
            Entry-mode filter
            <select
              value={options.filter_entry_mode}
              onChange={(e) => onOptionsChange({ ...options, filter_entry_mode: e.target.value })}
              className="mt-1 w-full px-2 py-1.5 border border-[var(--stroke)] rounded-md bg-[var(--card-bg-opaque)] text-[var(--text-primary)] text-xs"
            >
              <option value="all">All</option>
              <option value="non_online_only">Offline/Others only</option>
              <option value="online_only">Online only</option>
            </select>
          </label>
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
              <input type="checkbox" checked={!!options.include_draft} onChange={(e) => onOptionsChange({ ...options, include_draft: e.target.checked })} />
              Include Draft
            </label>
            <label className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
              <input type="checkbox" checked={!!options.include_needs_changes} onChange={(e) => onOptionsChange({ ...options, include_needs_changes: e.target.checked })} />
              Include Needs Changes
            </label>
            <label className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
              <input type="checkbox" checked={!!options.include_in_flight_intake_stage} onChange={(e) => onOptionsChange({ ...options, include_in_flight_intake_stage: e.target.checked })} />
              Include in-flight (intake stage only)
            </label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-1.5 text-xs rounded-md border border-[var(--stroke)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]"
          >
            Refresh preview
          </button>
          <span className="text-[11px] text-[var(--text-muted)]">
            In-flight migration only affects receipts currently in the intake stage.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <div className="rounded-lg bg-[var(--card-hover)] p-2">
          <div className="text-[var(--text-muted)]">Candidates</div>
          <div className="text-lg font-semibold text-[var(--text-primary)]">{counts.candidates ?? 0}</div>
        </div>
        <div className="rounded-lg bg-[var(--card-hover)] p-2">
          <div className="text-[var(--text-muted)]">Filtered</div>
          <div className="text-lg font-semibold text-[var(--text-primary)]">{toMove}</div>
        </div>
        <div className="rounded-lg bg-[var(--card-hover)] p-2">
          <div className="text-[var(--text-muted)]">Errors</div>
          <div className={`text-lg font-semibold ${errors.length ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>{errors.length}</div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--stroke)] p-3">
        <div className="text-xs font-medium text-[var(--text-secondary)]">Reason (required to run)</div>
        <input
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-sm text-[var(--text-primary)]"
          placeholder="e.g. Updated intake routing rules"
        />
      </div>

      {toMove === 0 && (
        <div className="text-xs text-[var(--text-muted)]">Nothing matches the current filters.</div>
      )}
    </div>
  )
}
