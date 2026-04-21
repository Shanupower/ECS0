import React from 'react'
import { FiCalendar, FiRepeat, FiAlertOctagon, FiLink2 } from 'react-icons/fi'
import UserAvatar from './UserAvatar'
import { useAppConfig } from '../../../context/AppConfigContext'
import { checklistProgress, formatDue, isOverdue, priorityMeta, statusMeta, toneFor, labelMeta } from '../utils'

/**
 * Dense list row used inside ListView. Inline edits open popovers.
 */
export default function TaskRow({
  task,
  assignee,
  selected = false,
  onClick,
  onSelectToggle,
  onStatusClick,
  onPriorityClick,
  onAssigneeClick,
  onDueClick,
  onDragStart,
  draggable = true
}) {
  const cfg = useAppConfig()
  const status = statusMeta(cfg, task.status)
  const priority = priorityMeta(cfg, task.priority)
  const overdue = isOverdue(task)
  const stone = toneFor(status.color)
  const ptone = toneFor(priority.color)
  const checklist = checklistProgress(task)

  const stop = (e) => { e.stopPropagation(); e.preventDefault() }

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, task)}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) { onSelectToggle?.(task); return }
        onClick?.(task)
      }}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick?.(task) }}
      className={`group grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto_auto] items-center gap-3 px-3 py-2 border-b border-[var(--stroke)] cursor-pointer transition-colors ${
        selected ? 'bg-[var(--accent)]/5' : 'hover:bg-[var(--card-hover)]'
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onSelectToggle?.(task)}
        onClick={stop}
        className="w-4 h-4 rounded border-[var(--stroke)] accent-[var(--accent)]"
      />

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {/* priority dot */}
          <button
            onClick={(e) => { stop(e); onPriorityClick?.(task, e.currentTarget) }}
            title={`Priority: ${priority.label}`}
            className="flex-shrink-0 w-2 h-2 rounded-full"
            style={{ backgroundColor: 'currentColor' }}
          >
            <span className={`block w-2 h-2 rounded-full ${ptone.dot}`} />
          </button>
          <span className="text-sm text-[var(--text-primary)] truncate font-medium">{task.title}</span>
          {checklist && (
            <span className="text-[10px] text-[var(--text-muted)] tabular-nums flex-shrink-0">
              {checklist.done}/{checklist.total}
            </span>
          )}
          {(task.recurrence_rule || task.recurrence_series_id) && (
            <FiRepeat className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0" title="Recurring" />
          )}
          {task.sla_breached_at && (
            <FiAlertOctagon className="w-3 h-3 text-rose-500 flex-shrink-0" title="SLA breached" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--text-muted)]">
          {Array.isArray(task.labels) && task.labels.slice(0, 3).map(l => {
            const lm = labelMeta(cfg, l)
            const lt = toneFor(lm.color)
            return (
              <span key={l} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${lt.chip}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${lt.dot}`} />
                {lm.label || l}
              </span>
            )
          })}
          {task.branch && <span>· {task.branch}</span>}
          {task.customer_id && (
            <span className="inline-flex items-center gap-1">
              <FiLink2 className="w-3 h-3" /> Customer
            </span>
          )}
        </div>
      </div>

      <button
        onClick={(e) => { stop(e); onStatusClick?.(task, e.currentTarget) }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium ${stone.chip}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${stone.dot}`} />
        {status.label}
      </button>

      <button
        onClick={(e) => { stop(e); onDueClick?.(task, e.currentTarget) }}
        className={`inline-flex items-center gap-1 text-xs tabular-nums px-2 py-0.5 rounded-md border ${
          task.due_date
            ? (overdue ? 'border-rose-300 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-200 font-semibold' : 'border-[var(--stroke)] text-[var(--text-secondary)]')
            : 'border-dashed border-[var(--stroke)] text-[var(--text-muted)]'
        }`}
      >
        <FiCalendar className="w-3 h-3" />
        {task.due_date ? formatDue(task.due_date) : 'Set due'}
      </button>

      <button
        onClick={(e) => { stop(e); onPriorityClick?.(task, e.currentTarget) }}
        className={`hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium ${ptone.chip}`}
      >
        {priority.label}
      </button>

      <button
        onClick={(e) => { stop(e); onAssigneeClick?.(task, e.currentTarget) }}
        title={assignee?.name || task.assignee_emp_code || 'Unassigned'}
        className="flex-shrink-0"
      >
        <UserAvatar name={assignee?.name || task.assignee_emp_code} size={24} />
      </button>
    </div>
  )
}
