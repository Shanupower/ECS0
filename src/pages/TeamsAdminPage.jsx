import React, { useEffect, useMemo, useState } from 'react'
import { FiUsers, FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiSearch, FiAlertCircle, FiX, FiCheck } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { useAppConfig } from '../context/AppConfigContext'
import { api } from '../api'
import { Button, Card, Badge, Input, useToast, EmptyState, Skeleton } from '../components/ui'
import MultiSelect from '../components/MultiSelect'
import SearchableSelect from '../components/SearchableSelect'

/**
 * Admin-only page to manage approval teams.
 *
 * Routes use /api/teams (see backend routes/teams.js). Read is available to
 * every authenticated user but create/update/delete require `admin`.
 */
export default function TeamsAdminPage() {
  const { token, user } = useAuth()
  const cfg = useAppConfig()
  const toast = useToast()

  const [teams, setTeams] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [editing, setEditing] = useState(null) // team object or { __new: true }
  const [busy, setBusy] = useState(false)

  const isAdmin = user?.role === 'admin'
  const intakeTeamId = cfg?.receipt_intake_team_id

  const formatUserLabel = (u, fallbackId) => {
    if (u && !u.missing) {
      const name = u.name || u.emp_code
      if (name && u.emp_code && name !== u.emp_code) return `${name} (${u.emp_code})`
      return name || `User ${u.id}`
    }
    if (u && u.missing) return `${u.id} (deleted)`
    return fallbackId ? `User ${fallbackId}` : '—'
  }

  const loadTeams = async () => {
    setLoading(true); setError('')
    try {
      const list = await api.listTeams(token, { include_inactive: includeInactive ? 1 : 0 })
      setTeams(Array.isArray(list) ? list : [])
    } catch (err) { setError(err.message || 'Failed to load teams') }
    finally { setLoading(false) }
  }

  const loadUsers = async () => {
    try {
      const list = await api.listAssignableUsers(token)
      setUsers(Array.isArray(list) ? list : [])
    } catch { /* non-fatal */ }
  }

  useEffect(() => { if (token) { loadTeams(); loadUsers() } /* eslint-disable-next-line */ }, [token, includeInactive])

  const filtered = useMemo(() => {
    if (!search.trim()) return teams
    const q = search.trim().toLowerCase()
    return teams.filter(t =>
      t.name?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.lead?.name?.toLowerCase().includes(q) ||
      t.lead?.emp_code?.toLowerCase().includes(q)
    )
  }, [teams, search])

  const userOptions = useMemo(
    () => users
      .map(u => {
        const value = u.id ?? u._key ?? u.user_id ?? u.emp_code
        return {
          label: u.name ? `${u.name}${u.emp_code ? ' (' + u.emp_code + ')' : ''}` : (u.emp_code || String(value || '')),
          value: value != null ? String(value) : ''
        }
      })
      .filter(o => o.value),
    [users]
  )

  const openCreate = () => setEditing({ __new: true, name: '', description: '', lead_user_id: '', member_ids: [], is_active: true })
  const openEdit = (team) => setEditing({ ...team, member_ids: Array.isArray(team.member_ids) ? [...team.member_ids] : [] })

  const save = async () => {
    if (!editing) return
    const payload = {
      name: (editing.name || '').trim(),
      description: editing.description || '',
      lead_user_id: editing.lead_user_id || null,
      member_ids: Array.isArray(editing.member_ids) ? editing.member_ids : [],
      ...(editing.__new ? {} : { is_active: editing.is_active !== false })
    }
    if (!payload.name) return toast.error('Name is required')
    if (!payload.lead_user_id) return toast.error('Lead is required')
    if (!payload.member_ids.includes(payload.lead_user_id)) payload.member_ids = [...payload.member_ids, payload.lead_user_id]

    setBusy(true)
    try {
      if (editing.__new) {
        await api.createTeam(token, payload)
        toast.success(`Team "${payload.name}" created`)
      } else {
        await api.updateTeam(token, editing.id || editing._key, payload)
        toast.success(`Team "${payload.name}" updated`)
      }
      setEditing(null)
      await loadTeams()
    } catch (err) {
      toast.error(err.message || 'Failed to save team')
    } finally { setBusy(false) }
  }

  const remove = async (team) => {
    if (!confirm(`Deactivate team "${team.name}"? Members lose access to new approvals but history is preserved.`)) return
    setBusy(true)
    try {
      await api.deleteTeam(token, team.id || team._key)
      toast.success('Team deactivated')
      await loadTeams()
    } catch (err) { toast.error(err.message || 'Failed to deactivate team') }
    finally { setBusy(false) }
  }

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto p-6 rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--text-secondary)]">
        You don&apos;t have permission to manage approval teams.
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <FiUsers /> Approval Teams
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<FiRefreshCw />} onClick={loadTeams}>Refresh</Button>
          <Button icon={<FiPlus />} onClick={openCreate}>New Team</Button>
        </div>
      </div>

      <p className="text-sm text-[var(--text-secondary)]">
        Teams are the actors in the receipt-approval workflow. Every approval task is assigned to the team lead and watched by its members.
        Configure the intake team and flip the feature flag in <b>System Settings → Receipt approvals</b>.
      </p>

      {/* Controls */}
      <Card padding="sm" className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-input border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-body text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
            placeholder="Search teams by name, description, or lead…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] select-none">
          <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
          Show deactivated
        </label>
      </Card>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-card border border-[var(--error)]/40 bg-[var(--error)]/10 text-[var(--error)] text-sm">
          <FiAlertCircle /> {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-card" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FiUsers className="mx-auto h-12 w-12" />}
          title={search ? 'No teams match your search' : 'No teams yet'}
          message={search ? 'Try a different query.' : 'Create your first approval team to start using the workflow.'}
          primaryAction={!search && <Button icon={<FiPlus />} onClick={openCreate}>New Team</Button>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const isIntake = intakeTeamId && String(intakeTeamId) === String(t.id || t._key)
            const isInactive = t.is_active === false
            return (
              <Card key={t.id || t._key} padding="md" className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-[var(--text-primary)] truncate">{t.name}</h3>
                    {isIntake && <Badge value="resolved" label="Intake team" />}
                    {isInactive && <Badge value="closed" label="Deactivated" />}
                  </div>
                  {t.description && <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{t.description}</p>}
                  <div className="text-xs text-[var(--text-secondary)] mt-1.5 flex flex-col gap-1">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        Lead:{' '}
                        <b className="text-[var(--text-primary)]">{formatUserLabel(t.lead, t.lead_user_id)}</b>
                      </span>
                      <span>
                        Members: <b className="text-[var(--text-primary)]">{Array.isArray(t.member_ids) ? t.member_ids.length : 0}</b>
                      </span>
                      {typeof t.open_approval_tasks === 'number' && (
                        <span>Open approvals: <b className="text-[var(--text-primary)]">{t.open_approval_tasks}</b></span>
                      )}
                    </div>
                    {Array.isArray(t.members) && t.members.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {t.members.slice(0, 8).map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[11px] text-[var(--text-primary)]"
                            title={m.emp_code || m.id}
                          >
                            {m.name || m.emp_code || m.id}{m.missing ? ' (missing)' : ''}
                          </span>
                        ))}
                        {t.members.length > 8 && (
                          <span className="text-[11px] text-[var(--text-secondary)]">+{t.members.length - 8} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="secondary" icon={<FiEdit2 />} onClick={() => openEdit(t)}>Edit</Button>
                  {!isInactive && (
                    <Button variant="ghost" icon={<FiTrash2 />} onClick={() => remove(t)}>Deactivate</Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit drawer (simple modal — Drawer requires its own integration) */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setEditing(null)}>
          <Card padding="lg" className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">{editing.__new ? 'New team' : 'Edit team'}</h2>
              <button aria-label="Close" onClick={() => !busy && setEditing(null)} className="p-1 rounded hover:bg-[var(--card-hover)]"><FiX /></button>
            </div>

            <div className="space-y-3">
              <Input
                label="Name"
                value={editing.name || ''}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. Compliance"
                autoFocus
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-[var(--text-secondary)]">Description (optional)</label>
                <textarea
                  className="w-full rounded-input border border-[var(--stroke)] bg-[var(--card-bg-opaque)] px-4 py-2.5 text-body text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                  rows={2}
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-[var(--text-secondary)]">Lead (default approval-task assignee)</label>
                <SearchableSelect
                  options={userOptions}
                  value={editing.lead_user_id || ''}
                  onChange={(v) => setEditing({ ...editing, lead_user_id: v })}
                  placeholder="Search users…"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-[var(--text-secondary)]">Members (will be added as watchers)</label>
                <MultiSelect
                  options={userOptions}
                  value={editing.member_ids || []}
                  onChange={(v) => setEditing({ ...editing, member_ids: v })}
                  placeholder="Add members…"
                />
                <p className="text-xs text-[var(--text-secondary)]">Lead is automatically included.</p>
              </div>
              {!editing.__new && (
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] select-none">
                  <input
                    type="checkbox"
                    checked={editing.is_active !== false}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  />
                  Active
                </label>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <Button variant="secondary" disabled={busy} onClick={() => setEditing(null)}>Cancel</Button>
              <Button disabled={busy} icon={<FiCheck />} onClick={save}>{busy ? 'Saving…' : 'Save'}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
