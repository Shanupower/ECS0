import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  FiCheckSquare, FiList, FiGrid, FiCalendar, FiSearch, FiPlus, FiRefreshCw,
  FiFilter, FiChevronDown, FiUser, FiFlag, FiTag, FiAlertOctagon, FiClock,
  FiHelpCircle, FiArchive, FiInbox, FiZap
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { useAppConfig } from '../context/AppConfigContext'
import { TasksProvider, useTasks } from '../context/TasksContext'
import { api } from '../api'

import StatPill from './tasks/components/StatPill'
import FilterChip from './tasks/components/FilterChip'
import Popover from './tasks/components/Popover'
import ListView from './tasks/views/ListView'
import KanbanView from './tasks/views/KanbanView'
import CalendarView from './tasks/views/CalendarView'
import TaskDrawer from './tasks/components/TaskDrawer'
import QuickAddModal from './tasks/components/QuickAddModal'
import CommandPalette from './tasks/components/CommandPalette'
import BulkActionBar from './tasks/components/BulkActionBar'
import UndoToast from './tasks/components/UndoToast'
import ShortcutHelp from './tasks/components/ShortcutHelp'
import SavedViews from './tasks/components/SavedViews'
import { isOverdue, priorityMeta, statusMeta, toneFor, COMPLETED_STATUSES } from './tasks/utils'

function TasksPageInner() {
  const { token, user } = useAuth()
  const cfg = useAppConfig()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const {
    filters, setFilter, tasks, total, stats, loading, error, reload,
    assignableUsers, createTask, updateTask, bulkUpdate, deleteTask
  } = useTasks()

  // Resolve default view lazily from config once it arrives.
  useEffect(() => {
    if (!filters.view && cfg?.task_default_view) setFilter({ view: cfg.task_default_view })
  }, [cfg, filters.view, setFilter])
  const view = filters.view || cfg?.task_default_view || 'list'

  // ----- UI-only state (not URL-synced) -----
  const [selection, setSelection] = useState(() => new Set())
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickPrefill, setQuickPrefill] = useState(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchValue, setSearchValue] = useState(filters.q || '')
  const [undoStack, setUndoStack] = useState([])
  const [activePopover, setActivePopover] = useState(null)
  const anchorRef = useRef({})
  const searchInputRef = useRef(null)
  const [branches, setBranches] = useState([])

  // Drawer: the selected taskId is URL synced so deep links work.
  const taskId = params.get('taskId') || null
  const setTaskId = useCallback((id) => {
    setParams(prev => {
      const next = new URLSearchParams(prev)
      if (id) next.set('taskId', id); else next.delete('taskId')
      return next
    }, { replace: true })
  }, [setParams])

  useEffect(() => { setSearchValue(filters.q || '') }, [filters.q])

  // Debounced text search.
  useEffect(() => {
    const id = setTimeout(() => {
      if (searchValue !== (filters.q || '')) setFilter({ q: searchValue })
    }, 250)
    return () => clearTimeout(id)
  }, [searchValue, filters.q, setFilter])

  // Load branches for admins/managers.
  useEffect(() => {
    if (!token) return
    if (!['admin', 'manager'].includes(user?.role)) return
    api.listBranches(token, { includeInactive: '0' }).then(list => {
      setBranches(Array.isArray(list) ? list : [])
    }).catch(() => setBranches([]))
  }, [token, user?.role])

  // ----- Derived stats (fallback locally if API is absent) -----
  const derived = useMemo(() => {
    if (stats) return stats
    const today = new Date().toISOString().slice(0, 10)
    const open = tasks.filter(t => !COMPLETED_STATUSES.has(t.status))
    return {
      total: tasks.length,
      open: open.length,
      due_today: open.filter(t => t.due_date === today).length,
      overdue: open.filter(t => t.due_date && t.due_date < today).length,
      unassigned: open.filter(t => !t.assignee_id).length,
      done_this_week: tasks.filter(t => t.status === 'done').length,
      sla_breached: tasks.filter(t => t.sla_breached_at).length
    }
  }, [tasks, stats])

  // ----- Selection helpers -----
  const clearSelection = () => setSelection(new Set())
  const toggleSelect = (task) => setSelection(prev => {
    const next = new Set(prev)
    if (next.has(task._key)) next.delete(task._key); else next.add(task._key)
    return next
  })
  const selectAll = () => setSelection(new Set(tasks.map(t => t._key)))

  // ----- Undo system (5s window) -----
  const pushUndo = (entry) => setUndoStack(prev => [...prev, { ...entry, id: Date.now() + Math.random() }])
  const dismissUndo = (id) => setUndoStack(prev => prev.filter(e => e.id !== id))

  // ----- Actions -----
  // Approval tasks belong to the receipt-approval workflow — open the receipt
  // so the user can Approve / Route / Reject from the action bar instead of
  // landing in the generic task drawer (which is read-mostly for approvals).
  const openDrawer = (task) => {
    if (task?.kind === 'receipt_approval' && task?.receipt_id) {
      navigate(`/receipts/${task.receipt_id}`)
      return
    }
    setTaskId(task._key)
  }
  const closeDrawer = () => setTaskId(null)

  const handleQuickAdd = (prefill) => {
    setQuickPrefill(prefill || null)
    setQuickOpen(true)
  }

  const onCreateTask = async (payload) => {
    const created = await createTask(payload)
    return created
  }

  const handleUpdateTask = async (id, patch) => {
    const before = tasks.find(t => t._key === id)
    const beforePatch = before ? Object.fromEntries(Object.keys(patch).map(k => [k, before[k]])) : null
    await updateTask(id, patch)
    if (beforePatch && (patch.status || patch.archived_at || patch.priority)) {
      pushUndo({
        message: patch.archived_at ? 'Archived task' : `Updated ${Object.keys(patch).join(', ')}`,
        undo: async () => { try { await updateTask(id, beforePatch) } catch { /* noop */ } }
      })
    }
  }

  const handleBulkUpdate = async (ids, patch) => {
    const snapshot = tasks.filter(t => ids.includes(t._key)).map(t => ({ _key: t._key, ...Object.fromEntries(Object.keys(patch).map(k => [k, t[k]])) }))
    await bulkUpdate(ids, patch)
    pushUndo({
      message: patch.archived_at ? `Archived ${ids.length} task(s)` : `Updated ${ids.length} task(s)`,
      undo: async () => {
        try {
          for (const s of snapshot) {
            const { _key, ...rest } = s
            await updateTask(_key, rest)
          }
        } catch { /* noop */ }
      }
    })
    clearSelection()
  }

  const handleBulkDelete = async (ids) => {
    const snapshot = tasks.filter(t => ids.includes(t._key))
    for (const id of ids) {
      try { await deleteTask(id) } catch { /* noop */ }
    }
    pushUndo({
      message: `Deleted ${ids.length} task(s)`,
      undo: async () => {
        for (const t of snapshot) {
          try {
            await createTask({
              title: t.title, description: t.description, priority: t.priority,
              status: t.status, assignee_id: t.assignee_id, due_date: t.due_date,
              labels: t.labels, customer_id: t.customer_id, lead_id: t.lead_id,
              receipt_id: t.receipt_id, estimate_minutes: t.estimate_minutes
            })
          } catch { /* noop */ }
        }
      }
    })
    clearSelection()
  }

  // ----- Inline popovers from list rows -----
  const openStatusPopover = (task, el) => { anchorRef.current.current = el; setActivePopover({ kind: 'status', task }) }
  const openPriorityPopover = (task, el) => { anchorRef.current.current = el; setActivePopover({ kind: 'priority', task }) }
  const openAssigneePopover = (task, el) => { anchorRef.current.current = el; setActivePopover({ kind: 'assignee', task }) }
  const openDuePopover = (task, el) => { anchorRef.current.current = el; setActivePopover({ kind: 'due', task }) }
  const closeActive = () => setActivePopover(null)

  // ----- Keyboard layer -----
  const [cursor, setCursor] = useState(-1)
  useEffect(() => {
    const onKey = (e) => {
      const editable = document.activeElement?.tagName
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(editable) || document.activeElement?.isContentEditable
      const mod = e.metaKey || e.ctrlKey

      // Global shortcuts (work while typing in main search)
      if (mod && e.key.toLowerCase() === 'k' && !e.shiftKey) { e.preventDefault(); setPaletteOpen(true); return }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'k') { e.preventDefault(); handleQuickAdd(); return }
      if (mod && e.key.toLowerCase() === 'a' && !isInput) { e.preventDefault(); selectAll(); return }
      if (e.key === 'Escape') {
        if (activePopover) { closeActive(); return }
        if (quickOpen) { setQuickOpen(false); return }
        if (paletteOpen) { setPaletteOpen(false); return }
        if (helpOpen) { setHelpOpen(false); return }
        if (selection.size) { clearSelection(); return }
        if (taskId) { closeDrawer(); return }
      }
      if (isInput) return

      // Non-input shortcuts
      if (e.key === '/') { e.preventDefault(); searchInputRef.current?.focus(); return }
      if (e.key === '?') { e.preventDefault(); setHelpOpen(v => !v); return }
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); handleQuickAdd(); return }

      if (tasks.length === 0) return
      if (e.key === 'j' || e.key === 'J') { e.preventDefault(); setCursor(i => Math.min(tasks.length - 1, Math.max(0, i + 1))); return }
      if (e.key === 'k' || e.key === 'K') { e.preventDefault(); setCursor(i => Math.max(0, i - 1)); return }
      if (e.key === 'Enter' && cursor >= 0) { e.preventDefault(); openDrawer(tasks[cursor]); return }
      if (e.key === ' ' && cursor >= 0) { e.preventDefault(); toggleSelect(tasks[cursor]); return }
      if ((e.key === 'x' || e.key === 'X') && cursor >= 0) {
        const t = tasks[cursor]; if (window.confirm(`Delete "${t.title}"?`)) deleteTask(t._key).catch(() => {})
        return
      }
      if ((e.key === 'c' || e.key === 'C') && cursor >= 0) {
        const t = tasks[cursor]; anchorRef.current.current = null; setActivePopover({ kind: 'status', task: t })
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tasks, cursor, activePopover, quickOpen, paletteOpen, helpOpen, selection, taskId, deleteTask, setTaskId])

  // ----- Header widgets -----
  const viewBtn = (key, Icon, label) => (
    <button
      key={key}
      onClick={() => setFilter({ view: key })}
      style={view === key ? { backgroundColor: 'var(--accent)', borderColor: 'var(--accent)', color: '#ffffff' } : undefined}
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border transition-colors ${
        view === key
          ? 'font-medium'
          : 'border-[var(--stroke)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]'
      }`}
      title={label}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden md:inline">{label}</span>
    </button>
  )

  // Active filter count to show a hint on Clear.
  const activeCount = useMemo(() => {
    const keys = ['status','priority','label','branch','due','sla_breached','customer','lead','receipt','q']
    return keys.reduce((n, k) => n + (filters[k] && filters[k] !== '' ? 1 : 0), 0)
  }, [filters])

  const handleApplyView = (snap) => {
    // Clear then apply stored filters.
    const cleared = {}
    for (const k of ['q','status','priority','label','assignee','branch','due','archived','sla_breached','customer','lead','receipt','view','group','sort']) cleared[k] = ''
    setFilter({ ...cleared, ...snap })
  }

  const activePopoverTask = activePopover?.task
  const popoverAnchor = anchorRef.current.current

  return (
    <div className="max-w-[1500px] mx-auto px-3 pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 pt-4 pb-3">
        <h1 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <FiCheckSquare className="w-5 h-5 text-[var(--accent)]" />
          Tasks
          <span className="text-xs font-normal text-[var(--text-muted)] ml-1">{total} total</span>
        </h1>

        <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] p-0.5">
          {viewBtn('list', FiList, 'List')}
          {viewBtn('kanban', FiGrid, 'Board')}
          {viewBtn('calendar', FiCalendar, 'Calendar')}
        </div>

        {branches.length > 0 && (
          <select
            value={filters.branch || ''}
            onChange={(e) => setFilter({ branch: e.target.value })}
            className="text-xs px-2 py-1 rounded-md border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] focus:outline-none"
          >
            <option value="">All branches</option>
            {branches.map(b => (
              <option key={b.code || b._key} value={b.code || b._key}>{b.code || b._key}</option>
            ))}
          </select>
        )}

        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 justify-end">
          <div className={`relative flex-1 min-w-[160px] max-w-md transition-all ${searchFocused ? 'sm:max-w-xl' : ''}`}>
            <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              ref={searchInputRef}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search tasks… (/)"
              className="w-full pl-7 pr-2 py-1.5 text-sm rounded-md border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
            />
          </div>

          <AiFilterButton setFilter={setFilter} />
          <SavedViews filters={filters} onApply={handleApplyView} />
          <button
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[var(--stroke)] text-xs text-[var(--text-secondary)] hover:bg-[var(--card-hover)] shrink-0"
            title="Refresh"
          >
            <FiRefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={() => setHelpOpen(true)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[var(--stroke)] text-xs text-[var(--text-secondary)] hover:bg-[var(--card-hover)] shrink-0"
            title="Shortcuts"
          >
            <FiHelpCircle className="w-3 h-3" />
          </button>
          <button
            onClick={() => handleQuickAdd()}
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-primary)' }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm shrink-0 hover:brightness-110"
          >
            <FiPlus className="w-3.5 h-3.5" /> New task
          </button>
        </div>
      </div>

      {/* Quick filter chips */}
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <FilterChip active={filters.assignee === 'me'} onClick={() => setFilter({ assignee: filters.assignee === 'me' ? 'all' : 'me' })}>
          My tasks
        </FilterChip>
        <FilterChip active={filters.due === 'today'} onClick={() => setFilter({ due: filters.due === 'today' ? '' : 'today' })} tone="amber">
          Today
        </FilterChip>
        <FilterChip active={filters.due === 'overdue'} onClick={() => setFilter({ due: filters.due === 'overdue' ? '' : 'overdue' })} tone="rose">
          Overdue
        </FilterChip>
        <FilterChip active={filters.due === 'upcoming'} onClick={() => setFilter({ due: filters.due === 'upcoming' ? '' : 'upcoming' })}>
          Upcoming
        </FilterChip>
        <FilterChip active={filters.archived === 'all'} onClick={() => setFilter({ archived: filters.archived === 'all' ? '0' : 'all' })}>
          <span className="inline-flex items-center gap-1"><FiArchive className="w-3 h-3" /> Include archived</span>
        </FilterChip>
        <FilterChip active={filters.sla_breached === '1'} onClick={() => setFilter({ sla_breached: filters.sla_breached === '1' ? '' : '1' })} tone="rose">
          <span className="inline-flex items-center gap-1"><FiAlertOctagon className="w-3 h-3" /> SLA breached</span>
        </FilterChip>

        <div className="h-5 w-px bg-[var(--stroke)] mx-1" />
        <FilterButton
          label="Status"
          icon={<FiFilter className="w-3 h-3" />}
          active={!!filters.status}
          summary={filters.status}
          render={(close) => <StatusMulti cfg={cfg} value={filters.status} onChange={(v) => { setFilter({ status: v }); close() }} />}
        />
        <FilterButton
          label="Priority"
          icon={<FiFlag className="w-3 h-3" />}
          active={!!filters.priority}
          summary={filters.priority}
          render={(close) => <PriorityMulti cfg={cfg} value={filters.priority} onChange={(v) => { setFilter({ priority: v }); close() }} />}
        />
        <FilterButton
          label="Labels"
          icon={<FiTag className="w-3 h-3" />}
          active={!!filters.label}
          summary={filters.label}
          render={(close) => <LabelMulti cfg={cfg} value={filters.label} onChange={(v) => { setFilter({ label: v }); close() }} />}
        />
        <FilterButton
          label="Assignee"
          icon={<FiUser className="w-3 h-3" />}
          active={!!filters.assignee && filters.assignee !== 'all'}
          summary={filters.assignee}
          render={(close) => (
            <AssigneePicker users={assignableUsers} value={filters.assignee} onChange={(v) => { setFilter({ assignee: v }); close() }} />
          )}
        />

        <div className="ml-auto inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>Group</span>
          <select
            value={filters.group || 'status'}
            onChange={(e) => setFilter({ group: e.target.value })}
            className="px-1.5 py-0.5 rounded border border-[var(--stroke)] bg-[var(--card-bg-opaque)]"
          >
            {['status','assignee','priority','label','branch','customer','none'].map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <span>Sort</span>
          <select
            value={filters.sort || 'due'}
            onChange={(e) => setFilter({ sort: e.target.value })}
            className="px-1.5 py-0.5 rounded border border-[var(--stroke)] bg-[var(--card-bg-opaque)]"
          >
            {['due','priority','created','updated','title'].map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          {activeCount > 0 && (
            <button
              onClick={() => setFilter({ q:'', status:'', priority:'', label:'', branch:'', due:'', sla_breached:'', customer:'', lead:'', receipt:'' })}
              className="text-[var(--accent)] hover:underline"
            >
              Clear filters ({activeCount})
            </button>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pb-4">
        <StatPill label="Open" value={derived.open || 0} tone="blue" onClick={() => setFilter({ archived: '0', status: '' })} />
        <StatPill label="Due today" value={derived.due_today || 0} tone="amber" onClick={() => setFilter({ due: 'today' })} active={filters.due === 'today'} />
        <StatPill label="Overdue" value={derived.overdue || 0} tone="rose" onClick={() => setFilter({ due: 'overdue' })} active={filters.due === 'overdue'} icon={<FiAlertOctagon className="w-3 h-3" />} />
        <StatPill label="Unassigned" value={derived.unassigned || 0} tone="slate" onClick={() => setFilter({ assignee: '__unassigned' })} icon={<FiUser className="w-3 h-3" />} />
        <StatPill label="Done this week" value={derived.done_this_week || 0} tone="emerald" icon={<FiCheckSquare className="w-3 h-3" />} />
        <StatPill label="SLA breached" value={derived.sla_breached || 0} tone={derived.sla_breached ? 'rose' : 'slate'} onClick={() => setFilter({ sla_breached: '1' })} active={filters.sla_breached === '1'} icon={<FiClock className="w-3 h-3" />} />
      </div>

      {error && (
        <div className="mb-3 p-2 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Main view */}
      <div className="min-h-[50vh]">
        {view === 'list' && (
          <ListView
            tasks={tasks}
            assignableUsers={assignableUsers}
            groupBy={filters.group || 'status'}
            sort={filters.sort || 'due'}
            selection={selection}
            onToggleSelect={toggleSelect}
            onOpenTask={openDrawer}
            onQuickAdd={handleQuickAdd}
            onUpdateTask={handleUpdateTask}
            onStatusChange={openStatusPopover}
            onPriorityChange={openPriorityPopover}
            onAssigneeChange={openAssigneePopover}
            onDueChange={openDuePopover}
          />
        )}
        {view === 'kanban' && (
          <KanbanView
            tasks={tasks}
            assignableUsers={assignableUsers}
            groupBy={(filters.group && filters.group !== 'none') ? filters.group : 'status'}
            sort={filters.sort || 'priority'}
            selection={selection}
            onToggleSelect={toggleSelect}
            onOpenTask={openDrawer}
            onQuickAdd={handleQuickAdd}
            onUpdateTask={handleUpdateTask}
          />
        )}
        {view === 'calendar' && (
          <CalendarView
            tasks={tasks}
            onOpenTask={openDrawer}
            onQuickAdd={handleQuickAdd}
            onUpdateTask={handleUpdateTask}
          />
        )}
      </div>

      {/* Inline edit popovers */}
      {activePopover?.kind === 'status' && activePopoverTask && (
        <Popover anchor={popoverAnchor} onClose={closeActive}>
          <div className="py-1">
            {(cfg?.task_statuses || []).map(s => {
              const t = toneFor(s.color)
              return (
                <button key={s.key} onClick={() => { handleUpdateTask(activePopoverTask._key, { status: s.key }); closeActive() }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm">
                  <span className={`w-2 h-2 rounded-full ${t.dot}`} /> {s.label}
                </button>
              )
            })}
          </div>
        </Popover>
      )}
      {activePopover?.kind === 'priority' && activePopoverTask && (
        <Popover anchor={popoverAnchor} onClose={closeActive}>
          <div className="py-1">
            {(cfg?.task_priorities || []).map(p => {
              const t = toneFor(p.color)
              return (
                <button key={p.key} onClick={() => { handleUpdateTask(activePopoverTask._key, { priority: p.key }); closeActive() }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm">
                  <span className={`w-2 h-2 rounded-full ${t.dot}`} /> {p.label}
                </button>
              )
            })}
          </div>
        </Popover>
      )}
      {activePopover?.kind === 'assignee' && activePopoverTask && (
        <Popover anchor={popoverAnchor} onClose={closeActive}>
          <div className="py-1 max-h-72 overflow-y-auto">
            <button onClick={() => { handleUpdateTask(activePopoverTask._key, { assignee_id: null }); closeActive() }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm">
              <span className="w-5 h-5 rounded-full bg-neutral-300" /> Unassigned
            </button>
            {(assignableUsers || []).map(u => (
              <button key={u.id || u._key} onClick={() => { handleUpdateTask(activePopoverTask._key, { assignee_id: u.id || u._key }); closeActive() }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm">
                <span>{u.name || u.emp_code}</span>
              </button>
            ))}
          </div>
        </Popover>
      )}
      {activePopover?.kind === 'due' && activePopoverTask && (
        <Popover anchor={popoverAnchor} onClose={closeActive}>
          <div className="py-1">
            {[
              { label: 'Today', days: 0 },
              { label: 'Tomorrow', days: 1 },
              { label: 'In 1 week', days: 7 },
              { label: 'Clear date', clear: true }
            ].map(opt => (
              <button key={opt.label} onClick={() => {
                if (opt.clear) { handleUpdateTask(activePopoverTask._key, { due_date: null }); closeActive(); return }
                const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + opt.days)
                handleUpdateTask(activePopoverTask._key, { due_date: d.toISOString().slice(0, 10) }); closeActive()
              }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm">
                <FiCalendar className="w-3.5 h-3.5 text-[var(--text-muted)]" /> {opt.label}
              </button>
            ))}
            <div className="px-2 py-1.5 border-t border-[var(--stroke)]">
              <input
                type="date"
                defaultValue={activePopoverTask.due_date || ''}
                onChange={(e) => { handleUpdateTask(activePopoverTask._key, { due_date: e.target.value || null }); closeActive() }}
                className="w-full text-sm px-2 py-1 rounded border border-[var(--stroke)] bg-[var(--card-bg-opaque)]"
              />
            </div>
          </div>
        </Popover>
      )}

      {/* Modals, bars, toasts */}
      <QuickAddModal
        open={quickOpen}
        prefill={quickPrefill}
        onClose={() => setQuickOpen(false)}
        onCreate={onCreateTask}
      />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        tasks={tasks}
        filters={filters}
        setFilter={setFilter}
        onQuickAdd={handleQuickAdd}
      />
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      <BulkActionBar
        selection={selection}
        assignableUsers={assignableUsers}
        onClear={clearSelection}
        onBulkUpdate={handleBulkUpdate}
        onBulkDelete={handleBulkDelete}
      />
      {undoStack.map(u => (
        <UndoToast key={u.id} message={u.message} onUndo={u.undo} onDismiss={() => dismissUndo(u.id)} />
      ))}

      <TaskDrawer taskId={taskId} onClose={closeDrawer} />
    </div>
  )
}

export default function TasksPage() {
  return (
    <TasksProvider>
      <TasksPageInner />
    </TasksProvider>
  )
}

// ---------- Filter helpers ----------

function AiFilterButton({ setFilter }) {
  const { token } = useAuth()
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState('')

  const run = async () => {
    const p = prompt.trim()
    if (!p) return
    setBusy(true)
    setHint('')
    try {
      const r = await api.aiNlFilter(token, p)
      const next = r?.filters || {}
      if (Object.keys(next).length === 0) {
        setHint('No filters detected — try: "my overdue urgent tasks"')
        return
      }
      setFilter(next)
      setHint(`Applied: ${Object.entries(next).map(([k, v]) => `${k}=${v}`).join(', ')}`)
      setOpen(false)
      setPrompt('')
    } catch (err) {
      setHint(err?.message || 'AI request failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[var(--stroke)] text-xs text-[var(--text-secondary)] hover:bg-[var(--card-hover)]"
        title="Ask AI to filter"
      >
        <FiZap className="w-3 h-3" /> Ask AI
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-80 rounded-md border border-[var(--stroke)] bg-[var(--card-bg-opaque)] shadow-lg p-2">
          <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">Describe the view</div>
          <textarea
            autoFocus
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') run() }}
            placeholder='e.g. "unassigned overdue p1 tasks"'
            rows={2}
            className="w-full text-sm p-2 rounded border border-[var(--stroke)] bg-[var(--card-bg-opaque)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] resize-none"
          />
          <div className="flex items-center gap-2 mt-1">
            <button onClick={run} disabled={busy} className="text-xs px-2 py-1 rounded bg-[var(--accent)] text-white">
              {busy ? 'Thinking…' : 'Apply (⌘↵)'}
            </button>
            {hint && <span className="text-[10px] text-[var(--text-muted)] flex-1 truncate">{hint}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

function FilterButton({ label, icon, active, summary, render }) {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState(null)
  return (
    <>
      <button
        onClick={(e) => { setAnchor(e.currentTarget); setOpen(true) }}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs ${
          active ? 'border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]'
        }`}
      >
        {icon} {label}{summary ? `: ${summary}` : ''}
        <FiChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <Popover anchor={anchor} onClose={() => setOpen(false)}>
          {render(() => setOpen(false))}
        </Popover>
      )}
    </>
  )
}

function MultiList({ items, value, onChange, renderItem }) {
  const set = new Set(String(value || '').split(',').filter(Boolean))
  const toggle = (k) => {
    const next = new Set(set)
    if (next.has(k)) next.delete(k); else next.add(k)
    onChange([...next].join(','))
  }
  return (
    <div className="py-1 max-h-72 overflow-y-auto min-w-[200px]">
      {items.length === 0 && <div className="px-3 py-2 text-xs text-[var(--text-muted)]">No options.</div>}
      {items.map(it => (
        <label key={it.key} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm cursor-pointer">
          <input type="checkbox" checked={set.has(it.key)} onChange={() => toggle(it.key)} className="w-3.5 h-3.5 accent-[var(--accent)]" />
          {renderItem(it)}
        </label>
      ))}
      {set.size > 0 && (
        <button onClick={() => onChange('')} className="w-full border-t border-[var(--stroke)] px-3 py-1.5 text-xs text-[var(--accent)] hover:bg-[var(--card-hover)]">Clear</button>
      )}
    </div>
  )
}

function StatusMulti({ cfg, value, onChange }) {
  const statuses = cfg?.task_statuses || []
  return (
    <MultiList
      items={statuses}
      value={value}
      onChange={onChange}
      renderItem={(s) => {
        const t = toneFor(s.color)
        return (<><span className={`w-2 h-2 rounded-full ${t.dot}`} /> {s.label}</>)
      }}
    />
  )
}

function PriorityMulti({ cfg, value, onChange }) {
  const priorities = cfg?.task_priorities || []
  return (
    <MultiList
      items={priorities}
      value={value}
      onChange={onChange}
      renderItem={(p) => {
        const t = toneFor(p.color)
        return (<><span className={`w-2 h-2 rounded-full ${t.dot}`} /> {p.label}</>)
      }}
    />
  )
}

function LabelMulti({ cfg, value, onChange }) {
  const labels = cfg?.task_labels || []
  return (
    <MultiList
      items={labels}
      value={value}
      onChange={onChange}
      renderItem={(l) => {
        const t = toneFor(l.color)
        return (<><span className={`w-2 h-2 rounded-full ${t.dot}`} /> {l.label}</>)
      }}
    />
  )
}

function AssigneePicker({ users, value, onChange }) {
  return (
    <div className="py-1 max-h-72 overflow-y-auto min-w-[220px]">
      <button onClick={() => onChange('all')} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm">Any assignee</button>
      <button onClick={() => onChange('me')} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm">Assigned to me</button>
      <button onClick={() => onChange('__unassigned')} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm">Unassigned</button>
      <div className="border-t border-[var(--stroke)] my-1" />
      {(users || []).map(u => (
        <button key={u.id || u._key} onClick={() => onChange(u.id || u._key)} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm">
          {u.name || u.emp_code}
        </button>
      ))}
    </div>
  )
}
