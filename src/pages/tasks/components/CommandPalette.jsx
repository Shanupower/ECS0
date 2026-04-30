import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSearch, FiCheckSquare, FiHome, FiUsers, FiList, FiGrid, FiCalendar, FiPlus, FiFilter } from 'react-icons/fi'

export default function CommandPalette({ open, onClose, tasks, filters, setFilter, onQuickAdd }) {
  const [q, setQ] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    setQ(''); setIndex(0)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  const commands = useMemo(() => {
    const base = [
      { id: 'nav-tasks',       label: 'Go to Tasks',        icon: <FiCheckSquare />, run: () => navigate('/tasks') },
      { id: 'nav-leads',       label: 'Go to Leads',        icon: <FiUsers />,       run: () => navigate('/leads') },
      { id: 'nav-dashboard',   label: 'Go to Dashboard',    icon: <FiHome />,        run: () => navigate('/dashboard') },
      { id: 'view-list',       label: 'Switch to List view',     icon: <FiList />,     run: () => setFilter({ view: 'list' }) },
      { id: 'view-kanban',     label: 'Switch to Kanban view',   icon: <FiGrid />,     run: () => setFilter({ view: 'kanban' }) },
      { id: 'view-calendar',   label: 'Switch to Calendar view', icon: <FiCalendar />, run: () => setFilter({ view: 'calendar' }) },
      { id: 'create-task',     label: 'Create task… (Quick add)', icon: <FiPlus />,    run: () => onQuickAdd?.() },
      { id: 'filter-me',       label: 'Filter: My tasks',        icon: <FiFilter />,  run: () => setFilter({ assignee: 'me', due: '', archived: '0' }) },
      { id: 'filter-today',    label: 'Filter: Due today',       icon: <FiFilter />,  run: () => setFilter({ due: 'today' }) },
      { id: 'filter-overdue',  label: 'Filter: Overdue',         icon: <FiFilter />,  run: () => setFilter({ due: 'overdue' }) },
      { id: 'filter-clear',    label: 'Clear filters',           icon: <FiFilter />,  run: () => setFilter({ q: '', status: '', priority: '', label: '', branch: '', due: '', sla_breached: '', archived: '0' }) }
    ]
    const recent = (tasks || []).slice(0, 8).map(t => ({
      id: `task-${t._key}`,
      label: `Open · ${t.title}`,
      icon: <FiCheckSquare />,
      run: () => navigate(`/tasks?taskId=${t._key}`)
    }))
    const all = [...base, ...recent]
    if (!q.trim()) return all
    const lq = q.toLowerCase()
    return all.filter(c => c.label.toLowerCase().includes(lq))
  }, [q, tasks, navigate, setFilter, onQuickAdd])

  useEffect(() => { if (index >= commands.length) setIndex(0) }, [commands, index])

  const run = (cmd) => { if (!cmd) return; cmd.run(); onClose?.() }

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(i + 1, commands.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); run(commands[index]) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--stroke)]">
          <FiSearch className="w-4 h-4 text-[var(--text-muted)]" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Type a command or search tasks…"
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          <span className="text-[10px] text-[var(--text-muted)] border border-[var(--stroke)] rounded px-1 py-0.5">Esc</span>
        </div>
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-1">
          {commands.length === 0 && <div className="px-3 py-4 text-sm text-[var(--text-muted)]">No matches.</div>}
          {commands.map((cmd, i) => (
            <button
              key={cmd.id}
              onMouseEnter={() => setIndex(i)}
              onClick={() => run(cmd)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${i === index ? 'bg-[var(--card-hover)]' : ''}`}
            >
              <span className="text-[var(--text-muted)]">{cmd.icon}</span>
              <span className="flex-1 truncate">{cmd.label}</span>
              {i === index && <span className="text-[10px] text-[var(--text-muted)]">↵</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
