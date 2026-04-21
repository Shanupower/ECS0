import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  FiX, FiCalendar, FiFlag, FiTag, FiUser, FiClock, FiPaperclip, FiMessageSquare,
  FiActivity, FiLink2, FiTrash2, FiPlus, FiChevronRight, FiRepeat, FiArchive,
  FiAlertOctagon, FiCheck
} from 'react-icons/fi'
import UserAvatar from './UserAvatar'
import Popover from './Popover'
import { api } from '../../../api'
import { useAuth } from '../../../context/AuthContext'
import { useAppConfig } from '../../../context/AppConfigContext'
import { useTasks } from '../../../context/TasksContext'
import { formatDue, isOverdue, priorityMeta, statusMeta, toneFor, labelMeta } from '../utils'

const TABS = [
  { key: 'details',    label: 'Details' },
  { key: 'activity',   label: 'Activity' },
  { key: 'links',      label: 'Links' },
  { key: 'attachments',label: 'Attachments' }
]

export default function TaskDrawer({ taskId, onClose }) {
  const { token, user } = useAuth()
  const cfg = useAppConfig()
  const tasksCtx = useTasks()
  const { updateTask, deleteTask, assignableUsers, patchLocal } = tasksCtx

  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('details')
  const [subtasks, setSubtasks] = useState([])
  const [comments, setComments] = useState([])
  const [activities, setActivities] = useState([])
  const [attachments, setAttachments] = useState([])
  const [watchers, setWatchers] = useState([])
  const [newComment, setNewComment] = useState('')
  const [newSubtask, setNewSubtask] = useState('')
  const [popover, setPopover] = useState(null)
  const anchorRef = useRef({})
  const fileInputRef = useRef(null)

  // Load task + nested data whenever taskId changes.
  useEffect(() => {
    if (!taskId || !token) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const t = await api.getTask(token, taskId)
        if (cancelled) return
        setTask(t)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [taskId, token])

  useEffect(() => {
    if (!taskId || !token) return
    Promise.all([
      api.listSubtasks(token, taskId).catch(() => []),
      api.listTaskComments(token, taskId).catch(() => []),
      api.listTaskActivities(token, taskId).catch(() => []),
      api.listTaskAttachments(token, taskId).catch(() => []),
      api.listTaskWatchers(token, taskId).catch(() => [])
    ]).then(([s, c, a, at, w]) => {
      setSubtasks(Array.isArray(s) ? s : (s?.items || []))
      setComments(Array.isArray(c) ? c : (c?.items || []))
      setActivities(Array.isArray(a) ? a : (a?.items || []))
      setAttachments(Array.isArray(at) ? at : (at?.items || []))
      setWatchers(Array.isArray(w) ? w : (w?.items || []))
    })
  }, [taskId, token])

  const byUser = useMemo(() => new Map((assignableUsers || []).map(u => [String(u.id || u._key), u])), [assignableUsers])
  const assignee = task?.assignee_id ? byUser.get(String(task.assignee_id)) : null
  const statusM = task ? statusMeta(cfg, task.status) : null
  const priorityM = task ? priorityMeta(cfg, task.priority) : null
  const stone = statusM ? toneFor(statusM.color) : null
  const ptone = priorityM ? toneFor(priorityM.color) : null

  const patch = async (p) => {
    if (!task) return
    setTask(prev => ({ ...prev, ...p }))
    try {
      const updated = await updateTask(task._key, p)
      setTask(updated)
    } catch (err) {
      alert(err.message || 'Update failed')
    }
  }

  const onTitleBlur = (e) => {
    const v = e.target.value.trim()
    if (v && v !== task.title) patch({ title: v })
  }

  const onDescBlur = (e) => {
    const v = e.target.value
    if (v !== (task.description || '')) patch({ description: v })
  }

  const toggleChecklist = (idx) => {
    const next = (task.checklist || []).map((item, i) => i === idx ? { ...item, done: !item.done } : item)
    patch({ checklist: next })
  }

  const addChecklist = (text) => {
    if (!text.trim()) return
    const next = [...(task.checklist || []), { text: text.trim(), done: false }]
    patch({ checklist: next })
  }

  const removeChecklist = (idx) => {
    const next = (task.checklist || []).filter((_, i) => i !== idx)
    patch({ checklist: next })
  }

  const submitComment = async () => {
    if (!newComment.trim()) return
    try {
      const created = await api.createTaskComment(token, task._key, { body: newComment.trim() })
      setComments(prev => [...prev, created])
      setNewComment('')
    } catch (err) { alert(err.message || 'Failed to comment') }
  }

  const submitSubtask = async () => {
    if (!newSubtask.trim()) return
    try {
      const created = await api.createSubtask(token, task._key, { title: newSubtask.trim() })
      setSubtasks(prev => [...prev, created])
      setNewSubtask('')
    } catch (err) { alert(err.message || 'Failed to create subtask') }
  }

  const uploadFiles = async (e) => {
    const files = [...(e.target.files || [])]
    if (!files.length) return
    try {
      const res = await api.uploadTaskAttachments(token, task._key, files)
      const list = Array.isArray(res) ? res : (res?.items || [])
      setAttachments(prev => [...prev, ...list])
    } catch (err) { alert(err.message || 'Upload failed') }
    finally { if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  const removeAttachment = async (aid) => {
    try {
      await api.deleteTaskAttachment(token, task._key, aid)
      setAttachments(prev => prev.filter(a => a._key !== aid))
    } catch (err) { alert(err.message || 'Delete failed') }
  }

  const toggleWatcher = async (uid) => {
    const exists = watchers.find(w => String(w.user_id) === String(uid))
    try {
      if (exists) {
        await api.removeTaskWatcher(token, task._key, uid)
        setWatchers(prev => prev.filter(w => String(w.user_id) !== String(uid)))
      } else {
        const w = await api.addTaskWatcher(token, task._key, uid)
        setWatchers(prev => [...prev, w])
      }
    } catch (err) { alert(err.message || 'Failed to update watchers') }
  }

  const confirmDelete = async () => {
    if (!task) return
    if (!window.confirm('Delete this task?')) return
    try { await deleteTask(task._key); onClose?.() }
    catch (err) { alert(err.message || 'Failed to delete') }
  }

  if (!taskId) return null

  return (
    <div className="fixed inset-0 z-40 flex">
      <button className="flex-1 bg-black/30" onClick={onClose} aria-label="Close" />
      <aside className="w-full max-w-[640px] bg-[var(--card-bg)] border-l border-[var(--stroke)] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--stroke)]">
          {task ? (
            <>
              <button
                onClick={(e) => { anchorRef.current.status = e.currentTarget; setPopover('status') }}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium ${stone?.chip || ''}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${stone?.dot}`} />
                {statusM?.label || 'Status'}
              </button>
              <button
                onClick={(e) => { anchorRef.current.priority = e.currentTarget; setPopover('priority') }}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium ${ptone?.chip || ''}`}
              >
                <FiFlag className="w-3 h-3" /> {priorityM?.label || 'Priority'}
              </button>
              {(task.recurrence_rule || task.recurrence_series_id) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[11px] text-[var(--text-muted)]">
                  <FiRepeat className="w-3 h-3" /> Recurring
                </span>
              )}
              {task.sla_breached_at && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-rose-300 bg-rose-50 dark:bg-rose-900/20 text-[11px] text-rose-700 dark:text-rose-200">
                  <FiAlertOctagon className="w-3 h-3" /> SLA
                </span>
              )}
            </>
          ) : null}
          <div className="ml-auto flex items-center gap-1">
            {task && (
              <button onClick={() => patch({ archived_at: task.archived_at ? null : new Date().toISOString() })} title={task.archived_at ? 'Unarchive' : 'Archive'} className="p-1.5 rounded hover:bg-[var(--card-hover)] text-[var(--text-muted)]">
                <FiArchive className="w-4 h-4" />
              </button>
            )}
            {task && (
              <button onClick={confirmDelete} title="Delete" className="p-1.5 rounded hover:bg-rose-500/10 text-rose-600 dark:text-rose-300">
                <FiTrash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded hover:bg-[var(--card-hover)] text-[var(--text-muted)]">
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading || !task ? (
          <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm">
            {loading ? 'Loading…' : 'Task not found.'}
          </div>
        ) : (
          <>
            {/* Title + meta */}
            <div className="px-4 pt-4">
              <textarea
                defaultValue={task.title}
                onBlur={onTitleBlur}
                rows={2}
                className="w-full text-lg font-semibold leading-snug text-[var(--text-primary)] bg-transparent border-none focus:outline-none resize-none"
                placeholder="Task title"
              />
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
                <button
                  onClick={(e) => { anchorRef.current.due = e.currentTarget; setPopover('due') }}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${
                    task.due_date
                      ? (isOverdue(task) ? 'border-rose-300 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-200' : 'border-[var(--stroke)] text-[var(--text-secondary)]')
                      : 'border-dashed border-[var(--stroke)]'
                  }`}
                >
                  <FiCalendar className="w-3 h-3" /> {task.due_date ? formatDue(task.due_date) : 'Set due date'}
                </button>
                <button
                  onClick={(e) => { anchorRef.current.assignee = e.currentTarget; setPopover('assignee') }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-[var(--stroke)] hover:bg-[var(--card-hover)]"
                >
                  <UserAvatar name={assignee?.name || task.assignee_emp_code} size={16} />
                  {assignee?.name || task.assignee_emp_code || 'Unassigned'}
                </button>
                <button
                  onClick={(e) => { anchorRef.current.labels = e.currentTarget; setPopover('labels') }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-dashed border-[var(--stroke)] hover:bg-[var(--card-hover)]"
                >
                  <FiTag className="w-3 h-3" /> Labels {Array.isArray(task.labels) && task.labels.length > 0 ? `(${task.labels.length})` : ''}
                </button>
                {task.estimate_minutes != null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-[var(--stroke)]">
                    <FiClock className="w-3 h-3" />
                    {task.estimate_minutes < 60 ? `${task.estimate_minutes}m` : `${(task.estimate_minutes/60).toFixed(1)}h`}
                  </span>
                )}
              </div>
              {Array.isArray(task.labels) && task.labels.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {task.labels.map(l => {
                    const lm = labelMeta(cfg, l)
                    const t = toneFor(lm.color)
                    return (
                      <span key={l} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${t.chip}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
                        {lm.label || l}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 mt-4 border-b border-[var(--stroke)]">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-2 text-sm border-b-2 transition-colors ${
                    tab === t.key
                      ? 'border-[var(--accent)] text-[var(--text-primary)] font-medium'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {tab === 'details' && (
                <div className="p-4 space-y-6">
                  <AiAssistPanel task={task} token={token} />
                  {/* Description */}
                  <section>
                    <h4 className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">Description</h4>
                    <textarea
                      defaultValue={task.description || ''}
                      onBlur={onDescBlur}
                      rows={4}
                      placeholder="Add a description…"
                      className="w-full text-sm p-2 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    />
                  </section>

                  {/* Checklist */}
                  <section>
                    <h4 className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-2">Checklist</h4>
                    <div className="space-y-1">
                      {(task.checklist || []).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 group">
                          <input
                            type="checkbox"
                            checked={!!item.done}
                            onChange={() => toggleChecklist(idx)}
                            className="w-4 h-4 rounded accent-[var(--accent)]"
                          />
                          <span className={`text-sm flex-1 ${item.done ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>{item.text}</span>
                          <button onClick={() => removeChecklist(idx)} className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-rose-500">
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <InlineAdd placeholder="Add item…" onAdd={addChecklist} />
                    </div>
                  </section>

                  {/* Subtasks */}
                  <section>
                    <h4 className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-2">Subtasks</h4>
                    <div className="space-y-1">
                      {subtasks.map(s => {
                        const ss = statusMeta(cfg, s.status)
                        const sTone = toneFor(ss.color)
                        return (
                          <div key={s._key} className="flex items-center gap-2 text-sm">
                            <span className={`w-1.5 h-1.5 rounded-full ${sTone.dot}`} />
                            <span className={s.status === 'done' ? 'line-through text-[var(--text-muted)]' : ''}>{s.title}</span>
                            <span className="ml-auto text-[10px] text-[var(--text-muted)]">{ss.label}</span>
                          </div>
                        )
                      })}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          value={newSubtask}
                          onChange={(e) => setNewSubtask(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') submitSubtask() }}
                          placeholder="Add subtask…"
                          className="flex-1 text-sm px-2 py-1 rounded border border-[var(--stroke)] bg-[var(--card-bg-opaque)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        />
                        <button onClick={submitSubtask} className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline">
                          <FiPlus className="w-3 h-3" /> Add
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Watchers */}
                  <section>
                    <h4 className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-2">Watchers</h4>
                    <div className="flex flex-wrap items-center gap-1">
                      {watchers.map(w => {
                        const u = byUser.get(String(w.user_id))
                        return (
                          <button key={w.user_id} onClick={() => toggleWatcher(w.user_id)} title="Remove watcher" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[var(--stroke)] text-[11px]">
                            <UserAvatar name={u?.name || w.user_id} size={14} />
                            {u?.name || w.user_id}
                          </button>
                        )
                      })}
                      <button
                        onClick={(e) => { anchorRef.current.watcher = e.currentTarget; setPopover('watcher') }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-dashed border-[var(--stroke)] text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        <FiPlus className="w-3 h-3" /> Add watcher
                      </button>
                    </div>
                  </section>

                  {/* Comments */}
                  <section>
                    <h4 className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-2 flex items-center gap-1">
                      <FiMessageSquare className="w-3 h-3" /> Comments
                    </h4>
                    <div className="space-y-2">
                      {comments.map(c => (
                        <div key={c._key} className="flex gap-2">
                          <UserAvatar name={c.author_name || c.author_id} size={24} />
                          <div className="flex-1 rounded-lg border border-[var(--stroke)] p-2 text-sm">
                            <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mb-0.5">
                              <span className="font-medium text-[var(--text-primary)]">{c.author_name || c.author_id || 'User'}</span>
                              <span>{new Date(c.created_at).toLocaleString()}</span>
                            </div>
                            <div className="text-[var(--text-primary)] whitespace-pre-wrap">{c.body}</div>
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-1">
                        <UserAvatar name={user?.name || user?.emp_code} size={24} />
                        <div className="flex-1 flex gap-2">
                          <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            rows={1}
                            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submitComment() }}
                            placeholder="Add a comment… (Cmd+Enter to post, @mention)"
                            className="flex-1 text-sm px-2 py-1.5 rounded border border-[var(--stroke)] bg-[var(--card-bg-opaque)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] resize-none"
                          />
                          <button onClick={submitComment} className="px-3 py-1.5 rounded-md bg-[var(--accent)] text-white text-xs font-medium hover:bg-[var(--accent-hover)]">
                            Post
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {tab === 'activity' && (
                <div className="p-4 space-y-2">
                  {activities.length === 0 && <p className="text-sm text-[var(--text-muted)]">No activity yet.</p>}
                  {activities.map(a => (
                    <div key={a._key || a._id} className="flex gap-2 text-xs">
                      <FiActivity className="w-3.5 h-3.5 text-[var(--text-muted)] mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-[var(--text-primary)]">{a.actor_name || a.actor_id || 'System'}</span>{' '}
                        <span className="text-[var(--text-muted)]">{describeActivity(a)}</span>
                        <div className="text-[10px] text-[var(--text-muted)]">{new Date(a.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'links' && (
                <div className="p-4 space-y-3">
                  <EntityLink label="Customer" value={task.customer_id} href={task.customer_id ? `/customers/${task.customer_id}` : null} />
                  <EntityLink label="Lead" value={task.lead_id} href={task.lead_id ? `/leads?selected=${task.lead_id}` : null} />
                  <EntityLink label="Receipt" value={task.receipt_id} href={task.receipt_id ? `/transactions?selected=${task.receipt_id}` : null} />
                  <EntityLink label="Loan" value={task.loan_id} />
                  <EntityLink label="Branch" value={task.branch} />
                </div>
              )}

              {tab === 'attachments' && (
                <div className="p-4 space-y-2">
                  {attachments.length === 0 && <p className="text-sm text-[var(--text-muted)]">No attachments yet.</p>}
                  {attachments.map(a => (
                    <div key={a._key} className="flex items-center gap-2 text-sm">
                      <FiPaperclip className="w-4 h-4 text-[var(--text-muted)]" />
                      <a href={a.url} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline truncate flex-1">{a.filename || a.name || a._key}</a>
                      <span className="text-[10px] text-[var(--text-muted)]">{a.size ? `${Math.round(a.size/1024)} KB` : ''}</span>
                      <button onClick={() => removeAttachment(a._key)} className="text-[var(--text-muted)] hover:text-rose-500">
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <div>
                    <input ref={fileInputRef} type="file" multiple onChange={uploadFiles} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-dashed border-[var(--stroke)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                      <FiPlus className="w-3 h-3" /> Upload files
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Popovers */}
        {popover === 'status' && task && (
          <Popover anchor={anchorRef.current.status} onClose={() => setPopover(null)}>
            <div className="py-1">
              {(cfg?.task_statuses || []).map(s => {
                const t = toneFor(s.color)
                return (
                  <button key={s.key} onClick={() => { patch({ status: s.key }); setPopover(null) }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm">
                    <span className={`w-2 h-2 rounded-full ${t.dot}`} />{s.label}
                    {task.status === s.key && <FiCheck className="ml-auto w-3 h-3 text-[var(--accent)]" />}
                  </button>
                )
              })}
            </div>
          </Popover>
        )}
        {popover === 'priority' && task && (
          <Popover anchor={anchorRef.current.priority} onClose={() => setPopover(null)}>
            <div className="py-1">
              {(cfg?.task_priorities || []).map(p => {
                const t = toneFor(p.color)
                return (
                  <button key={p.key} onClick={() => { patch({ priority: p.key }); setPopover(null) }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm">
                    <span className={`w-2 h-2 rounded-full ${t.dot}`} />{p.label}
                    {task.priority === p.key && <FiCheck className="ml-auto w-3 h-3 text-[var(--accent)]" />}
                  </button>
                )
              })}
            </div>
          </Popover>
        )}
        {popover === 'assignee' && task && (
          <Popover anchor={anchorRef.current.assignee} onClose={() => setPopover(null)}>
            <div className="py-1 max-h-72 overflow-y-auto">
              <AssigneeAiSuggest
                token={token}
                task={task}
                byUser={byUser}
                onPick={(id) => { patch({ assignee_id: id }); setPopover(null) }}
              />
              <button onClick={() => { patch({ assignee_id: null }); setPopover(null) }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm">
                <span className="w-5 h-5 rounded-full bg-neutral-300" /> Unassigned
              </button>
              {(assignableUsers || []).map(u => (
                <button key={u.id || u._key} onClick={() => { patch({ assignee_id: u.id || u._key }); setPopover(null) }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm">
                  <UserAvatar name={u.name} size={18} />
                  <span>{u.name || u.emp_code}</span>
                  {String(task.assignee_id) === String(u.id || u._key) && <FiCheck className="ml-auto w-3 h-3 text-[var(--accent)]" />}
                </button>
              ))}
            </div>
          </Popover>
        )}
        {popover === 'due' && task && (
          <Popover anchor={anchorRef.current.due} onClose={() => setPopover(null)}>
            <div className="py-1">
              {[
                { label: 'Today', days: 0 },
                { label: 'Tomorrow', days: 1 },
                { label: 'Next Monday', nextMon: true },
                { label: 'In 1 week', days: 7 },
                { label: 'In 2 weeks', days: 14 },
                { label: 'Clear date', clear: true }
              ].map(opt => (
                <button key={opt.label} onClick={() => {
                  if (opt.clear) { patch({ due_date: null }); setPopover(null); return }
                  const d = new Date(); d.setHours(0,0,0,0)
                  if (opt.nextMon) { const delta = (8 - d.getDay()) % 7 || 7; d.setDate(d.getDate() + delta) }
                  else d.setDate(d.getDate() + opt.days)
                  patch({ due_date: d.toISOString().slice(0, 10) }); setPopover(null)
                }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm">
                  <FiCalendar className="w-3.5 h-3.5 text-[var(--text-muted)]" /> {opt.label}
                </button>
              ))}
              <div className="px-2 py-1.5 border-t border-[var(--stroke)]">
                <input
                  type="date"
                  defaultValue={task.due_date || ''}
                  onChange={(e) => { patch({ due_date: e.target.value || null }); setPopover(null) }}
                  className="w-full text-sm px-2 py-1 rounded border border-[var(--stroke)] bg-[var(--card-bg-opaque)]"
                />
              </div>
            </div>
          </Popover>
        )}
        {popover === 'labels' && task && (
          <Popover anchor={anchorRef.current.labels} onClose={() => setPopover(null)}>
            <div className="py-1 max-h-72 overflow-y-auto">
              {(cfg?.task_labels || []).length === 0 && (
                <div className="px-3 py-2 text-xs text-[var(--text-muted)]">No labels configured.</div>
              )}
              {(cfg?.task_labels || []).map(l => {
                const checked = Array.isArray(task.labels) && task.labels.includes(l.key)
                const tone = toneFor(l.color)
                return (
                  <label key={l.key} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = new Set(Array.isArray(task.labels) ? task.labels : [])
                        if (checked) next.delete(l.key); else next.add(l.key)
                        patch({ labels: [...next] })
                      }}
                      className="w-3.5 h-3.5 accent-[var(--accent)]"
                    />
                    <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
                    {l.label}
                  </label>
                )
              })}
            </div>
          </Popover>
        )}
        {popover === 'watcher' && task && (
          <Popover anchor={anchorRef.current.watcher} onClose={() => setPopover(null)}>
            <div className="py-1 max-h-72 overflow-y-auto">
              {(assignableUsers || []).map(u => {
                const uid = u.id || u._key
                const on = !!watchers.find(w => String(w.user_id) === String(uid))
                return (
                  <button key={uid} onClick={() => { toggleWatcher(uid); setPopover(null) }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm">
                    <UserAvatar name={u.name} size={18} />
                    <span>{u.name || u.emp_code}</span>
                    {on && <FiCheck className="ml-auto w-3 h-3 text-[var(--accent)]" />}
                  </button>
                )
              })}
            </div>
          </Popover>
        )}
      </aside>
    </div>
  )
}

function InlineAdd({ placeholder, onAdd }) {
  const [v, setV] = useState('')
  return (
    <div className="flex items-center gap-2 pt-1">
      <input
        type="checkbox" disabled
        className="w-4 h-4 rounded border-[var(--stroke)] opacity-40"
      />
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && v.trim()) { onAdd(v); setV('') } }}
        placeholder={placeholder}
        className="flex-1 text-sm px-2 py-1 rounded border border-[var(--stroke)] bg-[var(--card-bg-opaque)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
      />
    </div>
  )
}

function EntityLink({ label, value, href }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <FiLink2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
      <span className="text-[var(--text-muted)] w-20">{label}</span>
      {value ? (
        href ? (
          <a href={href} className="text-[var(--accent)] hover:underline flex items-center gap-1">
            {value} <FiChevronRight className="w-3 h-3" />
          </a>
        ) : <span>{value}</span>
      ) : (
        <span className="text-[var(--text-muted)] italic">Not linked</span>
      )}
    </div>
  )
}

function describeActivity(a) {
  if (!a) return ''
  switch (a.type) {
    case 'task.created': return 'created this task'
    case 'task.updated': {
      const changes = a.changes || a.payload?.changes || []
      if (!changes.length) return 'updated the task'
      const first = changes[0]
      if (first.field === 'status') return `moved status to ${first.to}`
      if (first.field === 'priority') return `changed priority to ${first.to}`
      if (first.field === 'assignee_id') return `reassigned`
      if (first.field === 'due_date') return `set due date to ${first.to || '—'}`
      return `updated ${first.field}`
    }
    case 'task.deleted': return 'deleted the task'
    case 'task.comment.created': return 'commented'
    case 'task.comment.deleted': return 'deleted a comment'
    case 'task.watcher.added': return 'added a watcher'
    case 'task.watcher.removed': return 'removed a watcher'
    case 'task.attachment.added': return 'added an attachment'
    case 'task.attachment.removed': return 'removed an attachment'
    default: return a.type || 'did something'
  }
}

function AssigneeAiSuggest({ token, task, byUser, onPick }) {
  const [sug, setSug] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const r = await api.aiSuggestAssignee(token, {
          title: task?.title || '',
          customer_id: task?.customer_id || null,
          lead_id: task?.lead_id || null,
          branch: task?.branch || null
        })
        if (!cancelled) setSug(r?.suggestions?.slice(0, 3) || [])
      } catch { if (!cancelled) setSug([]) }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?._key])

  if (loading) return <div className="px-3 py-1.5 text-[11px] text-[var(--text-muted)]">Finding best match…</div>
  if (!sug || sug.length === 0) return null

  return (
    <div className="border-b border-[var(--stroke)] pb-1 mb-1">
      <div className="px-3 pt-1 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">AI suggested</div>
      {sug.map(s => {
        const u = byUser.get(String(s.assignee_id))
        return (
          <button key={s.assignee_id} onClick={() => onPick(s.assignee_id)} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card-hover)] text-sm">
            <UserAvatar name={u?.name || s.assignee_emp_code || s.assignee_id} size={18} />
            <span className="flex-1 text-left">{u?.name || s.assignee_emp_code || s.assignee_id}</span>
            <span className="text-[10px] text-[var(--text-muted)]">{s.completed_count} similar</span>
          </button>
        )
      })}
    </div>
  )
}

function AiAssistPanel({ task, token }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [open, setOpen] = useState(false)

  const run = async () => {
    if (!task?._key) return
    setLoading(true)
    try {
      const r = await api.aiSummarizeTask(token, task._key)
      setResult(r)
      setOpen(true)
    } catch (err) {
      setResult({ summary: 'Unable to load AI summary right now.', next_actions: [], error: err.message })
      setOpen(true)
    } finally { setLoading(false) }
  }

  const schedule = async () => {
    if (!task?._key) return
    setLoading(true)
    try {
      const r = await api.aiScheduleTask(token, { task_id: task._key })
      if (r?.scheduled_date) {
        await api.updateTask(token, task._key, { scheduled_date: r.scheduled_date })
        setResult(prev => ({ ...(prev || {}), schedule_hint: `Scheduled for ${r.scheduled_date}. ${r.reason || ''}` }))
        setOpen(true)
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="rounded-lg border border-dashed border-[var(--stroke)] p-3 bg-[var(--card-bg-opaque)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">AI assist</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--stroke)] text-[var(--text-muted)]">Beta</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={run} disabled={loading} className="text-xs px-2 py-1 rounded border border-[var(--stroke)] hover:bg-[var(--card-hover)]">
            {loading ? 'Thinking…' : 'Summarise + next steps'}
          </button>
          <button onClick={schedule} disabled={loading} className="text-xs px-2 py-1 rounded border border-[var(--stroke)] hover:bg-[var(--card-hover)]">
            Auto-schedule
          </button>
        </div>
      </div>
      {open && result && (
        <div className="mt-2 space-y-2 text-sm">
          {result.summary && (
            <div className="text-[var(--text-primary)] whitespace-pre-wrap">{result.summary}</div>
          )}
          {Array.isArray(result.next_actions) && result.next_actions.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">Suggested next</div>
              <ul className="list-disc pl-5 space-y-0.5 text-[var(--text-primary)]">
                {result.next_actions.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
          {result.schedule_hint && (
            <div className="text-xs text-[var(--text-muted)]">{result.schedule_hint}</div>
          )}
          {!result.ai_enabled && (
            <div className="text-[10px] text-[var(--text-muted)]">Running in heuristic mode — set AI_ENABLED=1 on the server to route through an LLM.</div>
          )}
        </div>
      )}
    </div>
  )
}
