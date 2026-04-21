// Shared helpers for the tasks feature. Kept intentionally small and pure.

export const COMPLETED_STATUSES = new Set(['done', 'cancelled'])

// Tailwind color tokens for the status/priority swatches. Keyed by the `color` field
// in app-config.task_statuses / task_priorities so admins can recolor without a release.
export const COLOR_TONES = {
  slate:   { dot: 'bg-slate-500',   chip: 'bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700', bar: 'bg-slate-400' },
  blue:    { dot: 'bg-blue-500',    chip: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-800', bar: 'bg-blue-500' },
  amber:   { dot: 'bg-amber-500',   chip: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-800', bar: 'bg-amber-500' },
  violet:  { dot: 'bg-violet-500',  chip: 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-200 border-violet-200 dark:border-violet-800', bar: 'bg-violet-500' },
  rose:    { dot: 'bg-rose-500',    chip: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-200 border-rose-200 dark:border-rose-800', bar: 'bg-rose-500' },
  emerald: { dot: 'bg-emerald-500', chip: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800', bar: 'bg-emerald-500' },
  neutral: { dot: 'bg-neutral-400', chip: 'bg-neutral-100 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700', bar: 'bg-neutral-400' },
  orange:  { dot: 'bg-orange-500',  chip: 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-200 border-orange-200 dark:border-orange-800', bar: 'bg-orange-500' }
}

export function toneFor(color) {
  return COLOR_TONES[color] || COLOR_TONES.slate
}

export function statusMeta(cfg, key) {
  return (cfg?.task_statuses || []).find(s => s.key === key) || { key, label: key || 'Unknown', color: 'slate', category: 'unstarted' }
}
export function priorityMeta(cfg, key) {
  return (cfg?.task_priorities || []).find(p => p.key === key) || { key, label: key || 'Normal', color: 'neutral' }
}

export function labelMeta(cfg, key) {
  return (cfg?.task_labels || []).find(l => l.key === key) || { key, label: key, color: 'neutral' }
}

export function formatDue(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''))
  if (Number.isNaN(d.getTime())) return dateStr
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff < 0 && diff >= -7) return `${-diff}d ago`
  if (diff > 0 && diff <= 7) return `In ${diff}d`
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function isOverdue(task) {
  if (!task?.due_date) return false
  if (COMPLETED_STATUSES.has(task.status)) return false
  const t = new Date().toISOString().slice(0, 10)
  return task.due_date < t
}

export function daysUntilDue(dueStr) {
  if (!dueStr) return null
  const d = new Date(dueStr + (dueStr.length === 10 ? 'T00:00:00' : ''))
  const today = new Date(); today.setHours(0,0,0,0)
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

export function checklistProgress(task) {
  const list = Array.isArray(task?.checklist) ? task.checklist : []
  if (!list.length) return null
  const done = list.filter(x => x && x.done).length
  return { done, total: list.length, ratio: done / list.length }
}

export function priorityOrder(key) {
  return { p0: 0, p1: 1, p2: 2, p3: 3 }[key] ?? 9
}

export function groupTasksBy(list, groupBy, cfg, assignableUsers) {
  const buckets = new Map()
  const byUser = new Map((assignableUsers || []).map(u => [String(u.id || u._key), u]))
  const pushInto = (key, label, t) => {
    if (!buckets.has(key)) buckets.set(key, { key, label, tasks: [] })
    buckets.get(key).tasks.push(t)
  }
  for (const t of list) {
    switch (groupBy) {
      case 'status': {
        const meta = statusMeta(cfg, t.status)
        pushInto(meta.key, meta.label, t)
        break
      }
      case 'priority': {
        const meta = priorityMeta(cfg, t.priority)
        pushInto(meta.key, meta.label, t)
        break
      }
      case 'assignee': {
        const u = byUser.get(String(t.assignee_id))
        pushInto(String(t.assignee_id || 'unassigned'), u?.name || t.assignee_emp_code || 'Unassigned', t)
        break
      }
      case 'label': {
        const labels = Array.isArray(t.labels) && t.labels.length ? t.labels : ['__none']
        for (const l of labels) {
          const meta = labelMeta(cfg, l)
          pushInto(l, l === '__none' ? 'No label' : (meta.label || l), t)
        }
        break
      }
      case 'branch': pushInto(t.branch || '__none', t.branch || 'No branch', t); break
      case 'customer': pushInto(t.customer_id || '__none', t.customer_id || 'No customer', t); break
      default: pushInto('all', 'All tasks', t); break
    }
  }
  // Preserve status/priority order from config when available.
  const arr = [...buckets.values()]
  if (groupBy === 'status') {
    const order = new Map((cfg?.task_statuses || []).map((s, i) => [s.key, i]))
    arr.sort((a, b) => (order.get(a.key) ?? 99) - (order.get(b.key) ?? 99))
  } else if (groupBy === 'priority') {
    arr.sort((a, b) => priorityOrder(a.key) - priorityOrder(b.key))
  } else {
    arr.sort((a, b) => (a.label || '').localeCompare(b.label || ''))
  }
  return arr
}
