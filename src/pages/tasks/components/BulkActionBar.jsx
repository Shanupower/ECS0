import React, { useRef, useState } from 'react'
import { FiX, FiArchive, FiTrash2, FiCalendar, FiFlag, FiUser, FiTag, FiPlayCircle, FiCheck } from 'react-icons/fi'
import Popover from './Popover'
import { useAppConfig } from '../../../context/AppConfigContext'
import { priorityMeta, statusMeta, toneFor, labelMeta } from '../utils'

export default function BulkActionBar({ selection, onClear, onBulkUpdate, onBulkDelete, assignableUsers }) {
  const cfg = useAppConfig()
  const [popover, setPopover] = useState(null) // status | priority | assignee | due | label
  const anchorRef = useRef({})

  if (!selection || selection.size === 0) return null

  const count = selection.size
  const ids = [...selection]

  const statuses = cfg?.task_statuses || []
  const priorities = cfg?.task_priorities || []
  const labels = cfg?.task_labels || []

  const bulk = async (patch) => {
    try { await onBulkUpdate?.(ids, patch) }
    finally { setPopover(null) }
  }

  const setAnchor = (key, el) => { anchorRef.current[key] = el }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center gap-1 px-3 py-2 rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] shadow-2xl backdrop-blur-md">
        <span className="text-xs font-semibold text-[var(--text-primary)] pr-2 border-r border-[var(--stroke)]">
          {count} selected
        </span>
        <BulkBtn icon={<FiPlayCircle />} label="Status" onClick={(el) => { setAnchor('status', el); setPopover('status') }} />
        <BulkBtn icon={<FiFlag />}       label="Priority" onClick={(el) => { setAnchor('priority', el); setPopover('priority') }} />
        <BulkBtn icon={<FiUser />}       label="Assignee" onClick={(el) => { setAnchor('assignee', el); setPopover('assignee') }} />
        <BulkBtn icon={<FiTag />}        label="Labels" onClick={(el) => { setAnchor('label', el); setPopover('label') }} />
        <BulkBtn icon={<FiCalendar />}   label="Due" onClick={(el) => { setAnchor('due', el); setPopover('due') }} />
        <BulkBtn icon={<FiArchive />}    label="Archive" onClick={() => bulk({ archived_at: new Date().toISOString() })} />
        <BulkBtn icon={<FiTrash2 />}     label="Delete" danger onClick={() => { if (window.confirm(`Delete ${count} task(s)?`)) onBulkDelete?.(ids) }} />
        <button onClick={onClear} className="ml-1 p-1.5 rounded hover:bg-[var(--card-hover)] text-[var(--text-muted)]">
          <FiX className="w-4 h-4" />
        </button>
      </div>

      {popover === 'status' && (
        <Popover anchor={anchorRef.current.status} onClose={() => setPopover(null)}>
          <div className="py-1">
            {statuses.map(s => {
              const t = toneFor(s.color)
              return (
                <button key={s.key} onClick={() => bulk({ status: s.key })} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm">
                  <span className={`w-2 h-2 rounded-full ${t.dot}`} />
                  <span>{s.label}</span>
                </button>
              )
            })}
          </div>
        </Popover>
      )}
      {popover === 'priority' && (
        <Popover anchor={anchorRef.current.priority} onClose={() => setPopover(null)}>
          <div className="py-1">
            {priorities.map(p => {
              const t = toneFor(p.color)
              return (
                <button key={p.key} onClick={() => bulk({ priority: p.key })} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm">
                  <span className={`w-2 h-2 rounded-full ${t.dot}`} />
                  <span>{p.label}</span>
                </button>
              )
            })}
          </div>
        </Popover>
      )}
      {popover === 'assignee' && (
        <Popover anchor={anchorRef.current.assignee} onClose={() => setPopover(null)}>
          <div className="py-1 max-h-72 overflow-y-auto">
            <button onClick={() => bulk({ assignee_id: null })} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm">
              <span className="w-2 h-2 rounded-full bg-neutral-400" /> Unassigned
            </button>
            {(assignableUsers || []).map(u => (
              <button key={u.id || u._key} onClick={() => bulk({ assignee_id: u.id || u._key })} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm">
                <span>{u.name || u.emp_code}</span>
              </button>
            ))}
          </div>
        </Popover>
      )}
      {popover === 'label' && (
        <Popover anchor={anchorRef.current.label} onClose={() => setPopover(null)}>
          <div className="py-1 max-h-72 overflow-y-auto">
            {labels.length === 0 && <div className="px-3 py-2 text-xs text-[var(--text-muted)]">No labels configured.</div>}
            {labels.map(l => {
              const tone = toneFor(l.color)
              return (
                <button key={l.key} onClick={() => bulk({ labels: [l.key] })} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm">
                  <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
                  <span>{l.label}</span>
                </button>
              )
            })}
          </div>
        </Popover>
      )}
      {popover === 'due' && (
        <Popover anchor={anchorRef.current.due} onClose={() => setPopover(null)}>
          <div className="py-1">
            {[
              { label: 'Today', days: 0 },
              { label: 'Tomorrow', days: 1 },
              { label: 'Next Monday', nextMon: true },
              { label: 'In 1 week', days: 7 },
              { label: 'In 2 weeks', days: 14 },
              { label: 'Clear due date', clear: true }
            ].map(opt => (
              <button key={opt.label} onClick={() => {
                if (opt.clear) return bulk({ due_date: null })
                const d = new Date(); d.setHours(0,0,0,0)
                if (opt.nextMon) {
                  const delta = (8 - d.getDay()) % 7 || 7
                  d.setDate(d.getDate() + delta)
                } else d.setDate(d.getDate() + opt.days)
                bulk({ due_date: d.toISOString().slice(0, 10) })
              }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm">
                <FiCalendar className="w-3.5 h-3.5 text-[var(--text-muted)]" /> {opt.label}
              </button>
            ))}
          </div>
        </Popover>
      )}
    </div>
  )
}

function BulkBtn({ icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={(e) => onClick?.(e.currentTarget)}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium hover:bg-[var(--card-hover)] ${danger ? 'text-rose-600 dark:text-rose-300' : 'text-[var(--text-secondary)]'}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
