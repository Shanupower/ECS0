import React, { useMemo, useState } from 'react'
import { FiChevronDown, FiChevronRight, FiPlus } from 'react-icons/fi'
import TaskRow from '../components/TaskRow'
import { useAppConfig } from '../../../context/AppConfigContext'
import { groupTasksBy, priorityOrder, statusMeta, toneFor } from '../utils'

export default function ListView({
  tasks,
  assignableUsers,
  groupBy = 'status',
  sort = 'due',
  selection,
  onToggleSelect,
  onOpenTask,
  onQuickAdd,
  onUpdateTask,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onDueChange
}) {
  const cfg = useAppConfig()
  const [collapsed, setCollapsed] = useState(() => new Set())

  const sortedTasks = useMemo(() => {
    const arr = [...tasks]
    const by = {
      due: (a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'),
      priority: (a, b) => priorityOrder(a.priority) - priorityOrder(b.priority),
      created: (a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')),
      updated: (a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')),
      title: (a, b) => (a.title || '').localeCompare(b.title || '')
    }
    arr.sort(by[sort] || by.due)
    return arr
  }, [tasks, sort])

  const groups = useMemo(
    () => groupTasksBy(sortedTasks, groupBy === 'none' ? 'all' : groupBy, cfg, assignableUsers),
    [sortedTasks, groupBy, cfg, assignableUsers]
  )

  const byUser = useMemo(() => new Map((assignableUsers || []).map(u => [String(u.id || u._key), u])), [assignableUsers])

  const toggleGroup = (key) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const onDragStart = (e, task) => {
    e.dataTransfer.setData('application/task-id', task._key)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDropOnGroup = (e, group) => {
    e.preventDefault()
    if (groupBy !== 'status') return
    const id = e.dataTransfer.getData('application/task-id')
    if (!id) return
    const task = tasks.find(t => t._key === id)
    if (!task || task.status === group.key) return
    onUpdateTask?.(id, { status: group.key })
  }

  if (!tasks.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-[var(--text-muted)]">
        <div className="w-16 h-16 rounded-full bg-[var(--card-bg)] flex items-center justify-center mb-3">📋</div>
        <p className="text-sm">No tasks match the current filters.</p>
        <button onClick={() => onQuickAdd?.()} className="mt-3 inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline">
          <FiPlus /> Create a task
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] overflow-hidden">
      {groups.map(group => {
        const isCollapsed = collapsed.has(group.key)
        const tone = groupBy === 'status' ? toneFor(statusMeta(cfg, group.key).color) : null
        return (
          <div
            key={group.key}
            onDragOver={(e) => { if (groupBy === 'status') e.preventDefault() }}
            onDrop={(e) => onDropOnGroup(e, group)}
          >
            <button
              onClick={() => toggleGroup(group.key)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-[var(--card-bg-opaque)] border-b border-[var(--stroke)] text-left hover:bg-[var(--card-hover)] sticky top-0 z-10"
            >
              {isCollapsed ? <FiChevronRight className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
              {tone && <span className={`w-2 h-2 rounded-full ${tone.dot}`} />}
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                {group.label}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] tabular-nums bg-[var(--card-hover)] px-1.5 py-0.5 rounded">
                {group.tasks.length}
              </span>
            </button>
            {!isCollapsed && group.tasks.map(task => (
              <TaskRow
                key={task._key}
                task={task}
                assignee={byUser.get(String(task.assignee_id))}
                selected={selection.has(task._key)}
                onClick={onOpenTask}
                onSelectToggle={onToggleSelect}
                onStatusClick={onStatusChange}
                onPriorityClick={onPriorityChange}
                onAssigneeClick={onAssigneeChange}
                onDueClick={onDueChange}
                onDragStart={onDragStart}
                draggable={groupBy === 'status'}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
