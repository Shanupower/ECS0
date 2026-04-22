import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiCheckCircle, FiClock, FiRefreshCw, FiShield, FiSearch, FiAlertCircle, FiExternalLink, FiUser } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { useAppConfig } from '../context/AppConfigContext'
import { api } from '../api'
import { Card, Button, Badge, Input, EmptyState, Skeleton } from '../components/ui'

/**
 * Queue of receipt-approval tasks pending on teams the user belongs to.
 *
 * Backed by /api/tasks, which is role-scoped (admin = all, manager = branch,
 * employee = assignee/assigned_by/watcher). That broader scope can surface
 * approval tasks on teams the user isn't on (e.g. the creator still matches
 * `assigned_by_id` on intake's task). So we additionally filter client-side
 * to tasks whose `team_id` belongs to the user's own teams. Admins can flip
 * the toggle to triage every team.
 */
export default function ApprovalsQueuePage() {
  const { token, user } = useAuth()
  const cfg = useAppConfig()
  const navigate = useNavigate()
  const approvalFlagOn = !!cfg?.feature_flags?.receipts_approval_v2
  const isAdmin = user?.role === 'admin'

  const [tasks, setTasks] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showAllTeams, setShowAllTeams] = useState(false)

  const load = async () => {
    if (!token) return
    setLoading(true); setError('')
    try {
      const [tRes, teamsList] = await Promise.all([
        api.listTasks(token, { limit: '500', page: '1', archived: 'false' }),
        api.listTeams(token).catch(() => [])
      ])
      const items = Array.isArray(tRes?.items) ? tRes.items : (Array.isArray(tRes) ? tRes : [])
      setTasks(items)
      setTeams(Array.isArray(teamsList) ? teamsList : [])
    } catch (err) {
      setError(err.message || 'Failed to load approvals queue')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() /* eslint-disable-next-line */ }, [token])

  const myId = user?.id ?? user?._key ?? user?.sub ?? null
  const myEmp = user?.emp_code ?? null
  const isAssignedToMe = (t) =>
    (myId != null && String(t.assignee_id) === String(myId)) ||
    (myEmp && t.assignee_emp_code && t.assignee_emp_code === myEmp)

  // Teams the current user belongs to (as lead or member). Used to restrict
  // the queue to approvals on the user's own teams.
  const myTeamIds = useMemo(() => {
    if (myId == null) return new Set()
    const ids = new Set()
    for (const t of teams) {
      const memberIds = Array.isArray(t.member_ids)
        ? t.member_ids
        : (Array.isArray(t.members) ? t.members.map(m => m?.id) : [])
      const lead = t.lead_user_id ?? t.lead?.id ?? null
      const teamKey = String(t.id || t._key)
      if (memberIds.some(mid => String(mid) === String(myId))) ids.add(teamKey)
      else if (lead != null && String(lead) === String(myId)) ids.add(teamKey)
    }
    return ids
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams, myId])

  const filtered = useMemo(() => {
    const openStatuses = new Set(['backlog', 'todo', 'in_progress', 'in_review', 'blocked'])
    let list = tasks.filter((t) => t.kind === 'receipt_approval' && openStatuses.has(t.status))
    // Scope to the user's teams unless an admin has opted into the cross-team view.
    if (!(isAdmin && showAllTeams)) {
      list = list.filter(t => t.team_id && myTeamIds.has(String(t.team_id)))
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((t) =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.receipt_id?.toLowerCase().includes(q)
      )
    }
    // Sort: ones assigned to me first (you're the lead → primary responsible),
    // then by due date, then newest first.
    return list.sort((a, b) => {
      const ma = isAssignedToMe(a) ? 0 : 1
      const mb = isAssignedToMe(b) ? 0 : 1
      if (ma !== mb) return ma - mb
      const da = a.due_date ? new Date(a.due_date).getTime() : Infinity
      const db = b.due_date ? new Date(b.due_date).getTime() : Infinity
      if (da !== db) return da - db
      return (b.created_at || '').localeCompare(a.created_at || '')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, search, myId, myEmp, myTeamIds, isAdmin, showAllTeams])

  const teamById = useMemo(() => {
    const map = {}
    for (const t of teams) map[String(t.id || t._key)] = t
    return map
  }, [teams])

  if (!approvalFlagOn) {
    return (
      <div className="max-w-3xl mx-auto">
        <EmptyState
          icon={<FiShield className="mx-auto h-12 w-12" />}
          title="Approval workflow is disabled"
          message="Ask an administrator to configure the intake team and enable the feature flag in System Settings."
          primaryAction={<Button variant="secondary" onClick={() => navigate('/settings')}>Open system settings</Button>}
        />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <FiCheckCircle /> Approvals queue
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<FiRefreshCw />} onClick={load}>Refresh</Button>
        </div>
      </div>

      <Card padding="sm" className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-input border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-body text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
            placeholder="Search by receipt, title, or notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isAdmin && (
          <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] shrink-0 cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-[var(--accent)]"
              checked={showAllTeams}
              onChange={(e) => setShowAllTeams(e.target.checked)}
            />
            Show all teams (admin)
          </label>
        )}
        <span className="text-xs text-[var(--text-secondary)]">
          {isAdmin && showAllTeams
            ? 'Showing every open approval across all teams — items assigned to you are listed first.'
            : 'Every open approval on teams you belong to — items assigned to you are listed first.'}
        </span>
      </Card>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-card border border-[var(--error)]/40 bg-[var(--error)]/10 text-[var(--error)] text-sm">
          <FiAlertCircle /> {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-card" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FiCheckCircle className="mx-auto h-12 w-12" />}
          title="All caught up"
          message={isAdmin && showAllTeams
            ? 'No open approvals on any team right now.'
            : 'No open approvals on any team you belong to.'}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const team = task.team_id ? teamById[String(task.team_id)] : null
            const overdue = task.due_date && new Date(task.due_date).getTime() < Date.now()
            const mine = isAssignedToMe(task)
            return (
              <Card key={task._key || task.id} padding="md" className="flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-[var(--card-hover)] transition-colors cursor-pointer"
                onClick={() => task.receipt_id && navigate(`/receipts/${task.receipt_id}`)}
                role="button"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-[var(--text-primary)] truncate">{task.title || `Approval task ${task._key}`}</h3>
                    {team && <Badge value="open" label={team.name} />}
                    {mine && <Badge value="resolved" label={<span className="inline-flex items-center gap-1"><FiUser className="w-3 h-3" /> Assigned to you</span>} />}
                    {overdue && <Badge value="in_progress" label="Overdue" />}
                  </div>
                  {task.description && <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{task.description}</p>}
                  <div className="text-xs text-[var(--text-secondary)] mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                    {task.due_date && <span className="flex items-center gap-1"><FiClock /> Due {new Date(task.due_date).toLocaleDateString()}</span>}
                    {task.receipt_id && <span>Receipt: <b className="text-[var(--text-primary)]">{task.receipt_id}</b></span>}
                    {task.branch && <span>Branch: <b className="text-[var(--text-primary)]">{task.branch}</b></span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {task.receipt_id && (
                    <Link
                      to={`/receipts/${task.receipt_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
                    >
                      Open receipt <FiExternalLink />
                    </Link>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
