import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import {
  FiTarget,
  FiPlus,
  FiRefreshCw,
  FiEdit2,
  FiUserCheck
} from 'react-icons/fi'

const STAGES = ['New', 'Contacted', 'Meeting Scheduled', 'Met', 'Proposal Sent', 'Won', 'Lost']

export default function LeadsPage() {
  const { token, user } = useAuth()
  const [leads, setLeads] = useState([])
  const [assignableUsers, setAssignableUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    contact_phone: '',
    contact_email: '',
    stage: 'New',
    notes: '',
    assigned_to_id: ''
  })
  const [saving, setSaving] = useState(false)
  const [convertModal, setConvertModal] = useState(null)

  const loadLeads = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const q = { page: '1', limit: '200' }
      if (stageFilter) q.stage = stageFilter
      const res = await api.listLeads(token, q)
      setLeads(res.items || [])
    } catch (err) {
      setError(err.message || 'Failed to load leads')
      setLeads([])
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
      loadLeads()
      loadAssignableUsers()
    }
  }, [token, stageFilter])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    setSaving(true)
    try {
      await api.createLead(token, {
        name: formData.name.trim(),
        contact_phone: formData.contact_phone.trim() || undefined,
        contact_email: formData.contact_email.trim() || undefined,
        stage: formData.stage,
        notes: formData.notes.trim() || undefined,
        assigned_to_id: formData.assigned_to_id || undefined
      })
      setFormData({ name: '', contact_phone: '', contact_email: '', stage: 'New', notes: '', assigned_to_id: '' })
      setShowForm(false)
      loadLeads()
    } catch (err) {
      alert(err.message || 'Failed to create lead')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateStage = async (leadId, stage) => {
    try {
      await api.updateLead(token, leadId, { stage })
      loadLeads()
    } catch (err) {
      alert(err.message || 'Failed to update')
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!editingId) return
    setSaving(true)
    try {
      await api.updateLead(token, editingId, {
        name: formData.name.trim(),
        contact_phone: formData.contact_phone.trim() || undefined,
        contact_email: formData.contact_email.trim() || undefined,
        stage: formData.stage,
        notes: formData.notes.trim() || undefined,
        assigned_to_id: formData.assigned_to_id || undefined
      })
      setEditingId(null)
      loadLeads()
    } catch (err) {
      alert(err.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleConvert = async (leadId, customerPayload) => {
    try {
      await api.convertLeadToCustomer(token, leadId, { customer: customerPayload })
      setConvertModal(null)
      loadLeads()
      alert('Lead converted to customer successfully.')
    } catch (err) {
      alert(err.message || 'Failed to convert')
    }
  }

  const userById = (id) => assignableUsers.find((u) => u.id === id) || { name: '', emp_code: '' }

  const byStage = {}
  STAGES.forEach((s) => { byStage[s] = [] })
  leads.forEach((lead) => {
    if (byStage[lead.stage]) byStage[lead.stage].push(lead)
  })

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FiTarget className="w-7 h-7 text-red-600 dark:text-red-400" />
          Leads
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <FiPlus className="w-4 h-4" />
            Add lead
          </button>
          <button
            onClick={loadLeads}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
        <form onSubmit={handleCreate} className="mb-6 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">New lead</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              placeholder="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <input
              type="text"
              placeholder="Phone"
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <select
              value={formData.stage}
              onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={formData.assigned_to_id}
              onChange={(e) => setFormData({ ...formData, assigned_to_id: e.target.value })}
              className="sm:col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Assign to...</option>
              {assignableUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.emp_code})</option>
              ))}
            </select>
            <textarea
              placeholder="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="sm:col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mb-4">
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        >
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-500 dark:text-gray-400 py-8">Loading leads...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {STAGES.map((stage) => (
            <div key={stage} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex justify-between items-center">
                <span>{stage}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{(byStage[stage] || []).length}</span>
              </h3>
              <ul className="space-y-2">
                {(byStage[stage] || []).map((lead) => (
                  <li
                    key={lead._key}
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  >
                    <p className="font-medium text-gray-900 dark:text-white truncate">{lead.name}</p>
                    {lead.contact_phone && <p className="text-xs text-gray-500 dark:text-gray-400">{lead.contact_phone}</p>}
                    <div className="flex flex-wrap gap-1 mt-2">
                      <select
                        value={lead.stage}
                        onChange={(e) => handleUpdateStage(lead._key, e.target.value)}
                        className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {lead.stage !== 'Won' && lead.stage !== 'Lost' && (
                        <button
                          onClick={() => setConvertModal(lead)}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                        >
                          <FiUserCheck className="w-3 h-3" />
                          Convert
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingId(lead._key)
                          setFormData({
                            name: lead.name || '',
                            contact_phone: lead.contact_phone || '',
                            contact_email: lead.contact_email || '',
                            stage: lead.stage || 'New',
                            notes: lead.notes || '',
                            assigned_to_id: lead.assigned_to_id || ''
                          })
                        }}
                        className="text-xs px-2 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        Edit
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleUpdate} className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-gray-900 dark:text-white">Edit lead</h3>
            <input
              type="text"
              required
              placeholder="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <input type="text" placeholder="Phone" value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            <input type="email" placeholder="Email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            <select value={formData.stage} onChange={(e) => setFormData({ ...formData, stage: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <textarea placeholder="Notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" rows={2} />
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">Save</button>
              <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {convertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Convert to customer</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Lead &quot;{convertModal.name}&quot; will be created as a customer. Add PAN and other required details below (or in Customer Management after creation).
            </p>
            <ConvertForm
              lead={convertModal}
              onSave={(payload) => handleConvert(convertModal._key, payload)}
              onCancel={() => setConvertModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function ConvertForm({ lead, onSave, onCancel }) {
  const [payload, setPayload] = useState({
    name: lead.name || '',
    pan: '',
    email: lead.contact_email || '',
    mobile: lead.contact_phone || ''
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSaving(true)
    onSave(payload)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="text" required placeholder="Name" value={payload.name} onChange={(e) => setPayload({ ...payload, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
      <input type="text" placeholder="PAN" value={payload.pan} onChange={(e) => setPayload({ ...payload, pan: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
      <input type="email" placeholder="Email" value={payload.email} onChange={(e) => setPayload({ ...payload, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
      <input type="text" placeholder="Mobile" value={payload.mobile} onChange={(e) => setPayload({ ...payload, mobile: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">Convert</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}
