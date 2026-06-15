import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiCheckCircle, FiClock, FiRefreshCw, FiShield, FiSearch, FiAlertCircle, FiExternalLink, FiUser, FiBarChart2 } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { useAppConfig } from '../context/AppConfigContext'
import { api } from '../api'
import { Card, Button, Badge, EmptyState, Skeleton } from '../components/ui'
import { canAccessSystemSettings } from '../constants/system-settings-access.js'

function formatAmount(value) {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `₹${n.toLocaleString('en-IN')}`
}

export default function ApprovalsQueuePage() {
  const { token, user } = useAuth()
  const cfg = useAppConfig()
  const navigate = useNavigate()
  const approvalFlagOn = !!cfg?.feature_flags?.receipts_approval_v2
  const isAdmin = user?.role === 'admin'

  const [tasks, setTasks] = useState([])
  const [summary, setSummary] = useState(null)
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showAllTeams, setShowAllTeams] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const load = async () => {
    if (!token) return
    setLoading(true); setError('')
    try {
      const [queueRes, summaryRes, teamsList] = await Promise.all([
        api.getApprovalsQueue(token),
        api.getApprovalsSummary(token).catch(() => null),
        api.listTeams(token).catch(() => [])
      ])
      const items = Array.isArray(queueRes?.items) ? queueRes.items : []
      setTasks(items)
      setSummary(summaryRes)
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
    if (!(isAdmin && showAllTeams)) {
      list = list.filter(t => t.team_id && myTeamIds.has(String(t.team_id)))
    }
    if (statusFilter === 'overdue') {
      list = list.filter(t => t.due_date && new Date(t.due_date).getTime() < Date.now())
    } else if (statusFilter === 'in_review') {
      list = list.filter(t => t.status === 'in_review')
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((t) =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.receipt_id?.toLowerCase().includes(q) ||
        t.scheme_name?.toLowerCase().includes(q) ||
        t.branch_name?.toLowerCase().includes(q)
      )
    }
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
  }, [tasks, search, myId, myEmp, myTeamIds, isAdmin, showAllTeams, statusFilter])

  const teamById = useMemo(() => {
    const map = {}
    for (const t of teams) map[String(t.id || t._key)] = t
    return map
  }, [teams])

  const statusCards = summary?.status_cards || {}

  if (!approvalFlagOn) {
    const canOpenSettings = canAccessSystemSettings(user)
    return (
      <div className="max-w-3xl mx-auto">
        <EmptyState
          icon={<FiShield className="mx-auto h-12 w-12" />}
          title="Approval workflow is disabled"
          message="Ask an administrator to configure the intake team and enable the feature flag in System Settings."
          primaryAction={canOpenSettings
            ? <Button variant="secondary" onClick={() => navigate('/settings')}>Open system settings</Button>
            : undefined}
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { key: '', label: 'Pending', value: statusCards.pending_on_my_teams ?? filtered.length, tone: 'open' },
          { key: 'overdue', label: 'Overdue', value: statusCards.overdue ?? 0, tone: 'in_progress' },
          { key: 'in_review', label: 'In review', value: statusCards.in_review ?? 0, tone: 'resolved' },
          { key: 'completed', label: 'Completed (7d)', value: statusCards.completed_last_7_days ?? 0, tone: 'resolved' }
        ].map((card) => (
          <Card
            key={card.key || 'all'}
            padding="md"
            className={`cursor-pointer transition-colors ${statusFilter === card.key ? 'ring-2 ring-[var(--accent)]' : 'hover:bg-[var(--card-hover)]'}`}
            onClick={() => setStatusFilter(card.key === 'completed' ? '' : (statusFilter === card.key ? '' : card.key))}
          >
            <div className="text-xs text-[var(--text-secondary)]">{card.label}</div>
            <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">{card.value}</div>
          </Card>
        ))}
      </div>

      {Array.isArray(summary?.by_team) && summary.by_team.length > 0 && (
        <Card padding="md">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-3">
            <FiBarChart2 className="w-4 h-4" /> Team workload
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--text-secondary)] border-b border-[var(--stroke)]">
                  <th className="py-2 pr-4">Team</th>
                  <th className="py-2 pr-4">Open</th>
                  <th className="py-2 pr-4">Overdue</th>
                  <th className="py-2 pr-4">Oldest pending</th>
                  <th className="py-2">Avg age (days)</th>
                </tr>
              </thead>
              <tbody>
                {summary.by_team.map((row) => (
                  <tr key={row.team_id} className="border-b border-[var(--stroke)] last:border-0">
                    <td className="py-2 pr-4 text-[var(--text-primary)]">{row.team_name}</td>
                    <td className="py-2 pr-4">{row.open_approvals}</td>
                    <td className="py-2 pr-4">{row.overdue}</td>
                    <td className="py-2 pr-4">{row.oldest_pending ? new Date(row.oldest_pending).toLocaleDateString() : '—'}</td>
                    <td className="py-2">{row.avg_age_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card padding="sm" className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-input border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-body text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
            placeholder="Search by receipt, scheme, branch, or title…"
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-sm">
                    <div>
                      <span className="text-[var(--text-secondary)]">Scheme: </span>
                      <span className="font-medium text-[var(--text-primary)]">{task.scheme_name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-secondary)]">Amount: </span>
                      <span className="font-medium text-[var(--text-primary)]">{formatAmount(task.amount)}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-secondary)]">Branch: </span>
                      <span className="font-medium text-[var(--text-primary)]">{task.branch_name || task.branch || '—'}</span>
                    </div>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                    {task.due_date && <span className="flex items-center gap-1"><FiClock /> Due {new Date(task.due_date).toLocaleDateString()}</span>}
                    {task.receipt_id && <span>Receipt: <b className="text-[var(--text-primary)]">{task.receipt_id}</b></span>}
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
