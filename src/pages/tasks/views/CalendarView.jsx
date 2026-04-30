import React, { useMemo, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { useAppConfig } from '../../../context/AppConfigContext'
import { isOverdue, priorityMeta, statusMeta, toneFor } from '../utils'

function ymd(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return d.toISOString().slice(0, 10)
}

function buildMonthGrid(anchor) {
  const y = anchor.getFullYear()
  const m = anchor.getMonth()
  const first = new Date(y, m, 1)
  const startDay = first.getDay() // 0=Sun
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startDay; i++) {
    const d = new Date(y, m, i - startDay + 1)
    cells.push({ date: d, inMonth: false })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ date: new Date(y, m, i), inMonth: true })
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false })
  }
  return cells
}

export default function CalendarView({
  tasks,
  onOpenTask,
  onQuickAdd,
  onUpdateTask
}) {
  const cfg = useAppConfig()
  const [anchor, setAnchor] = useState(() => new Date())
  const [dragOver, setDragOver] = useState(null)

  const cells = useMemo(() => buildMonthGrid(anchor), [anchor])
  const today = ymd(new Date())

  const byDay = useMemo(() => {
    const map = new Map()
    for (const t of tasks) {
      const d = t.scheduled_date || t.due_date
      if (!d) continue
      const key = d.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(t)
    }
    return map
  }, [tasks])

  const moveMonth = (delta) => {
    const d = new Date(anchor)
    d.setMonth(d.getMonth() + delta)
    setAnchor(d)
  }

  const onDragStart = (e, task) => {
    e.dataTransfer.setData('application/task-id', task._key)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onCellDrop = (e, date) => {
    e.preventDefault()
    setDragOver(null)
    const id = e.dataTransfer.getData('application/task-id')
    if (!id) return
    const task = tasks.find(t => t._key === id)
    if (!task) return
    const targetYmd = ymd(date)
    if (task.due_date === targetYmd) return
    onUpdateTask?.(id, { due_date: targetYmd })
  }

  const monthLabel = anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--stroke)]">
        <div className="flex items-center gap-2">
          <button onClick={() => moveMonth(-1)} className="p-1.5 rounded hover:bg-[var(--card-hover)]" title="Previous month">
            <FiChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setAnchor(new Date())} className="text-xs px-2 py-1 rounded border border-[var(--stroke)] hover:bg-[var(--card-hover)]">Today</button>
          <button onClick={() => moveMonth(1)} className="p-1.5 rounded hover:bg-[var(--card-hover)]" title="Next month">
            <FiChevronRight className="w-4 h-4" />
          </button>
          <h3 className="ml-2 text-sm font-semibold text-[var(--text-primary)]">{monthLabel}</h3>
        </div>
        <span className="text-[11px] text-[var(--text-muted)]">Drag to reschedule · Double-click empty day to create</span>
      </div>

      <div className="grid grid-cols-7 border-b border-[var(--stroke)] text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="px-2 py-1 text-center">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-fr">
        {cells.map((cell, idx) => {
          const key = ymd(cell.date)
          const items = byDay.get(key) || []
          const isToday = key === today
          const isHover = dragOver === key
          return (
            <div
              key={idx}
              onDragOver={(e) => { e.preventDefault(); setDragOver(key) }}
              onDragLeave={() => setDragOver(prev => prev === key ? null : prev)}
              onDrop={(e) => onCellDrop(e, cell.date)}
              onDoubleClick={() => onQuickAdd?.({ due_date: key })}
              className={`min-h-[92px] border-r border-b border-[var(--stroke)] p-1.5 flex flex-col gap-1 ${
                !cell.inMonth ? 'bg-[var(--card-bg-opaque)] opacity-60' : ''
              } ${isHover ? 'bg-[var(--accent)]/10' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-medium ${isToday ? 'bg-[var(--accent)] text-white px-1.5 rounded-full' : 'text-[var(--text-secondary)]'}`}>
                  {cell.date.getDate()}
                </span>
                {items.length > 3 && (
                  <span className="text-[9px] text-[var(--text-muted)] tabular-nums">+{items.length - 3}</span>
                )}
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {items.slice(0, 3).map(t => {
                  const p = priorityMeta(cfg, t.priority)
                  const s = statusMeta(cfg, t.status)
                  const tone = toneFor(p.color)
                  const stone = toneFor(s.color)
                  const overdue = isOverdue(t)
                  return (
                    <button
                      key={t._key}
                      draggable
                      onDragStart={(e) => onDragStart(e, t)}
                      onClick={() => onOpenTask?.(t)}
                      className={`truncate text-[10px] text-left px-1.5 py-0.5 rounded border ${
                        overdue ? 'border-rose-300 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-200' : stone.chip
                      }`}
                    >
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${tone.dot}`} />
                      {t.title}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
