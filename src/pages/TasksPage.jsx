import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import {
  FiCheckSquare,
  FiPlus,
  FiRefreshCw,
  FiEdit2,
  FiTrash2,
  FiCircle,
  FiCheckCircle,
  FiChevronDown,
  FiFilter
} from 'react-icons/fi'
import DatePickerInput from '../components/ui/DatePickerInput.jsx'

const today = () => new Date().toISOString().slice(0, 10)
const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' }
]
const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
]

function groupTasks(tasks) {
  const t = today()
  const overdue = []
  const dueToday = []
  const upcoming = []
  const done = []
  for (const task of tasks) {
    if (task.status === 'done' || task.status === 'cancelled') {
      done.push(task)
    } else if (task.due_date && task.due_date < t) {
      overdue.push(task)
    } else if (task.due_date && task.due_date === t) {
      dueToday.push(task)
    } else {
      upcoming.push(task)
    }
  }
  return { overdue, dueToday, upcoming, done }
}

export default function TasksPage() {
  const { token, user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [assignableUsers, setAssignableUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    assignee_id: '',
    priority: 'medium'
  })
  const [saving, setSaving] = useState(false)

  const loadTasks = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const q = { page: '1', limit: '200' }
      if (statusFilter) q.status = statusFilter
      if (assigneeFilter) q.assignee_id = assigneeFilter
      const res = await api.listTasks(token, q)
      setTasks(res.items || [])
    } catch (err) {
      setError(err.message || 'Failed to load tasks')
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  const loadAssignableUsers = async () => {
    if (!token) return
    try {
      const list = await api.listAssignableUsers(token)
      setAssignableUsers(Array.isArray(list) ? list : [])
    } catch {
      setAssignableUsers([])
    }
  }

  useEffect(() => {
    if (token) {
      loadTasks()
      loadAssignableUsers()
    }
  }, [token, statusFilter, assigneeFilter])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!formData.title.trim()) return
    setSaving(true)
    try {
      await api.createTask(token, {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        due_date: formData.due_date || undefined,
        assignee_id: formData.assignee_id || undefined,
        priority: formData.priority
      })
      setFormData({ title: '', description: '', due_date: '', assignee_id: '', priority: 'medium' })
      setShowForm(false)
      loadTasks()
    } catch (err) {
      alert(err.message || 'Failed to create task')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateStatus = async (taskId, status) => {
    try {
      await api.updateTask(token, taskId, { status })
      loadTasks()
    } catch (err) {
      alert(err.message || 'Failed to update')
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!editingId || !formData.title.trim()) return
    setSaving(true)
    try {
      await api.updateTask(token, editingId, {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        due_date: formData.due_date || undefined,
        priority: formData.priority
      })
      setEditingId(null)
      setFormData({ title: '', description: '', due_date: '', assignee_id: '', priority: 'medium' })
      loadTasks()
    } catch (err) {
      alert(err.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (taskId) => {
    if (!confirm('Delete this task?')) return
    try {
      await api.deleteTask(token, taskId)
      loadTasks()
    } catch (err) {
      alert(err.message || 'Failed to delete')
    }
  }

  const startEdit = (task) => {
    setEditingId(task._key)
    setFormData({
      title: task.title || '',
      description: task.description || '',
      due_date: task.due_date || '',
      assignee_id: task.assignee_id || '',
      priority: task.priority || 'medium'
    })
  }

  const { overdue, dueToday, upcoming, done } = groupTasks(tasks)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <FiCheckSquare className="w-7 h-7 text-red-600 dark:text-red-400" />
          Tasks
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <FiPlus className="w-4 h-4" />
            Add task
          </button>
          <button
            onClick={loadTasks}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] space-y-3">
          <h3 className="font-semibold text-[var(--text-primary)]">New task</h3>
          <input
            type="text"
            required
            placeholder="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
          />
          <textarea
            placeholder="Description (optional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
            rows={2}
          />
          <div className="flex flex-wrap gap-3 items-center">
            <DatePickerInput
              value={formData.due_date}
              onChange={(v) => setFormData({ ...formData, due_date: v })}
              inputClassName="px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
              ariaLabel="Due date"
            />
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
            >
              {priorityOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={formData.assignee_id}
              onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
              className="px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
            >
              <option value="">Assign to...</option>
              {assignableUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.emp_code})</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-[var(--stroke)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
        >
          {statusOptions.map((o) => (
            <option key={o.value || 'all'} value={o.value}>{o.label}</option>
          ))}
        </select>
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
          >
            <option value="">All assignees</option>
            {assignableUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="text-[var(--text-muted)] py-8">Loading tasks...</div>
      ) : (
        <div className="space-y-6">
          {overdue.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">Overdue</h2>
              <TaskList
                tasks={overdue}
                onStatusChange={handleUpdateStatus}
                onEdit={startEdit}
                onDelete={handleDelete}
                assignableUsers={assignableUsers}
              />
            </section>
          )}
          {dueToday.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-amber-700 dark:text-amber-400 mb-2">Due today</h2>
              <TaskList
                tasks={dueToday}
                onStatusChange={handleUpdateStatus}
                onEdit={startEdit}
                onDelete={handleDelete}
                assignableUsers={assignableUsers}
              />
            </section>
          )}
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Upcoming</h2>
              <TaskList
                tasks={upcoming}
                onStatusChange={handleUpdateStatus}
                onEdit={startEdit}
                onDelete={handleDelete}
                assignableUsers={assignableUsers}
              />
            </section>
          )}
          {done.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-[var(--text-secondary)] mb-2">Done</h2>
              <TaskList
                tasks={done}
                onStatusChange={handleUpdateStatus}
                onEdit={startEdit}
                onDelete={handleDelete}
                assignableUsers={assignableUsers}
              />
            </section>
          )}
          {tasks.length === 0 && (
          <p className="text-[var(--text-muted)] py-8">No tasks yet. Add one above.</p>
          )}
        </div>
      )}

      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleUpdate} className="bg-[var(--card-bg)] border border-[var(--stroke)] rounded-xl shadow-xl max-w-md w-full p-6 space-y-3">
            <h3 className="font-semibold text-[var(--text-primary)]">Edit task</h3>
            <input
              type="text"
              required
              placeholder="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
              rows={2}
            />
            <div className="flex gap-2">
              <DatePickerInput
                value={formData.due_date}
                onChange={(v) => setFormData({ ...formData, due_date: v })}
                inputClassName="flex-1 px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
                ariaLabel="Due date"
              />
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="px-3 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
              >
                {priorityOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                Save
              </button>
              <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 border border-[var(--stroke)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function TaskList({ tasks, onStatusChange, onEdit, onDelete, assignableUsers }) {
  const userById = (id) => assignableUsers.find((u) => u.id === id) || { name: '', emp_code: '' }
  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li
          key={task._key}
          className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
            {task.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{task.description}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
              {task.due_date && <span>Due: {task.due_date}</span>}
              {task.assignee_emp_code && <span>Assignee: {userById(task.assignee_id)?.name || task.assignee_emp_code}</span>}
              <span className="capitalize">{task.priority}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {task.status !== 'done' && task.status !== 'cancelled' && (
              <>
                {task.status !== 'in_progress' && (
                  <button
                    onClick={() => onStatusChange(task._key, 'in_progress')}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                    title="Mark in progress"
                  >
                    <FiCircle className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => onStatusChange(task._key, 'done')}
                  className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400"
                  title="Mark done"
                >
                  <FiCheckCircle className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={() => onEdit(task)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400" title="Edit">
              <FiEdit2 className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(task._key)} className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400" title="Delete">
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
