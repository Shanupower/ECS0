import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { 
  FiUsers, 
  FiPlus, 
  FiEdit, 
  FiTrash2, 
  FiKey, 
  FiRefreshCw,
  FiAlertCircle,
  FiUser,
  FiMail,
  FiMapPin,
  FiShield,
  FiSearch,
  FiChevronDown,
  FiDatabase,
  FiTarget,
  FiEye,
  FiEyeOff
} from 'react-icons/fi'
import { Modal } from '../components/ui/Modal'

export default function UserManagementPage() {
  const { token, user } = useAuth()
  const [users, setUsers] = useState([])
  const [branches, setBranches] = useState([])
  const [branchesError, setBranchesError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    emp_code: '',
    name: '',
    email: '',
    mobile: '',
    branch: '',
    role: 'employee',
    password: '',
    personal_monthly_target: ''
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [showFormPassword, setShowFormPassword] = useState(false)

  const isAdmin = user?.role === 'admin'
  const isManager = user?.role === 'manager'
  const canManageUsers = isAdmin || isManager

  useEffect(() => {
    if (!canManageUsers) return
    loadUsers()
    loadBranches()
  }, [token, isAdmin, isManager])

  const loadUsers = async () => {
    if (!token) return
    
    setLoading(true)
    setError('')
    
    try {
      const result = isManager
        ? await api.listUsers(token, { scope: 'branch' })
        : await api.listUsers(token)
      setUsers(Array.isArray(result) ? result : [])
    } catch (err) {
      setError(err.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const loadBranches = async () => {
    if (!token) return
    
    setBranchesError('')
    try {
      const branchesData = await api.listBranches(token)
      setBranches(Array.isArray(branchesData) ? branchesData : [])
    } catch (err) {
      console.error('Failed to load branches:', err)
      setBranchesError(err.message || 'Failed to load branches')
      setBranches([])
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    
    // Clear previous field errors
    setFieldErrors({})
    
    try {
      // Trim all string values before submission
      const trimmedData = {}
      for (const key in formData) {
        if (formData.hasOwnProperty(key)) {
          const value = formData[key]
          trimmedData[key] = typeof value === 'string' ? value.trim() : value
        }
      }
      if (trimmedData.personal_monthly_target === '' || trimmedData.personal_monthly_target == null) {
        trimmedData.personal_monthly_target = null
      } else {
        trimmedData.personal_monthly_target = Number(trimmedData.personal_monthly_target)
      }
      await api.createUser(token, trimmedData)
      await loadUsers()
      setShowCreateForm(false)
      resetForm()
      setFieldErrors({})
    } catch (err) {
      // Handle field-specific errors
      if (err.field) {
        setFieldErrors({ [err.field]: err.detail || err.message })
      } else {
        // General error - show in alert or set a general error state
        setFieldErrors({ _general: err.detail || err.message })
      }
    }
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    
    // Clear previous field errors
    setFieldErrors({})
    
    try {
      // Trim all string values before submission
      const trimmedData = {}
      for (const key in formData) {
        if (formData.hasOwnProperty(key)) {
          const value = formData[key]
          trimmedData[key] = typeof value === 'string' ? value.trim() : value
        }
      }

      // Managers can only update personal target.
      if (isManager) {
        const payload = {
          personal_monthly_target:
            trimmedData.personal_monthly_target === '' || trimmedData.personal_monthly_target == null
              ? null
              : Number(trimmedData.personal_monthly_target)
        }
        await api.updateUser(token, editingUser.id, payload)
      } else {
        if (trimmedData.personal_monthly_target === '' || trimmedData.personal_monthly_target == null) {
          trimmedData.personal_monthly_target = null
        } else {
          trimmedData.personal_monthly_target = Number(trimmedData.personal_monthly_target)
        }
        
        const newPassword = trimmedData.password
        delete trimmedData.password

        await api.updateUser(token, editingUser.id, trimmedData)
        
        if (newPassword) {
          await api.changePassword(token, editingUser.id, newPassword)
        }
      }
      
      await loadUsers()
      setEditingUser(null)
      resetForm()
      setFieldErrors({})
    } catch (err) {
      // Handle field-specific errors
      if (err.field) {
        setFieldErrors({ [err.field]: err.detail || err.message })
      } else {
        setFieldErrors({ _general: err.detail || err.message })
      }
    }
  }

  const handleDeleteUser = async (userId) => {
    const currentUserId = user?.id ?? user?.sub
    if (currentUserId && String(userId) === String(currentUserId)) {
      alert('You cannot delete your own account.')
      return
    }
    if (!confirm('Are you sure you want to delete this user? They will be deactivated and cannot log in.')) return
    
    try {
      await api.deleteUser(token, userId)
      await loadUsers()
    } catch (err) {
      alert('Failed to delete user: ' + err.message)
    }
  }

  const handleDeleteUserRelatedData = async (userId) => {
    if (!confirm('This will permanently delete this user’s receipt drafts, assigned tasks, and leads. Are you sure you want to continue?')) return
    try {
      await api.deleteUserRelatedData(token, userId)
      alert('User related drafts, tasks, and leads deleted successfully.')
    } catch (err) {
      alert('Failed to delete user related data: ' + err.message)
    }
  }

  const handleChangePassword = async (userId, newPassword) => {
    if (!newPassword) {
      alert('Please enter a new password')
      return
    }
    
    try {
      await api.changePassword(token, userId, newPassword)
      alert('Password changed successfully')
    } catch (err) {
      alert('Failed to change password: ' + err.message)
    }
  }

  const resetForm = () => {
    setFormData({
      emp_code: '',
      name: '',
      email: '',
      mobile: '',
      branch: '',
      role: 'employee',
      password: '',
      personal_monthly_target: ''
    })
    setFieldErrors({})
  }

  // Branch option value is branch_code (e.g. "1", "2", "3"); display uses branch_name for understanding.
  const getBranchFormValue = (userBranch, userBranchCode) => {
    const raw = userBranch != null ? String(userBranch).trim() : ''
    const codeRaw = userBranchCode != null ? String(userBranchCode).trim() : ''
    if (!raw && !codeRaw) return ''
    const match = branchOptions.find(
      (b) =>
        String(b.branch_code) === raw ||
        String(b.branch_name) === raw ||
        String(b.branch_code) === codeRaw ||
        String(b.branch_name) === codeRaw
    )
    return match ? (match.branch_code || match.branch_name) : raw || codeRaw
  }

  const startEdit = (user) => {
    setEditingUser(user)
    setFormData({
      emp_code: user.emp_code || '',
      name: user.name || '',
      email: user.email || '',
      mobile: user.mobile || '',
      branch: getBranchFormValue(user.branch, user.branch_code),
      role: user.role || 'employee',
      password: '',
      personal_monthly_target:
        user.personal_monthly_target != null && user.personal_monthly_target !== ''
          ? String(user.personal_monthly_target)
          : ''
    })
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  // Use branches from API; if empty, derive from users so dropdown still works (e.g. when branches API fails)
  // Values are branch_code (1, 2, 3); labels are branch_name for normalised display.
  const branchOptions = branches.length > 0
    ? branches
    : (() => {
        const seen = new Set()
        const fromUsers = []
        users.forEach((u) => {
          const b = u.branch != null ? String(u.branch).trim() : ''
          if (b && !seen.has(b)) {
            seen.add(b)
            fromUsers.push({ branch_code: b, branch_name: b })
          }
        })
        return fromUsers.sort((a, b) => (a.branch_name || '').localeCompare(b.branch_name || ''))
      })()

  // Display normalised branch name for understanding; avoid showing bare codes like "1", "2".
  const getUserBranchDisplay = (branchValue) => {
    if (!branchValue) return ''
    const raw = String(branchValue)
    const match = branchOptions.find(
      (b) =>
        String(b.branch_code) === raw ||
        String(b.branch_name) === raw
    )
    const label = match?.branch_name
    // If we have a real name and it's not just the code, show it
    if (label && label !== String(match.branch_code)) return label
    // Otherwise, show a friendlier label based on the code
    return `Branch ${raw}`
  }

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase()
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      String(user.mobile || '').toLowerCase().includes(query) ||
      user.emp_code?.toLowerCase().includes(query) ||
      user.branch?.toLowerCase().includes(query)
    )
  })

  if (!canManageUsers) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center px-6 py-4 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--error)]">
          <FiAlertCircle className="w-5 h-5 mr-2" />
          Access denied. Admin or Branch Manager privileges required.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <FiUsers className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 mr-2 sm:mr-3" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">User Management</h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">Manage system users and permissions</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 sm:px-4 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-xs sm:text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50"
          >
            <FiRefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-3 py-2 sm:px-4 border border-transparent text-xs sm:text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <FiPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Create User</span>
              <span className="sm:hidden">Create</span>
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center px-4 py-2 text-[var(--text-muted)]">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mr-3"></div>
            Loading users...
          </div>
        </div>
      )}

      {error && (
        <div className="border border-[var(--error)]/60 bg-[var(--error-muted)] text-[var(--error)] px-4 py-3 rounded-lg flex items-center">
          <FiAlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Search Bar */}
      {!loading && !error && (
        <div className="rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)] p-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-[var(--text-muted)]" />
            </div>
              <input
              type="text"
              placeholder="Search by name, email, phone, employee code, or branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Create/Edit User Modal */}
      <Modal
        open={!!(showCreateForm || editingUser)}
        onClose={() => {
          setShowCreateForm(false)
          setEditingUser(null)
          resetForm()
        }}
        variant="glass"
        size="md"
      >
        <div className="max-h-[inherit] overflow-y-auto overscroll-contain p-4 sm:p-6 md:p-8">
            <div className="flex items-center mb-6">
              <FiUser className="w-5 h-5 text-red-600 mr-2" />
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                {editingUser ? 'Edit User' : 'Create User'}
              </h3>
            </div>
            
            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
              {/* General error message */}
              {fieldErrors._general && (
                <div className="bg-[var(--error-muted)] border border-[var(--error)]/70 rounded-lg p-3 flex items-start">
                  <FiAlertCircle className="h-5 w-5 text-[var(--error)] mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-sm text-[var(--error)]">{fieldErrors._general}</span>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Employee Code</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="h-4 w-4 text-[var(--text-muted)]" />
                  </div>
                  <input
                    type="text"
                    value={formData.emp_code}
                    onChange={e => {
                      setFormData(prev => ({ ...prev, emp_code: e.target.value }))
                      // Clear error when user starts typing
                      if (fieldErrors.emp_code) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev }
                          delete newErrors.emp_code
                          return newErrors
                        })
                      }
                    }}
                    className={`w-full pl-10 pr-4 py-3 border ${
                      fieldErrors.emp_code 
                        ? 'border-[var(--error)]' 
                        : 'border-[var(--stroke)]'
                    } bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] transition-colors duration-200 focus:outline-none`}
                    required
                    disabled={isManager}
                  />
                </div>
                {fieldErrors.emp_code && (
                  <p className="mt-1 text-sm text-[var(--error)] flex items-center">
                    <FiAlertCircle className="w-4 h-4 mr-1" />
                    {fieldErrors.emp_code}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, name: e.target.value }))
                    if (fieldErrors.name) {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.name
                        return newErrors
                      })
                    }
                  }}
                  className={`w-full p-3 border ${
                    fieldErrors.name 
                      ? 'border-[var(--error)]' 
                      : 'border-[var(--stroke)]'
                  } bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] transition-colors duration-200 focus:outline-none`}
                  required
                  disabled={isManager}
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-sm text-[var(--error)] flex items-center">
                    <FiAlertCircle className="w-4 h-4 mr-1" />
                    {fieldErrors.name}
                  </p>
                )}
              </div>
              
              {!isManager && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="h-4 w-4 text-[var(--text-muted)]" />
                  </div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => {
                      setFormData(prev => ({ ...prev, email: e.target.value }))
                      if (fieldErrors.email) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev }
                          delete newErrors.email
                          return newErrors
                        })
                      }
                    }}
                    className={`w-full pl-10 pr-4 py-3 border ${
                      fieldErrors.email 
                        ? 'border-[var(--error)]' 
                        : 'border-[var(--stroke)]'
                    } bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] transition-colors duration-200 focus:outline-none`}
                    required
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-sm text-[var(--error)] flex items-center">
                    <FiAlertCircle className="w-4 h-4 mr-1" />
                    {fieldErrors.email}
                  </p>
                )}
              </div>
              )}

              {!isManager && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Employee Phone Number</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={formData.mobile}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, mobile: e.target.value }))
                    if (fieldErrors.mobile) {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.mobile
                        return newErrors
                      })
                    }
                  }}
                  className={`w-full p-3 border ${
                    fieldErrors.mobile 
                      ? 'border-[var(--error)]' 
                      : 'border-[var(--stroke)]'
                  } bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] transition-colors duration-200 focus:outline-none`}
                  placeholder="Optional (10 digits)"
                />
                {fieldErrors.mobile && (
                  <p className="mt-1 text-sm text-[var(--error)] flex items-center">
                    <FiAlertCircle className="w-4 h-4 mr-1" />
                    {fieldErrors.mobile}
                  </p>
                )}
              </div>
              )}
              
              {!isManager && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Branch</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <FiMapPin className="h-4 w-4 text-[var(--text-muted)]" />
                  </div>
                  <select
                    value={formData.branch}
                    onChange={e => {
                      setFormData(prev => ({ ...prev, branch: e.target.value }))
                      if (fieldErrors.branch) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev }
                          delete newErrors.branch
                          return newErrors
                        })
                      }
                    }}
                    className={`w-full pl-10 pr-10 py-3 border ${
                      fieldErrors.branch 
                        ? 'border-[var(--error)]' 
                        : 'border-[var(--stroke)]'
                    } bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] transition-colors duration-200 appearance-none cursor-pointer focus:outline-none`}
                    required
                  >
                    <option value="">Select a branch</option>
                    {branchOptions.map((branch) => {
                      const code = branch.branch_code != null ? String(branch.branch_code) : branch.branch_name
                      const label = branch.branch_name || `Branch ${code}`
                      return (
                        <option key={code || branch.branch_name} value={code}>
                          {label}
                        </option>
                      )
                    })}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <FiChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                  </div>
                </div>
                {branchesError && (
                  <p className="mt-1 text-sm text-amber-600 dark:text-amber-400 flex items-center">
                    <FiAlertCircle className="w-4 h-4 mr-1 shrink-0" />
                    {branchesError}. Showing branches from user list.
                  </p>
                )}
                {fieldErrors.branch && (
                  <p className="mt-1 text-sm text-[var(--error)] flex items-center">
                    <FiAlertCircle className="w-4 h-4 mr-1" />
                    {fieldErrors.branch}
                  </p>
                )}
              </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                  <FiTarget className="w-4 h-4 text-[var(--text-muted)]" />
                  Personal monthly target (optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={formData.personal_monthly_target}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, personal_monthly_target: e.target.value }))
                  }
                  className="w-full p-3 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] transition-colors duration-200 focus:outline-none"
                  placeholder="Leave blank to use branch monthly target on dashboards"
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Used for personal dashboard and performance reports. If empty, the branch monthly target applies.
                </p>
              </div>

              {!isManager && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Role</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiShield className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  </div>
                  <select
                    value={formData.role}
                    onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] transition-colors duration-200 focus:outline-none"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Branch Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              )}
              
              {!isManager && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Password {editingUser && '(leave blank to keep current)'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiKey className="h-4 w-4 text-[var(--text-muted)]" />
                  </div>
                  <input
                    type={showFormPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => {
                      setFormData(prev => ({ ...prev, password: e.target.value }))
                      if (fieldErrors.password) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev }
                          delete newErrors.password
                          return newErrors
                        })
                      }
                    }}
                    className={`w-full pl-10 pr-10 py-3 border ${
                      fieldErrors.password 
                        ? 'border-[var(--error)]' 
                        : 'border-[var(--stroke)]'
                    } bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] transition-colors duration-200 focus:outline-none`}
                    required={!editingUser}
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(v => !v)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] focus:outline-none"
                    aria-label={showFormPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showFormPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 text-sm text-[var(--error)] flex items-center">
                    <FiAlertCircle className="w-4 h-4 mr-1" />
                    {fieldErrors.password}
                  </p>
                )}
              </div>
              )}
              
              <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    setEditingUser(null)
                    resetForm()
                  }}
                  className="min-h-11 flex-1 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] py-3 rounded-lg hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)] transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-11 flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  {editingUser ? (isManager ? 'Save Target' : 'Update User') : 'Create User'}
                </button>
              </div>
            </form>
        </div>
      </Modal>

      {/* Users Table */}
      {!loading && !error && (
        <div className="rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
          {/* Mobile Card View */}
          <div className="block sm:hidden">
            <div className="divide-y divide-[var(--stroke)]/70">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center">
                          <FiUser className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </div>
                        <h4 className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {user.name}
                        </h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          user.role === 'admin' 
                            ? 'bg-[var(--error-muted)] text-[var(--error)] border-[var(--error)]/60' 
                            : user.role === 'manager'
                            ? 'bg-[var(--warn-muted)] text-[var(--warn)] border-[var(--warn)]/60'
                            : 'bg-[var(--accent-muted)] text-[var(--accent)] border-[var(--accent)]/60'
                        }`}>
                          {user.role === 'admin' && <FiShield className="w-3 h-3 mr-1" />}
                          {user.role === 'manager' ? 'Branch Manager' : user.role}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-[var(--text-secondary)]">
                        <div><span className="font-medium">Code:</span> {user.emp_code}</div>
                        <div><span className="font-medium">Email:</span> {user.email}</div>
                        <div><span className="font-medium">Phone:</span> {user.mobile || '—'}</div>
                        <div><span className="font-medium">Branch:</span> {getUserBranchDisplay(user.branch)}</div>
                        <div>
                          <span className="font-medium">Personal target:</span>{' '}
                          {user.personal_monthly_target != null && user.personal_monthly_target !== ''
                            ? `₹${Number(user.personal_monthly_target).toLocaleString('en-IN')}`
                            : '—'}
                        </div>
                        <div><span className="font-medium">Created:</span> {formatDate(user.created_at)}</div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => startEdit(user)}
                        className="inline-flex items-center px-3 py-2 border border-[var(--accent)]/50 text-xs font-medium rounded-md text-[var(--accent)] bg-[var(--accent-muted)] hover:bg-[var(--accent-muted)]/80"
                      >
                        <FiEdit className="w-4 h-4 mr-1.5" />
                        Edit
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleDeleteUserRelatedData(user.id)}
                            className="inline-flex items-center px-3 py-2 border border-[var(--warn)]/60 text-xs font-medium rounded-md text-[var(--warn)] bg-[var(--warn-muted)] hover:bg-[var(--warn-muted)]/80"
                          >
                            <FiDatabase className="w-4 h-4 mr-1.5" />
                            Clean Data
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="inline-flex items-center px-3 py-2 border border-[var(--error)]/60 text-xs font-medium rounded-md text-[var(--error)] bg-[var(--error-muted)] hover:bg-[var(--error-muted)]/80"
                          >
                            <FiTrash2 className="w-4 h-4 mr-1.5" />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--card-hover)]">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Employee Code</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Name</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Email</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Phone</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Branch</th>
                  <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Personal target</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Role</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Created</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--stroke)]/70">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[var(--card-bg-opaque)]">
                    <td className="px-4 lg:px-6 py-3 lg:py-4">
                      <div className="flex items-center">
                        <div className="w-6 h-6 lg:w-8 lg:h-8 bg-red-500/10 rounded-full flex items-center justify-center mr-2 lg:mr-3">
                          <FiUser className="w-3 h-3 lg:w-4 lg:h-4 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          {user.emp_code}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-[var(--text-primary)] truncate">
                      {user.name}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-[var(--text-secondary)] truncate">
                      {user.email}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-[var(--text-secondary)] truncate">
                      {user.mobile || '—'}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-[var(--text-secondary)] truncate">
                      {getUserBranchDisplay(user.branch)}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-right text-[var(--text-secondary)] tabular-nums">
                      {user.personal_monthly_target != null && user.personal_monthly_target !== ''
                        ? `₹${Number(user.personal_monthly_target).toLocaleString('en-IN')}`
                        : '—'}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        user.role === 'admin' 
                          ? 'bg-[var(--error-muted)] text-[var(--error)] border-[var(--error)]/60' 
                          : user.role === 'manager'
                          ? 'bg-[var(--warn-muted)] text-[var(--warn)] border-[var(--warn)]/60'
                          : 'bg-[var(--accent-muted)] text-[var(--accent)] border-[var(--accent)]/60'
                      }`}>
                        {user.role === 'admin' && <FiShield className="w-3 h-3 mr-1" />}
                        {user.role === 'manager' ? 'Branch Manager' : user.role}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-[var(--text-secondary)]">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm">
                      <div className="flex flex-col lg:flex-row gap-1 lg:gap-2">
                        <button
                          onClick={() => startEdit(user)}
                          className="inline-flex items-center px-2 py-1 lg:px-3 border border-[var(--accent)]/50 text-xs font-medium rounded-md text-[var(--accent)] bg-[var(--accent-muted)] hover:bg-[var(--accent-muted)]/80"
                        >
                          <FiEdit className="w-3 h-3 mr-1" />
                          <span className="hidden lg:inline">Edit</span>
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => {
                                const newPassword = prompt('Enter new password:')
                                if (newPassword) {
                                  handleChangePassword(user.id, newPassword)
                                }
                              }}
                              className="inline-flex items-center px-2 py-1 lg:px-3 border border-[var(--success)]/60 text-xs font-medium rounded-md text-[var(--success)] bg-[var(--success-muted)] hover:bg-[var(--success-muted)]/80"
                            >
                              <FiKey className="w-3 h-3 mr-1" />
                              <span className="hidden lg:inline">Password</span>
                            </button>
                            <button
                              onClick={() => handleDeleteUserRelatedData(user.id)}
                              className="inline-flex items-center px-2 py-1 lg:px-3 border border-[var(--warn)]/60 text-xs font-medium rounded-md text-[var(--warn)] bg-[var(--warn-muted)] hover:bg-[var(--warn-muted)]/80"
                            >
                              <FiDatabase className="w-3 h-3 mr-1" />
                              <span className="hidden lg:inline">Clean Data</span>
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="inline-flex items-center px-2 py-1 lg:px-3 border border-[var(--error)]/60 text-xs font-medium rounded-md text-[var(--error)] bg-[var(--error-muted)] hover:bg-[var(--error-muted)]/80"
                            >
                              <FiTrash2 className="w-3 h-3 mr-1" />
                              <span className="hidden lg:inline">Delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredUsers.length === 0 && searchQuery && (
            <div className="text-center py-12 text-[var(--text-muted)]">
              <FiUsers className="w-12 h-12 mx-auto mb-3 text-[var(--stroke)]" />
              <p>No users found matching "{searchQuery}".</p>
            </div>
          )}
          
          {filteredUsers.length === 0 && !searchQuery && users.length === 0 && (
            <div className="text-center py-12 text-[var(--text-muted)]">
              <FiUsers className="w-12 h-12 mx-auto mb-3 text-[var(--stroke)]" />
              <p>No users found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
