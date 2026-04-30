import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  FiTarget, FiChevronDown, FiChevronUp, FiTrash2, FiUserCheck, FiArrowRightCircle,
  FiAlertCircle, FiTrendingUp, FiCalendar, FiAlertTriangle, FiInbox
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { useAppConfig } from '../context/AppConfigContext'
import LeadCard from './leads/LeadCard'
import LeadDrawer from './leads/LeadDrawer'
import LeadsToolbar from './leads/LeadsToolbar'
import LostReasonModal from './leads/LostReasonModal'
import {
  CLOSED_STAGES,
  DEFAULT_STAGES,
  daysSinceWon,
  daysSinceLost,
  formatValue,
  hasOverdueFollowUp,
  isFollowUpToday,
  isStale,
  weightedPipelineValue
} from './leads/utils'

const DEFAULT_FILTERS = {
  search: '',
  owner: '',
  source: '',
  branch: '',
  staleOnly: false,
  showClosed: true,
  showArchived: false
}

const STAGE_TONES = {
  New: { bar: 'bg-slate-400', dot: 'bg-slate-400' },
  Contacted: { bar: 'bg-sky-500', dot: 'bg-sky-500' },
  'Meeting Scheduled': { bar: 'bg-violet-500', dot: 'bg-violet-500' },
  Met: { bar: 'bg-indigo-500', dot: 'bg-indigo-500' },
  'Proposal Sent': { bar: 'bg-amber-500', dot: 'bg-amber-500' },
  Won: { bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  Lost: { bar: 'bg-rose-500', dot: 'bg-rose-500' },
  _default: { bar: 'bg-[var(--stroke)]', dot: 'bg-[var(--text-muted)]' }
}

function readFiltersFromUrl(params) {
  return {
    search: params.get('q') || '',
    owner: params.get('owner') || '',
    source: params.get('source') || '',
    branch: params.get('branch') || '',
    staleOnly: params.get('stale') === '1',
    showClosed: params.get('closed') !== '0',
    showArchived: params.get('archived') === '1'
  }
}

function writeFiltersToParams(current, filters) {
  const next = new URLSearchParams(current)
  const setOrDelete = (key, value) => {
    if (value) next.set(key, value)
    else next.delete(key)
  }
  setOrDelete('q', filters.search)
  setOrDelete('owner', filters.owner)
  setOrDelete('source', filters.source)
  setOrDelete('branch', filters.branch)
  setOrDelete('stale', filters.staleOnly ? '1' : '')
  setOrDelete('closed', filters.showClosed ? '' : '0')
  setOrDelete('archived', filters.showArchived ? '1' : '')
  return next
}

export default function LeadsPage() {
  const { token, user } = useAuth()
  const cfg = useAppConfig()
  const [searchParams, setSearchParams] = useSearchParams()

  const stages = (cfg.lead_stages && cfg.lead_stages.length) ? cfg.lead_stages : DEFAULT_STAGES
  const openStages = useMemo(() => stages.filter((s) => !CLOSED_STAGES.has(s)), [stages])
  const closedStages = useMemo(() => stages.filter((s) => CLOSED_STAGES.has(s)), [stages])

  const [filters, setFilters] = useState(() => ({ ...DEFAULT_FILTERS, ...readFiltersFromUrl(searchParams) }))
  const [leads, setLeads] = useState([])
  const [assignableUsers, setAssignableUsers] = useState([])
  const [branchOptions, setBranchOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [drawerState, setDrawerState] = useState({ open: false, mode: 'edit', lead: null, initialTab: 'details' })
  const [closedCollapsed, setClosedCollapsed] = useState(true)
  const [lostReasonTarget, setLostReasonTarget] = useState(null) // { lead, rollback: () => void }
  const [draggingId, setDraggingId] = useState(null)
  const [dragOverStage, setDragOverStage] = useState(null)
  const lastAnchorRef = useRef(null)

  const isAdmin = user?.role === 'admin'
  const isManager = user?.role === 'manager'
  const showOwnerFilter = isAdmin || isManager

  // Push filter changes to the URL for sharability.
  useEffect(() => {
    const next = writeFiltersToParams(searchParams, filters)
    setSearchParams(next, { replace: true })
  }, [filters]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadLeads = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const query = { page: '1', limit: '500' }
      if (filters.owner) query.assignee_id = filters.owner
      if (filters.source) query.source = filters.source
      if (filters.search) query.search = filters.search
      if (filters.showArchived) query.include_archived = '1'
      if (filters.branch && isAdmin) query.branch_code = filters.branch
      const res = await api.listLeads(token, query)
      setLeads(Array.isArray(res?.items) ? res.items : [])
    } catch (err) {
      setError(err.message || 'Failed to load leads')
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [token, filters, isAdmin])

  useEffect(() => { loadLeads() }, [loadLeads])

  useEffect(() => {
    if (!token) return
    api.listAssignableUsers(token).then((list) => {
      setAssignableUsers(Array.isArray(list) ? list : [])
    }).catch(() => setAssignableUsers([]))
    if (isAdmin) {
      api.getGlobalBranchStats(token).then((res) => {
        const rows = Array.isArray(res?.branches) ? res.branches : []
        setBranchOptions(rows.map((b) => ({ value: b.branch_code || b.code || b.branch_name, label: b.branch_name || b.name || b.branch_code })))
      }).catch(() => setBranchOptions([]))
    }
  }, [token, isAdmin])

  const ownerLookup = useMemo(() => {
    const m = new Map()
    for (const u of assignableUsers) {
      const id = u.id || u._key
      if (id) m.set(id, u)
      if (u.emp_code) m.set(u.emp_code, u)
    }
    return m
  }, [assignableUsers])

  const labelForOwner = (lead) => {
    const u = ownerLookup.get(lead.assigned_to_id) || ownerLookup.get(lead.assigned_to_emp_code)
    if (!u) return lead.assigned_to_emp_code || ''
    return `${u.name || u.emp_code}${u.emp_code ? ` (${u.emp_code})` : ''}`
  }

  // Apply client-side filters beyond what the server handles (stale, showClosed is about which columns to show).
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (filters.staleOnly && !isStale(lead, cfg.lead_stale_threshold_days)) return false
      return true
    })
  }, [leads, filters.staleOnly, cfg.lead_stale_threshold_days])

  const byStage = useMemo(() => {
    const map = {}
    for (const s of stages) map[s] = []
    for (const lead of filteredLeads) {
      if (map[lead.stage]) map[lead.stage].push(lead)
    }
    return map
  }, [filteredLeads, stages])

  const summary = useMemo(() => {
    const active = filteredLeads.filter((l) => !CLOSED_STAGES.has(l.stage))
    const stale = active.filter((l) => isStale(l, cfg.lead_stale_threshold_days)).length
    const followUpsToday = active.filter((l) => isFollowUpToday(l)).length
    const followUpsOverdue = active.filter((l) => hasOverdueFollowUp(l)).length
    const noNextAction = active.filter((l) => !l.next_follow_up_at).length
    const weighted = weightedPipelineValue(active, cfg.lead_stage_probabilities)
    return { activeCount: active.length, stale, followUpsToday, followUpsOverdue, noNextAction, weighted }
  }, [filteredLeads, cfg])

  const selectedList = useMemo(() => filteredLeads.filter((l) => selectedIds.has(l._key)), [filteredLeads, selectedIds])

  // --- Selection handling (single / shift-range / toggle) ---
  const handleSelect = (lead, mode) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (mode === 'shift' && lastAnchorRef.current) {
        const flat = filteredLeads.map((l) => l._key)
        const fromIdx = flat.indexOf(lastAnchorRef.current)
        const toIdx = flat.indexOf(lead._key)
        if (fromIdx >= 0 && toIdx >= 0) {
          const [a, b] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx]
          for (let i = a; i <= b; i++) next.add(flat[i])
        } else {
          next.add(lead._key)
        }
      } else {
        if (next.has(lead._key)) next.delete(lead._key)
        else next.add(lead._key)
        lastAnchorRef.current = lead._key
      }
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  // --- Drawer open helpers ---
  const openCreateDrawer = () => setDrawerState({ open: true, mode: 'create', lead: null, initialTab: 'details' })
  const openEditDrawer = (lead, initialTab = 'details') => setDrawerState({ open: true, mode: 'edit', lead, initialTab })
  const closeDrawer = () => setDrawerState({ open: false, mode: 'edit', lead: null, initialTab: 'details' })

  const onCreated = (lead) => {
    setLeads((prev) => [lead, ...prev])
    closeDrawer()
  }
  const applyLeadUpdate = (updated) => {
    if (!updated) return
    setLeads((prev) => prev.map((l) => (l._key === updated._key ? { ...l, ...updated } : l)))
    setDrawerState((prev) => (prev.open && prev.lead?._key === updated._key ? { ...prev, lead: { ...prev.lead, ...updated } } : prev))
  }
  const onDeleted = (lead) => setLeads((prev) => prev.filter((l) => l._key !== lead._key))
  const onConverted = (result) => {
    if (result?.lead) applyLeadUpdate(result.lead)
    loadLeads()
  }

  // --- Drag and drop between stage columns ---
  const handleDragStart = (e, lead) => {
    setDraggingId(lead._key)
    try {
      e.dataTransfer.setData('text/plain', lead._key)
      e.dataTransfer.effectAllowed = 'move'
    } catch {}
  }
  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverStage(null)
  }
  const handleColumnDragOver = (e, stage) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverStage !== stage) setDragOverStage(stage)
  }
  const handleColumnDrop = (e, nextStage) => {
    e.preventDefault()
    const id = (() => {
      try { return e.dataTransfer.getData('text/plain') } catch { return null }
    })() || draggingId
    setDraggingId(null)
    setDragOverStage(null)
    if (!id) return
    const lead = leads.find((l) => l._key === id)
    if (!lead || lead.stage === nextStage) return
    moveLeadToStage(lead, nextStage)
  }

  const moveLeadToStage = async (lead, nextStage) => {
    const prevStage = lead.stage
    if (nextStage === 'Lost') {
      setLostReasonTarget({ lead, nextStage })
      return
    }
    // Optimistic update
    applyLeadUpdate({ _key: lead._key, stage: nextStage })
    try {
      const updated = await api.updateLead(token, lead._key, { stage: nextStage })
      applyLeadUpdate(updated)
      if (nextStage === 'Won' && !updated.converted_to_customer_id) {
        // Auto-open the drawer on the Convert tab to force an explicit decision.
        openEditDrawer(updated, 'convert')
      }
    } catch (err) {
      // Rollback on error
      applyLeadUpdate({ _key: lead._key, stage: prevStage })
      alert(err.message || 'Failed to move lead')
    }
  }

  const confirmLostReason = async (reason) => {
    if (!lostReasonTarget) return
    const { lead, nextStage } = lostReasonTarget
    const prevStage = lead.stage
    setLostReasonTarget(null)
    applyLeadUpdate({ _key: lead._key, stage: nextStage, lost_reason: reason })
    try {
      const updated = await api.updateLead(token, lead._key, { stage: nextStage, lost_reason: reason })
      applyLeadUpdate(updated)
    } catch (err) {
      applyLeadUpdate({ _key: lead._key, stage: prevStage })
      alert(err.message || 'Failed to mark as lost')
    }
  }

  // --- Bulk actions ---
  const bulkReassign = async (userId) => {
    if (!userId || selectedList.length === 0) return
    const branches = new Set(selectedList.map((l) => l.branch).filter(Boolean))
    if (branches.size > 1 && !confirm(`Reassign across ${branches.size} branches? (${[...branches].join(', ')})`)) return
    await Promise.all(selectedList.map((l) => api.updateLead(token, l._key, { assigned_to_id: userId })))
    await loadLeads()
    clearSelection()
  }
  const bulkStage = async (stage) => {
    if (!stage || selectedList.length === 0) return
    if (stage === 'Lost') {
      alert('Use drag-to-Lost to capture a reason per lead.')
      return
    }
    await Promise.all(selectedList.map((l) => api.updateLead(token, l._key, { stage })))
    await loadLeads()
    clearSelection()
  }
  const bulkDelete = async () => {
    if (selectedList.length === 0) return
    if (!confirm(`Delete ${selectedList.length} lead(s)? This cannot be undone.`)) return
    await Promise.all(selectedList.map((l) => api.deleteLead(token, l._key).catch(() => {})))
    await loadLeads()
    clearSelection()
  }

  const showBranchPill = isAdmin && !filters.branch

  const renderColumn = (stage) => {
    const column = byStage[stage] || []
    const wonExpiry = cfg.lead_won_archive_days || 14
    const lostExpiry = cfg.lead_lost_archive_days || 60
    const total = column.reduce((sum, l) => sum + (Number(l.value || l.expected_value || 0) || 0), 0)
    const isDragOver = dragOverStage === stage
    const tone = STAGE_TONES[stage] || STAGE_TONES._default

    const footer =
      stage === 'Won' ? `Auto-archives in ${wonExpiry}d if not converted`
      : stage === 'Lost' ? `Auto-archives in ${lostExpiry}d`
      : null

    return (
      <div
        key={stage}
        onDragOver={(e) => handleColumnDragOver(e, stage)}
        onDrop={(e) => handleColumnDrop(e, stage)}
        className={`group relative flex flex-col min-h-[220px] rounded-xl border bg-[var(--card-bg)] overflow-hidden transition-all ${
          isDragOver ? 'ring-2 ring-[var(--accent)] border-[var(--accent)]' : 'border-[var(--stroke)]'
        }`}
      >
        <div className={`h-1 w-full ${tone.bar}`} />
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
            <h3 className="font-semibold text-[var(--text-primary)] text-sm truncate">{stage}</h3>
            <span className="text-[11px] font-medium text-[var(--text-muted)] tabular-nums bg-[var(--card-hover)] rounded-full px-1.5 min-w-[1.25rem] text-center">
              {column.length}
            </span>
          </div>
          {total > 0 && (
            <span className="text-[11px] font-medium text-[var(--text-muted)] tabular-nums">
              {formatValue(total)}
            </span>
          )}
        </div>
        <ul className="px-2 pb-2 space-y-1.5 flex-1">
          {column.length === 0 ? (
            <li className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-9 h-9 rounded-full bg-[var(--card-hover)] flex items-center justify-center mb-2">
                <FiInbox className="w-4 h-4 text-[var(--text-muted)]" />
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">No leads here</p>
            </li>
          ) : (
            column.map((lead) => (
              <li key={lead._key}>
                <LeadCard
                  lead={lead}
                  ownerLabel={labelForOwner(lead)}
                  showBranchPill={showBranchPill}
                  staleThresholdDays={cfg.lead_stale_threshold_days}
                  wonArchiveDays={cfg.lead_won_archive_days}
                  lostArchiveDays={cfg.lead_lost_archive_days}
                  selected={selectedIds.has(lead._key)}
                  dimOthers={selectedIds.size > 0 && !selectedIds.has(lead._key)}
                  onOpen={(l) => openEditDrawer(l)}
                  onSelect={handleSelect}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  draggable
                />
              </li>
            ))
          )}
        </ul>
        {footer && (
          <div className="px-3 py-1.5 text-[10px] text-[var(--text-muted)] bg-[var(--card-hover)]/50 border-t border-[var(--stroke)]/60">
            {footer}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-600/10 text-red-600 dark:text-red-400">
              <FiTarget className="w-5 h-5" />
            </span>
            Leads
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1 ml-[2.9rem]">
            {summary.activeCount} active · drag between stages · shift-click for bulk actions
          </p>
        </div>
      </div>

      <LeadsToolbar
        filters={filters}
        onChange={setFilters}
        onCreate={openCreateDrawer}
        onRefresh={loadLeads}
        loading={loading}
        sources={cfg.lead_sources || []}
        owners={assignableUsers}
        showOwnerFilter={showOwnerFilter}
        showBranchPicker={isAdmin}
        branches={branchOptions}
        userSub={user?.sub}
      />

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <StatPill
          label="Active"
          value={summary.activeCount}
          dot="bg-[var(--text-muted)]"
          icon={<FiTarget className="w-3.5 h-3.5" />}
        />
        <StatPill
          label="Stale"
          value={summary.stale}
          dot="bg-amber-500"
          tone={summary.stale > 0 ? 'amber' : null}
          icon={<FiAlertTriangle className="w-3.5 h-3.5" />}
        />
        <StatPill
          label="Overdue"
          value={summary.followUpsOverdue}
          dot="bg-rose-500"
          tone={summary.followUpsOverdue > 0 ? 'rose' : null}
          icon={<FiAlertCircle className="w-3.5 h-3.5" />}
        />
        <StatPill
          label="Due today"
          value={summary.followUpsToday}
          dot="bg-sky-500"
          icon={<FiCalendar className="w-3.5 h-3.5" />}
        />
        <StatPill
          label="No next action"
          value={summary.noNextAction}
          dot="bg-[var(--stroke)]"
        />
        <StatPill
          label="Weighted pipeline"
          value={formatValue(summary.weighted) || '—'}
          dot="bg-emerald-500"
          icon={<FiTrendingUp className="w-3.5 h-3.5" />}
          tone="emerald"
        />
      </div>

      {error && (
        <div className="rounded-lg p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading && leads.length === 0 ? (
        <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] p-12 text-center text-[var(--text-muted)]">Loading leads…</div>
      ) : (
        <>
          {/* Open stages — horizontal scroller on narrow screens, grid on wide */}
          <div className="overflow-x-auto -mx-2 px-2 pb-2">
            <div
              className="flex gap-3 min-w-max xl:grid xl:min-w-0 xl:gap-3"
              style={{ gridTemplateColumns: `repeat(${Math.max(openStages.length, 1)}, minmax(240px, 1fr))` }}
            >
              {openStages.map((stage) => (
                <div key={stage} className="w-[280px] xl:w-auto">
                  {renderColumn(stage)}
                </div>
              ))}
            </div>
          </div>

          {/* Closed stages footer strip */}
          {filters.showClosed && closedStages.length > 0 && (
            <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] overflow-hidden">
              <button
                onClick={() => setClosedCollapsed((v) => !v)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-sm hover:bg-[var(--card-hover)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Closed</span>
                  <div className="flex items-center gap-2">
                    {closedStages.map((s) => {
                      const tone = STAGE_TONES[s] || STAGE_TONES._default
                      return (
                        <span key={s} className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                          <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                          {s} <span className="text-[var(--text-muted)] tabular-nums">{byStage[s]?.length || 0}</span>
                        </span>
                      )
                    })}
                  </div>
                </div>
                {closedCollapsed ? <FiChevronDown className="w-4 h-4 text-[var(--text-muted)]" /> : <FiChevronUp className="w-4 h-4 text-[var(--text-muted)]" />}
              </button>
              {!closedCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border-t border-[var(--stroke)]">
                  {closedStages.map((stage) => renderColumn(stage))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Bulk action bar */}
      {selectedList.length > 0 && (
        <BulkActionBar
          count={selectedList.length}
          assignableUsers={assignableUsers}
          stages={openStages}
          canReassign={isAdmin || isManager}
          onReassign={bulkReassign}
          onStageChange={bulkStage}
          onDelete={bulkDelete}
          onClear={clearSelection}
        />
      )}

      {lostReasonTarget && (
        <LostReasonModal
          leadName={lostReasonTarget.lead?.name}
          reasons={cfg.lead_lost_reasons || []}
          onConfirm={confirmLostReason}
          onCancel={() => setLostReasonTarget(null)}
        />
      )}

      <LeadDrawer
        open={drawerState.open}
        mode={drawerState.mode}
        lead={drawerState.lead}
        initialTab={drawerState.initialTab}
        assignableUsers={assignableUsers}
        onClose={closeDrawer}
        onCreated={onCreated}
        onUpdated={applyLeadUpdate}
        onConverted={onConverted}
        onDeleted={onDeleted}
        onReactivated={applyLeadUpdate}
      />
    </div>
  )
}

function StatPill({ label, value, dot, icon, tone = null }) {
  const toneCls =
    tone === 'amber' ? 'border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-900/10'
    : tone === 'rose' ? 'border-rose-200 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-900/10'
    : tone === 'emerald' ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-900/10'
    : 'border-[var(--stroke)] bg-[var(--card-bg)]'
  return (
    <div className={`rounded-lg border px-3 py-2 flex items-center gap-2 ${toneCls}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot} flex-shrink-0`} />}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] truncate">{label}</span>
          {icon && <span className="text-[var(--text-muted)] flex-shrink-0">{icon}</span>}
        </div>
        <div className="text-lg font-semibold text-[var(--text-primary)] tabular-nums leading-tight">{value}</div>
      </div>
    </div>
  )
}

function BulkActionBar({ count, assignableUsers, stages, canReassign, onReassign, onStageChange, onDelete, onClear }) {
  const [assignTarget, setAssignTarget] = useState('')
  const [stageTarget, setStageTarget] = useState('')

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 rounded-full border border-[var(--stroke)] bg-[var(--card-bg)] shadow-xl px-4 py-2 flex items-center gap-2 flex-wrap">
      <span className="text-sm font-medium text-[var(--text-primary)]">
        {count} selected
      </span>
      {canReassign && (
        <div className="flex items-center gap-1">
          <select
            value={assignTarget}
            onChange={(e) => setAssignTarget(e.target.value)}
            className="text-sm px-2 py-1 border border-[var(--stroke)] rounded bg-[var(--card-bg-opaque)] text-[var(--text-primary)]"
          >
            <option value="">Reassign…</option>
            {assignableUsers.map((u) => (
              <option key={u.id || u._key} value={u.id || u._key}>{u.name} ({u.emp_code})</option>
            ))}
          </select>
          <button
            onClick={() => { onReassign(assignTarget); setAssignTarget('') }}
            disabled={!assignTarget}
            className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--accent)] text-white rounded text-xs disabled:opacity-50"
          >
            <FiUserCheck className="w-3 h-3" /> Go
          </button>
        </div>
      )}
      <div className="flex items-center gap-1">
        <select
          value={stageTarget}
          onChange={(e) => setStageTarget(e.target.value)}
          className="text-sm px-2 py-1 border border-[var(--stroke)] rounded bg-[var(--card-bg-opaque)] text-[var(--text-primary)]"
        >
          <option value="">Move stage…</option>
          {stages.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={() => { onStageChange(stageTarget); setStageTarget('') }}
          disabled={!stageTarget}
          className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--accent)] text-white rounded text-xs disabled:opacity-50"
        >
          <FiArrowRightCircle className="w-3 h-3" /> Go
        </button>
      </div>
      <button
        onClick={onDelete}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
      >
        <FiTrash2 className="w-3 h-3" /> Delete
      </button>
      <button onClick={onClear} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1">
        Clear
      </button>
    </div>
  )
}
