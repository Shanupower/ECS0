import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from './AuthContext'

// URL-synced filter keys. Anything here survives refresh + is shareable.
const URL_KEYS = [
  'view',       // list | kanban | calendar
  'group',      // status | assignee | priority | label | branch | customer | none
  'sort',       // due | priority | created | updated | title
  'q',          // text search
  'status',     // comma-separated
  'priority',   // comma-separated p0..p3
  'label',      // comma-separated label keys
  'assignee',   // _key or emp_code; special value "me"
  'branch',     // branch code
  'due',        // today | upcoming
  'archived',   // 1 | all | 0 (default)
  'sla_breached',
  'customer',
  'lead',
  'receipt'
]

const DEFAULT_FILTERS = {
  view: null,     // resolved from app-config by consumer
  group: 'status',
  sort: 'due',
  q: '',
  status: '',
  priority: '',
  label: '',
  assignee: 'me',
  branch: '',
  due: '',
  archived: '0',
  sla_breached: '',
  customer: '',
  lead: '',
  receipt: ''
}

const TasksCtx = createContext(null)

export function TasksProvider({ children }) {
  const { token, user } = useAuth() || {}
  const [params, setParams] = useSearchParams()

  // Extract filter state from URL.
  const filters = useMemo(() => {
    const out = { ...DEFAULT_FILTERS }
    for (const k of URL_KEYS) {
      const v = params.get(k)
      if (v != null) out[k] = v
    }
    return out
  }, [params])

  const setFilter = useCallback((patch) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) {
        if (v === '' || v == null) next.delete(k)
        else next.set(k, String(v))
      }
      return next
    }, { replace: true })
  }, [setParams])

  const resetFilters = useCallback(() => {
    setParams(new URLSearchParams(), { replace: true })
  }, [setParams])

  // ------------------------------------------------------------------
  // Data: tasks list + stats + assignable users
  // ------------------------------------------------------------------
  const [tasks, setTasks] = useState([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [assignableUsers, setAssignableUsers] = useState([])
  const lastLoadIdRef = useRef(0)

  const buildQuery = useCallback((overrides = {}) => {
    const f = { ...filters, ...overrides }
    const q = { page: '1', limit: '200' }
    if (f.status) q.status = f.status
    if (f.priority) q.priority = f.priority
    if (f.label) q.label = f.label
    if (f.q) q.q = f.q
    if (f.branch) q.branch = f.branch
    if (f.due) q.due = f.due
    if (f.archived === '1') q.archived = '1'
    else if (f.archived === 'all') q.archived = 'all'
    if (f.sla_breached) q.sla_breached = '1'
    if (f.customer) q.customer_id = f.customer
    if (f.lead) q.lead_id = f.lead
    if (f.receipt) q.receipt_id = f.receipt
    if (f.assignee && f.assignee !== 'all') {
      if (f.assignee === '__unassigned') q.assignee_id = '__none'
      else q.assignee_id = f.assignee === 'me' ? (user?.id || user?.sub || user?.emp_code) : f.assignee
    }
    if (f.sort) q.sort = f.sort
    return q
  }, [filters, user])

  const load = useCallback(async () => {
    if (!token) return
    const id = ++lastLoadIdRef.current
    setLoading(true)
    setError('')
    try {
      const [list, stat] = await Promise.all([
        api.listTasks(token, buildQuery()),
        api.getTasksStats(token).catch(() => null)
      ])
      if (id !== lastLoadIdRef.current) return // superseded
      setTasks(Array.isArray(list?.items) ? list.items : [])
      setTotal(list?.total || 0)
      if (stat) setStats(stat)
    } catch (err) {
      if (id !== lastLoadIdRef.current) return
      setError(err?.message || 'Failed to load tasks')
      setTasks([])
      setTotal(0)
    } finally {
      if (id === lastLoadIdRef.current) setLoading(false)
    }
  }, [token, buildQuery])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!token) return
    api.listAssignableUsers(token).then(list => setAssignableUsers(Array.isArray(list) ? list : [])).catch(() => setAssignableUsers([]))
  }, [token])

  // ------------------------------------------------------------------
  // Optimistic mutations
  // ------------------------------------------------------------------
  const patchLocal = useCallback((id, patch) => {
    setTasks(prev => prev.map(t => (t._key === id ? { ...t, ...patch } : t)))
  }, [])

  const replaceLocal = useCallback((next) => {
    setTasks(prev => prev.map(t => (t._key === next._key ? next : t)))
  }, [])

  const updateTask = useCallback(async (id, patch) => {
    const before = tasks.find(t => t._key === id)
    patchLocal(id, patch)
    try {
      const updated = await api.updateTask(token, id, patch)
      replaceLocal(updated)
      return updated
    } catch (err) {
      if (before) replaceLocal(before) // rollback
      throw err
    }
  }, [tasks, token, patchLocal, replaceLocal])

  const bulkUpdate = useCallback(async (ids, patch) => {
    const snapshot = tasks.filter(t => ids.includes(t._key)).map(t => ({ ...t }))
    setTasks(prev => prev.map(t => ids.includes(t._key) ? { ...t, ...patch } : t))
    try {
      await api.bulkUpdateTasks(token, ids, patch)
      await load()
    } catch (err) {
      // rollback
      setTasks(prev => prev.map(t => {
        const s = snapshot.find(x => x._key === t._key)
        return s || t
      }))
      throw err
    }
  }, [tasks, token, load])

  const createTask = useCallback(async (data) => {
    const created = await api.createTask(token, data)
    setTasks(prev => [created, ...prev])
    load()
    return created
  }, [token, load])

  const deleteTask = useCallback(async (id) => {
    const before = tasks.find(t => t._key === id)
    setTasks(prev => prev.filter(t => t._key !== id))
    try {
      await api.deleteTask(token, id)
    } catch (err) {
      if (before) setTasks(prev => [before, ...prev])
      throw err
    }
  }, [tasks, token])

  // ------------------------------------------------------------------
  // Update hook ready for a websocket subscriber later.
  const applyRemoteUpdate = useCallback((doc) => {
    if (!doc || !doc._key) return
    setTasks(prev => {
      const idx = prev.findIndex(t => t._key === doc._key)
      if (idx === -1) return [doc, ...prev]
      const next = prev.slice()
      next[idx] = doc
      return next
    })
  }, [])
  const removeRemote = useCallback((id) => {
    setTasks(prev => prev.filter(t => t._key !== id))
  }, [])

  const value = useMemo(() => ({
    filters, setFilter, resetFilters,
    tasks, total, stats, loading, error,
    reload: load,
    assignableUsers,
    createTask, updateTask, bulkUpdate, deleteTask,
    applyRemoteUpdate, removeRemote,
    patchLocal
  }), [filters, setFilter, resetFilters, tasks, total, stats, loading, error, load, assignableUsers, createTask, updateTask, bulkUpdate, deleteTask, applyRemoteUpdate, removeRemote, patchLocal])

  return <TasksCtx.Provider value={value}>{children}</TasksCtx.Provider>
}

export function useTasks() {
  const ctx = useContext(TasksCtx)
  if (!ctx) throw new Error('useTasks must be used inside <TasksProvider>')
  return ctx
}

export function useTasksOptional() {
  return useContext(TasksCtx)
}
