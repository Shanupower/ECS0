import React from 'react'
import { FiCalendar, FiPaperclip, FiMessageSquare, FiRepeat, FiLink2, FiAlertOctagon } from 'react-icons/fi'
import UserAvatar from './UserAvatar'
import { useAppConfig } from '../../../context/AppConfigContext'
import { checklistProgress, formatDue, isOverdue, priorityMeta, statusMeta, toneFor, labelMeta } from '../utils'

/**
 * Kanban card: compact vertical layout; attachments/comments/subtasks shown as chips.
 * Drag handled by parent via `draggable` prop.
 */
export default function TaskCard({ task, assignee, selected = false, onClick, onSelectToggle, onDragStart, draggable = true, showStatus = false }) {
  const cfg = useAppConfig()
  const status = statusMeta(cfg, task.status)
  const priority = priorityMeta(cfg, task.priority)
  const overdue = isOverdue(task)
  const tone = toneFor(priority.color)
  const stone = toneFor(status.color)
  const checklist = checklistProgress(task)

  const onCardClick = (e) => {
    // Middle-click or Cmd/Ctrl-click toggles selection without opening drawer.
    if (e.metaKey || e.ctrlKey || e.button === 1) {
      e.preventDefault()
      onSelectToggle?.(task)
      return
    }
    onClick?.(task)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, task)}
      onClick={onCardClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick?.(task) }}
      className={`group relative rounded-xl border bg-[var(--card-bg)] p-3 text-left shadow-sm transition-all hover:shadow-md hover:-translate-y-[1px] cursor-pointer ${
        selected ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30' : 'border-[var(--stroke)]'
      }`}
    >
      {/* left accent bar for overdue / high priority */}
      <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${overdue ? 'bg-rose-500' : priority.key === 'p0' ? 'bg-rose-500' : priority.key === 'p1' ? 'bg-orange-500' : 'bg-transparent'}`} aria-hidden="true" />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2">{task.title}</p>
          {task.description && (
            <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>
        <UserAvatar name={assignee?.name || task.assignee_emp_code} size={26} className="flex-shrink-0" />
      </div>

      <div className="flex items-center flex-wrap gap-1.5 mt-2">
        {showStatus && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-medium ${stone.chip}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${stone.dot}`} />
            {status.label}
          </span>
        )}
        {priority.key !== 'p2' && priority.key !== 'p3' && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-medium ${tone.chip}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
            {priority.label}
          </span>
        )}
        {Array.isArray(task.labels) && task.labels.slice(0, 3).map(l => {
          const lm = labelMeta(cfg, l)
          const lt = toneFor(lm.color)
          return (
            <span key={l} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-medium ${lt.chip}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${lt.dot}`} />
              {lm.label || l}
            </span>
          )
        })}
        {(task.recurrence_rule || task.recurrence_series_id) && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[10px] text-[var(--text-muted)]">
            <FiRepeat className="w-3 h-3" />
            Recurring
          </span>
        )}
        {task.sla_breached_at && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20 text-[10px] text-rose-700 dark:text-rose-200">
            <FiAlertOctagon className="w-3 h-3" />
            SLA
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-[var(--stroke)]/60 text-[11px] text-[var(--text-muted)]">
        <div className="flex items-center gap-3 min-w-0">
          {task.due_date && (
            <span className={`inline-flex items-center gap-1 ${overdue ? 'text-rose-600 dark:text-rose-300 font-semibold' : ''}`}>
              <FiCalendar className="w-3 h-3" />
              {formatDue(task.due_date)}
            </span>
          )}
          {checklist && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              ☑ {checklist.done}/{checklist.total}
            </span>
          )}
          {task.customer_id && (
            <span className="inline-flex items-center gap-1 truncate">
              <FiLink2 className="w-3 h-3" />
              Customer
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {Array.isArray(task.watchers) && task.watchers.length > 0 && (
            <span>👥 {task.watchers.length}</span>
          )}
        </div>
      </div>
    </div>
  )
}
