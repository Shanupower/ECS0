import React, { useMemo, useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import TaskCard from '../components/TaskCard'
import { useAppConfig } from '../../../context/AppConfigContext'
import { groupTasksBy, priorityOrder, statusMeta, toneFor } from '../utils'

export default function KanbanView({
  tasks,
  assignableUsers,
  groupBy = 'status',
  sort = 'priority',
  selection,
  onToggleSelect,
  onOpenTask,
  onQuickAdd,
  onUpdateTask
}) {
  const cfg = useAppConfig()
  const [dragOver, setDragOver] = useState(null)

  const sortedTasks = useMemo(() => {
    const arr = [...tasks]
    const by = {
      due: (a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'),
      priority: (a, b) => priorityOrder(a.priority) - priorityOrder(b.priority),
      created: (a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')),
      updated: (a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')),
      title: (a, b) => (a.title || '').localeCompare(b.title || '')
    }
    arr.sort(by[sort] || by.priority)
    return arr
  }, [tasks, sort])

  // Build columns. For status grouping, use the full set of known statuses so
  // empty columns still appear (consistent board).
  const columns = useMemo(() => {
    if (groupBy === 'status') {
      const statuses = cfg?.task_statuses || []
      const byKey = new Map(statuses.map(s => [s.key, { key: s.key, label: s.label, meta: s, tasks: [] }]))
      for (const t of sortedTasks) {
        const col = byKey.get(t.status) || { key: t.status || 'unknown', label: t.status || 'Unknown', tasks: [] }
        if (!byKey.has(t.status)) byKey.set(t.status || 'unknown', col)
        col.tasks.push(t)
      }
      return [...byKey.values()]
    }
    return groupTasksBy(sortedTasks, groupBy, cfg, assignableUsers)
  }, [sortedTasks, groupBy, cfg, assignableUsers])

  const byUser = useMemo(() => new Map((assignableUsers || []).map(u => [String(u.id || u._key), u])), [assignableUsers])

  const onDragStart = (e, task) => {
    e.dataTransfer.setData('application/task-id', task._key)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onColumnDrop = (e, column) => {
    e.preventDefault()
    setDragOver(null)
    if (groupBy !== 'status') return
    const id = e.dataTransfer.getData('application/task-id')
    if (!id) return
    const task = tasks.find(t => t._key === id)
    if (!task || task.status === column.key) return
    onUpdateTask?.(id, { status: column.key })
  }

  if (!tasks.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-[var(--text-muted)]">
        <div className="w-16 h-16 rounded-full bg-[var(--card-bg)] flex items-center justify-center mb-3">📋</div>
        <p className="text-sm">No tasks to show on the board.</p>
        <button onClick={() => onQuickAdd?.()} className="mt-3 inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline">
          <FiPlus /> Create a task
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
      {columns.map(col => {
        const meta = groupBy === 'status' ? (col.meta || statusMeta(cfg, col.key)) : null
        const tone = meta ? toneFor(meta.color) : null
        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              if (groupBy !== 'status') return
              e.preventDefault()
              setDragOver(col.key)
            }}
            onDragLeave={() => setDragOver(prev => (prev === col.key ? null : prev))}
            onDrop={(e) => onColumnDrop(e, col)}
            className={`flex-shrink-0 w-72 rounded-xl border bg-[var(--card-bg)]/60 p-2 flex flex-col max-h-full ${
              dragOver === col.key ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30' : 'border-[var(--stroke)]'
            }`}
          >
            <div className="flex items-center gap-2 px-1 pb-2 mb-2 border-b border-[var(--stroke)]">
              {tone && <span className={`w-2 h-2 rounded-full ${tone.dot}`} />}
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                {col.label}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] tabular-nums bg-[var(--card-hover)] px-1.5 py-0.5 rounded">
                {col.tasks.length}
              </span>
              <button
                onClick={() => onQuickAdd?.({ status: groupBy === 'status' ? col.key : undefined })}
                className="ml-auto text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                title="Add task"
              >
                <FiPlus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-0.5">
              {col.tasks.map(task => (
                <TaskCard
                  key={task._key}
                  task={task}
                  assignee={byUser.get(String(task.assignee_id))}
                  selected={selection.has(task._key)}
                  onClick={onOpenTask}
                  onSelectToggle={onToggleSelect}
                  onDragStart={onDragStart}
                  showStatus={groupBy !== 'status'}
                />
              ))}
              {col.tasks.length === 0 && (
                <div className="text-xs text-center text-[var(--text-muted)] py-6">Empty</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
