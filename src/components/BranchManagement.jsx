import React, { useState, useEffect, useMemo, useRef } from 'react'
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
  FiCheck,
  FiSearch,
  FiBarChart,
  FiTrendingUp
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
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [allBranches, setAllBranches] = useState([])
  const [viewMode, setViewMode] = useState('card')
  const [selectedBranchForInsights, setSelectedBranchForInsights] = useState(null)
  const [branchInsightsData, setBranchInsightsData] = useState(null)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const branchEditFormRef = useRef(null)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (!editingBranch) return
    requestAnimationFrame(() => {
      branchEditFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [editingBranch])

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
      setAllBranches(branchesData)
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

  // Filter branches based on search and filters
  const filteredBranches = useMemo(() => {
    let filtered = allBranches
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(b => 
        b.branch_name?.toLowerCase().includes(term) ||
        b.branch_code?.toLowerCase().includes(term) ||
        b.address?.toLowerCase().includes(term)
      )
    }
    
    if (filterType) {
      filtered = filtered.filter(b => b.branch_type === filterType)
    }
    
    if (filterStatus) {
      filtered = filtered.filter(b => 
        filterStatus === 'active' ? b.is_active : !b.is_active
      )
    }
    
    return filtered
  }, [allBranches, searchTerm, filterType, filterStatus])

  useEffect(() => {
    setBranches(filteredBranches)
  }, [filteredBranches])

  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-6">
        <div className="inline-flex items-center px-4 py-3 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--error)]">
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
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">Branch Management</h1>
          <p className="text-[var(--text-secondary)] mt-1">Create and manage branches, assign users</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center px-4 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <FiRefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              setEditingBranch(null)
              setShowCreateForm(true)
            }}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800 transition-colors duration-200"
          >
            <FiPlus className="w-4 h-4 mr-2" />
            Create Branch
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="px-4 py-3 rounded-lg border border-[var(--success)]/70 bg-[var(--success-muted)] text-[var(--success)] flex items-center">
          <FiCheck className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-lg border border-[var(--error)]/70 bg-[var(--error-muted)] text-[var(--error)] flex items-center">
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
      <div ref={branchEditFormRef}>
        {editingBranch && (
          <EditBranchForm 
            branch={editingBranch}
            onSubmit={(data) => handleUpdateBranch(editingBranch.branch_code, data)}
            onCancel={() => setEditingBranch(null)}
          />
        )}
      </div>

      {/* User Assignment Modal */}
      {showUserAssignment && selectedBranch && (
        <UserAssignmentModal 
          branch={selectedBranch}
          users={users}
          onSubmit={(userIds) => handleAssignUsers(selectedBranch.branch_code, userIds)}
          onCancel={() => setShowUserAssignment(false)}
        />
      )}

      {/* Search and Filter Bar */}
      <div className="p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-4 w-4 text-[var(--text-muted)]" />
              </div>
              <input
                type="text"
                placeholder="Search branches by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="">All Types</option>
              <option value="operational">Operational</option>
              <option value="head_office">Head Office</option>
              <option value="regional">Regional</option>
            </select>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Branches Grid - Card View */}
      <div className="rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">All Branches ({branches.length})</h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setViewMode('card')}
                className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                  viewMode === 'card'
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                    : 'border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]'
                }`}>
                Card View
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                  viewMode === 'table'
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                    : 'border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]'
                }`}>
                Table View
              </button>
            </div>
          </div>
          
          {viewMode === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--stroke)]/70 bg-[var(--card-hover)]">
                    <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Branch Code</th>
                    <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Branch Name</th>
                    <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Type</th>
                    <th className="text-right py-3 px-4 font-medium text-[var(--text-secondary)]">Monthly target</th>
                    <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Users</th>
                    <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-[var(--text-secondary)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--card-bg)]">
                  {branches.map((branch) => (
                    <tr
                      key={branch.branch_code}
                      className="border-b border-[var(--stroke)]/60 hover:bg-[var(--card-bg-opaque)]"
                    >
                      <td className="py-3 px-4 text-[var(--text-primary)] font-medium">
                        {branch.branch_code}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-primary)]">
                        {branch.branch_name}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">
                        {branch.branch_type || 'Operational'}
                      </td>
                      <td className="py-3 px-4 text-right text-[var(--text-secondary)] tabular-nums">
                        {branch.monthly_target != null && branch.monthly_target !== ''
                          ? `₹${Number(branch.monthly_target).toLocaleString('en-IN')}`
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">
                        {users.filter((u) => u.branch_code === branch.branch_code).length} users
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            branch.is_active
                              ? 'bg-[var(--success-muted)] text-[var(--success)]'
                              : 'bg-[var(--error-muted)] text-[var(--error)]'
                          }`}
                        >
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
                            className="p-2 rounded-lg text-[var(--accent)] hover:bg-[var(--accent-muted)]/40 transition-colors duration-200"
                            title="Assign Users"
                          >
                            <FiUsers className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBranchForInsights(branch)
                            }}
                            className="p-2 rounded-lg text-[var(--info)] hover:bg-[var(--info-muted)]/40 transition-colors duration-200"
                            title="View Performance"
                          >
                            <FiBarChart className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setShowCreateForm(false)
                              setEditingBranch(branch)
                            }}
                            className="p-2 rounded-lg text-[var(--warn)] hover:bg-[var(--warn-muted)]/40 transition-colors duration-200"
                            title="Edit Branch"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBranch(branch.branch_code)}
                            className="p-2 rounded-lg text-[var(--error)] hover:bg-[var(--error-muted)]/40 transition-colors duration-200"
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
          
          {viewMode === 'card' && (
            loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                <span className="ml-2 text-[var(--text-secondary)]">Loading branches...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {branches.map((branch) => {
                  const branchUsers = users.filter((u) => u.branch_code === branch.branch_code)
                  return (
                    <div
                      key={branch.branch_code}
                      className="rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg-opaque)] hover:bg-[var(--card-hover)] transition-all duration-200 p-5"
                    >
                      {/* Branch Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-[var(--error-muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                            <FiMapPin className="w-6 h-6 text-[var(--error)]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-bold text-[var(--text-primary)] truncate">
                              {branch.branch_name}
                            </h4>
                            <p className="text-sm text-[var(--text-secondary)]">{branch.branch_code}</p>
                            <span
                              className={`inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-medium ${
                                branch.is_active
                                  ? 'bg-[var(--success-muted)] text-[var(--success)]'
                                  : 'bg-[var(--error-muted)] text-[var(--error)]'
                              }`}
                            >
                              {branch.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Branch Stats */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-3 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg)]">
                          <div className="text-xs text-[var(--text-secondary)] mb-1">Users</div>
                          <div className="text-xl font-bold text-[var(--text-primary)]">{branchUsers.length}</div>
                        </div>
                        <div className="p-3 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg)]">
                          <div className="text-xs text-[var(--text-secondary)] mb-1">Type</div>
                          <div className="text-sm font-semibold text-[var(--text-primary)] capitalize">
                            {branch.branch_type || 'Operational'}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg)] col-span-2">
                          <div className="text-xs text-[var(--text-secondary)] mb-1">Monthly target (₹)</div>
                          <div className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                            {branch.monthly_target != null && branch.monthly_target !== ''
                              ? `₹${Number(branch.monthly_target).toLocaleString('en-IN')}`
                              : '—'}
                          </div>
                        </div>
                      </div>

                      {/* Branch Info */}
                      {branch.address && (
                        <div className="mb-4 text-sm text-[var(--text-secondary)] line-clamp-2">
                          {branch.address}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-4 border-t border-[var(--stroke)]/70">
                        <button
                          onClick={() => {
                            setSelectedBranch(branch)
                            setShowUserAssignment(true)
                          }}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg bg-[var(--accent-muted)] text-[var(--accent)] hover:bg-[var(--accent-muted)]/80 text-sm font-medium transition-colors"
                          title="Assign Users"
                        >
                          <FiUsers className="w-4 h-4 mr-1.5" />
                          Users ({branchUsers.length})
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBranchForInsights(branch)
                          }}
                          className="px-3 py-2 rounded-lg bg-[var(--info-muted)] text-[var(--info)] hover:bg-[var(--info-muted)]/80 transition-colors"
                          title="View Performance"
                        >
                          <FiBarChart className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setShowCreateForm(false)
                            setEditingBranch(branch)
                          }}
                          className="px-3 py-2 rounded-lg bg-[var(--warn-muted)] text-[var(--warn)] hover:bg-[var(--warn-muted)]/80 transition-colors"
                          title="Edit Branch"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBranch(branch.branch_code)}
                          className="px-3 py-2 rounded-lg bg-[var(--error-muted)] text-[var(--error)] hover:bg-[var(--error-muted)]/80 transition-colors"
                          title="Delete Branch"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {!loading && branches.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-dark-400">
              <FiMapPin className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-dark-600" />
              <p>No branches found</p>
            </div>
          )}
        </div>
      </div>

      {/* Branch Performance Insights Modal */}
      {selectedBranchForInsights && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedBranchForInsights(null)}>
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Performance Insights: {selectedBranchForInsights.branch_name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-dark-400 mt-1">
                    {selectedBranchForInsights.branch_code}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedBranchForInsights(null)
                    setBranchInsightsData(null)
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              
              {loadingInsights ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                  <span className="ml-2 text-gray-600 dark:text-dark-400">Loading insights...</span>
                </div>
              ) : branchInsightsData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-dark-700 p-4 rounded-lg">
                      <div className="text-sm text-gray-500 dark:text-dark-400 mb-1">Total Receipts</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {branchInsightsData.statistics?.total_receipts || 0}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-700 p-4 rounded-lg">
                      <div className="text-sm text-gray-500 dark:text-dark-400 mb-1">Total Investments</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(branchInsightsData.statistics?.total_investments || 0)}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-700 p-4 rounded-lg">
                      <div className="text-sm text-gray-500 dark:text-dark-400 mb-1">Collection/Credit</div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(branchInsightsData.statistics?.collection_credit || branchInsightsData.statistics?.commissions || 0)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        window.location.href = `/branches/dashboard?branch=${selectedBranchForInsights.branch_code}`
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      View Full Dashboard
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-dark-400">
                  <FiBarChart className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-dark-600" />
                  <p>No performance data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
    monthly_target: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = { ...formData }
    if (payload.monthly_target === '' || payload.monthly_target == null) {
      payload.monthly_target = null
    } else {
      payload.monthly_target = Number(payload.monthly_target)
    }
    onSubmit(payload)
  }

  return (
    <div className="p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Create New Branch</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Branch Code *</label>
            <input
              type="text"
              value={formData.branch_code}
              onChange={(e) => setFormData(prev => ({ ...prev, branch_code: e.target.value.toUpperCase() }))}
              className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="e.g., MEDAK"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Branch Name *</label>
            <input
              type="text"
              value={formData.branch_name}
              onChange={(e) => setFormData(prev => ({ ...prev, branch_name: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="e.g., Medak Branch"
              required
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Branch Type</label>
          <select
            value={formData.branch_type}
            onChange={(e) => setFormData(prev => ({ ...prev, branch_type: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
          >
            <option value="operational">Operational</option>
            <option value="head_office">Head Office</option>
            <option value="regional">Regional</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Monthly target (₹)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={formData.monthly_target}
            onChange={(e) => setFormData(prev => ({ ...prev, monthly_target: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
            placeholder="Optional — branch CC target for dashboard"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Address</label>
          <textarea
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
            rows="3"
            placeholder="Branch address"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="Phone number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="Email address"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200"
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
    monthly_target: branch.monthly_target != null ? String(branch.monthly_target) : ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const updateData = { ...formData }
    if (updateData.monthly_target === '' || updateData.monthly_target == null) {
      updateData.monthly_target = null
    } else {
      updateData.monthly_target = Number(updateData.monthly_target)
    }
    onSubmit(updateData)
  }

  return (
    <div className="p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Edit Branch: {branch.branch_code}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Branch Name *</label>
          <input
            type="text"
            value={formData.branch_name}
            onChange={(e) => setFormData(prev => ({ ...prev, branch_name: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Branch Type</label>
          <select
            value={formData.branch_type}
            onChange={(e) => setFormData(prev => ({ ...prev, branch_type: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
          >
            <option value="operational">Operational</option>
            <option value="head_office">Head Office</option>
            <option value="regional">Regional</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Monthly target (₹)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={formData.monthly_target}
            onChange={(e) => setFormData(prev => ({ ...prev, monthly_target: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Address</label>
          <textarea
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
            rows="3"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200"
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
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    // Pre-select users already assigned to this branch
    const assignedUserIds = users
      .filter(u => u.branch_code === branch.branch_code)
      .map(u => u._key || u.id)
    setSelectedUserIds(assignedUserIds)
  }, [branch, users])

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchesSearch = 
          user.name?.toLowerCase().includes(term) ||
          user.email?.toLowerCase().includes(term) ||
          user.emp_code?.toLowerCase().includes(term)
        if (!matchesSearch) return false
      }
      
      if (filterRole && user.role !== filterRole) return false
      
      if (filterStatus === 'active' && !user.is_active) return false
      if (filterStatus === 'inactive' && user.is_active) return false
      
      return true
    })
  }, [users, searchTerm, filterRole, filterStatus])

  const handleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([])
    } else {
      setSelectedUserIds(filteredUsers.map(u => u._key || u.id))
    }
  }

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
      <div className="bg-[var(--card-bg)] border border-[var(--stroke)] rounded-xl shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Assign Users to {branch.branch_name}
            </h3>
              <button
              onClick={onCancel}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Search and Filter Bar */}
          <div className="mb-4 space-y-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-4 w-4 text-[var(--text-muted)]" />
              </div>
              <input
                type="text"
                placeholder="Search users by name, email, or employee code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="flex-1 px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--ring)] text-sm focus:outline-none"
              >
                <option value="">All Roles</option>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--ring)] text-sm focus:outline-none"
              >
                <option value="">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)] transition-colors text-sm"
              >
                {selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="max-h-96 overflow-y-auto mb-4">
              <div className="space-y-2">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-dark-400">
                    <FiUsers className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-dark-600" />
                    <p>No users found matching your filters</p>
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const userId = user._key || user.id
                    const isSelected = selectedUserIds.includes(userId)
                    const isAssigned = user.branch_code === branch.branch_code
                    
                    return (
                      <label key={userId} className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800'
                          : 'hover:bg-gray-50 dark:hover:bg-dark-700 border border-gray-200 dark:border-dark-600'
                      }`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleUserToggle(userId)}
                          className="mr-3 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name || user.email}</div>
                          <div className="text-xs text-gray-500 dark:text-dark-400">
                            {user.email} • {user.emp_code || 'N/A'} • {user.role}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAssigned && (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-medium rounded">
                              Assigned
                            </span>
                          )}
                          {!user.is_active && (
                            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 text-xs font-medium rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                      </label>
                    )
                  })
                )}
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
