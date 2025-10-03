import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { 
  FiPlus, 
  FiEdit, 
  FiTrash2, 
  FiUsers, 
  FiMapPin, 
  FiSave, 
  FiX,
  FiEye,
  FiRefreshCw,
  FiAlertCircle,
  FiCheck
} from 'react-icons/fi'

export default function BranchManagement() {
  const { token, user } = useAuth()
  const [branches, setBranches] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [showUserAssignment, setShowUserAssignment] = useState(false)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin, token])

  const loadData = async () => {
    if (!token) return
    
    setLoading(true)
    setError('')
    
    try {
      const [branchesData, usersData] = await Promise.all([
        api.listBranches(token),
        api.listUsers(token)
      ])
      
      setBranches(branchesData)
      setUsers(usersData)
      
    } catch (err) {
      console.error('Data load error:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBranch = async (branchData) => {
    if (!token) return
    
    try {
      const newBranch = await api.createBranch(token, branchData)
      setBranches(prev => [...prev, newBranch.branch])
      setShowCreateForm(false)
      setSuccess('Branch created successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to create branch')
    }
  }

  const handleUpdateBranch = async (branchCode, updateData) => {
    if (!token) return
    
    try {
      const updatedBranch = await api.updateBranch(token, branchCode, updateData)
      setBranches(prev => prev.map(b => 
        b.branch_code === branchCode ? updatedBranch.branch : b
      ))
      setEditingBranch(null)
      setSuccess('Branch updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update branch')
    }
  }

  const handleDeleteBranch = async (branchCode) => {
    if (!token) return
    
    if (!confirm('Are you sure you want to delete this branch?')) return
    
    try {
      await api.deleteBranch(token, branchCode)
      setBranches(prev => prev.filter(b => b.branch_code !== branchCode))
      setSuccess('Branch deleted successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to delete branch')
    }
  }

  const handleAssignUsers = async (branchCode, userIds) => {
    if (!token) return
    
    try {
      await api.assignUsersToBranch(token, branchCode, userIds)
      setShowUserAssignment(false)
      setSuccess('Users assigned to branch successfully!')
      setTimeout(() => setSuccess(''), 3000)
      loadData() // Reload to get updated user assignments
    } catch (err) {
      setError(err.message || 'Failed to assign users to branch')
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center">
          <FiAlertCircle className="h-5 w-5 mr-2" />
          Access denied. This page is only available to administrators.
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Branch Management</h1>
          <p className="text-gray-600 dark:text-dark-400 mt-1">Create and manage branches, assign users</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <FiRefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800 transition-colors duration-200"
          >
            <FiPlus className="w-4 h-4 mr-2" />
            Create Branch
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg flex items-center">
          <FiCheck className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center">
          <FiAlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Create Branch Form */}
      {showCreateForm && (
        <CreateBranchForm 
          onSubmit={handleCreateBranch}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Edit Branch Form */}
      {editingBranch && (
        <EditBranchForm 
          branch={editingBranch}
          onSubmit={(data) => handleUpdateBranch(editingBranch.branch_code, data)}
          onCancel={() => setEditingBranch(null)}
        />
      )}

      {/* User Assignment Modal */}
      {showUserAssignment && selectedBranch && (
        <UserAssignmentModal 
          branch={selectedBranch}
          users={users}
          onSubmit={(userIds) => handleAssignUsers(selectedBranch.branch_code, userIds)}
          onCancel={() => setShowUserAssignment(false)}
        />
      )}

      {/* Branches List */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">All Branches</h3>
          
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              <span className="ml-2 text-gray-600 dark:text-dark-400">Loading branches...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-dark-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Branch Code</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Branch Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Users</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((branch) => (
                    <tr key={branch.branch_code} className="border-b border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700">
                      <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">{branch.branch_code}</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">{branch.branch_name}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-dark-400">{branch.branch_type || 'Operational'}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-dark-400">
                        {users.filter(u => u.branch_code === branch.branch_code).length} users
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          branch.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {branch.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedBranch(branch)
                              setShowUserAssignment(true)
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors duration-200"
                            title="Assign Users"
                          >
                            <FiUsers className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingBranch(branch)}
                            className="p-2 text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg transition-colors duration-200"
                            title="Edit Branch"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBranch(branch.branch_code)}
                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-200"
                            title="Delete Branch"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Create Branch Form Component
function CreateBranchForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    branch_code: '',
    branch_name: '',
    branch_type: 'operational',
    address: '',
    phone: '',
    email: '',
    password: 'password123'
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New Branch</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Branch Code *</label>
            <input
              type="text"
              value={formData.branch_code}
              onChange={(e) => setFormData(prev => ({ ...prev, branch_code: e.target.value.toUpperCase() }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="e.g., MEDAK"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Branch Name *</label>
            <input
              type="text"
              value={formData.branch_name}
              onChange={(e) => setFormData(prev => ({ ...prev, branch_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="e.g., Medak Branch"
              required
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Branch Type</label>
          <select
            value={formData.branch_type}
            onChange={(e) => setFormData(prev => ({ ...prev, branch_type: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="operational">Operational</option>
            <option value="head_office">Head Office</option>
            <option value="regional">Regional</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Address</label>
          <textarea
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            rows="3"
            placeholder="Branch address"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Phone number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Email address"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Branch Password</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Branch login password"
            required
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-dark-400 hover:text-gray-800 dark:hover:text-dark-200 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800 transition-colors duration-200"
          >
            Create Branch
          </button>
        </div>
      </form>
    </div>
  )
}

// Edit Branch Form Component
function EditBranchForm({ branch, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    branch_name: branch.branch_name || '',
    branch_type: branch.branch_type || 'operational',
    address: branch.address || '',
    phone: branch.phone || '',
    email: branch.email || '',
    password: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const updateData = { ...formData }
    if (!updateData.password) delete updateData.password
    onSubmit(updateData)
  }

  return (
    <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit Branch: {branch.branch_code}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Branch Name *</label>
          <input
            type="text"
            value={formData.branch_name}
            onChange={(e) => setFormData(prev => ({ ...prev, branch_name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Branch Type</label>
          <select
            value={formData.branch_type}
            onChange={(e) => setFormData(prev => ({ ...prev, branch_type: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="operational">Operational</option>
            <option value="head_office">Head Office</option>
            <option value="regional">Regional</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Address</label>
          <textarea
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            rows="3"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">New Password (leave empty to keep current)</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Enter new password"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-dark-400 hover:text-gray-800 dark:hover:text-dark-200 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800 transition-colors duration-200"
          >
            Update Branch
          </button>
        </div>
      </form>
    </div>
  )
}

// User Assignment Modal Component
function UserAssignmentModal({ branch, users, onSubmit, onCancel }) {
  const [selectedUserIds, setSelectedUserIds] = useState([])

  const handleUserToggle = (userId) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(selectedUserIds)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Assign Users to {branch.branch_name}
            </h3>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="max-h-96 overflow-y-auto mb-4">
              <div className="space-y-2">
                {users.map((user) => (
                  <label key={user.id} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-dark-700 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => handleUserToggle(user.id)}
                      className="mr-3 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                      <div className="text-xs text-gray-500 dark:text-dark-400">
                        {user.emp_code} • {user.role} • Current: {user.branch || 'No branch'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-600 dark:text-dark-400 hover:text-gray-800 dark:hover:text-dark-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800 transition-colors duration-200"
              >
                Assign {selectedUserIds.length} Users
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
