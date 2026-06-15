import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { getAllValidBranches } from '../utils/branchMapping'
import SearchableSelect from '../components/SearchableSelect'
import MultiSelect from '../components/MultiSelect'
import { validateCustomerForm, getPattern, getTitle } from '../utils/validators'
import { 
  FiUsers, 
  FiPlus, 
  FiSearch, 
  FiEdit, 
  FiTrash2, 
  FiEye,
  FiFilter,
  FiDownload,
  FiUpload,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiX
} from 'react-icons/fi'
import DatePickerInput from '../components/ui/DatePickerInput.jsx'

export default function ClientManagementPage() {
  const { user, token } = useAuth()
  const canDelete = user?.role === 'admin' || user?.role === 'manager'
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBranchKey, setFilterBranchKey] = useState('')
  const branchFilterMountRef = useRef(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Export/Import (admin + master key)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [masterKey, setMasterKey] = useState('')
  const [importFile, setImportFile] = useState(null)
  const [exportImportLoading, setExportImportLoading] = useState(false)
  const [importResult, setImportResult] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    name: '',
    pan: '',
    email: '',
    mobile: '',
    address1: '',
    address2: '',
    address3: '',
    city: '',
    state: '',
    pin: '',
    country: 'India',
    date_of_birth: '',
    branches: [], // Changed from branch to branches (array)
    minors: [] // Array of minors
  })
  const [pincodeLoading, setPincodeLoading] = useState(false)
  const [pincodeSuggestions, setPincodeSuggestions] = useState([])
  const [showPincodeDropdown, setShowPincodeDropdown] = useState(false)
  const [mediaFiles, setMediaFiles] = useState([])
  const [availableBranches, setAvailableBranches] = useState([]) // Branches fetched from API
  const [deletingMediaId, setDeletingMediaId] = useState(null)

  const pageSize = 50 // Increased from 10 to show more customers per page

  // Branch display: prefer customer.branches mapped to labels; fallback to relationship_manager
  const getBranchDisplay = (customer) => {
    if (customer.branches && Array.isArray(customer.branches) && customer.branches.length > 0) {
      const labels = customer.branches.map(k => {
        const opt = availableBranches.find(b => b.value === String(k))
        return opt ? opt.label : k
      }).filter(Boolean)
      return labels.join(', ') || 'N/A'
    }
    if (Array.isArray(customer.relationship_manager)) return customer.relationship_manager.join(', ')
    return customer.relationship_manager || customer.relationship_manager_display || 'N/A'
  }

  // Fetch branches from API on component mount
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        if (token) {
          const branches = await api.listBranches(token)
          // IMPORTANT: `branch_key` filter on `/api/customers` matches canonical branch keys
          // stored in `customer.branches[]` (Arango `_key`). Fall back to branch_code/name
          // only if `_key` isn't present so the filter behaves like Portfolio review.
          const branchOptions = branches.map((branch) => ({
            label: branch.branch_name || branch.branch_code || branch.name || 'Branch',
            value: String(
              branch._key ??
                branch.id ??
                branch.branch_code ??
                branch.code ??
                branch.branch_name ??
                branch.name
            ),
          }))
          setAvailableBranches(branchOptions)
        }
      } catch (err) {
        console.error('Failed to fetch branches:', err)
        // Fallback to hardcoded list if API fails
        setAvailableBranches(getAllValidBranches().map(branch => ({ label: branch, value: branch })))
      }
    }
    if (token) {
      fetchBranches()
    }
  }, [token])

  const getUserBranchDisplay = () => {
    const raw = user?.branch_name || user?.branch || user?.branch_code
    if (!raw) return 'Unknown'
    const match = availableBranches.find(
      b => b.value === String(raw) || b.label === String(raw)
    )
    return match?.label || String(raw)
  }

  // Auto-populate branch from user context (match by value or label)
  useEffect(() => {
    if (user && formData.branches.length === 0 && availableBranches.length > 0) {
      const userBranch = user.branch || user.branch_name || ''
      if (userBranch) {
        const match = availableBranches.find(b => b.value === userBranch || b.label === userBranch)
        if (match) {
          setFormData(prev => ({ ...prev, branches: [match.value] }))
        } else {
          setFormData(prev => ({ ...prev, branches: [userBranch] }))
        }
      }
    }
  }, [user, availableBranches])

  // Pincode lookup function
  const lookupPincode = async (pincode) => {
    if (!pincode || pincode.length < 3) {
      setPincodeSuggestions([])
      setShowPincodeDropdown(false)
      return
    }

    setPincodeLoading(true)
    try {
      // Using India Post API for pincode lookup
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
      const data = await response.json()
      
      if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice) {
        const suggestions = data[0].PostOffice.map(office => ({
          pincode: office.Pincode,
          city: office.District,
          state: office.State,
          country: 'India'
        }))
        
        // Remove duplicates based on city and state
        const uniqueSuggestions = suggestions.reduce((acc, current) => {
          const exists = acc.find(item => 
            item.city === current.city && item.state === current.state
          )
          if (!exists) {
            acc.push(current)
          }
          return acc
        }, [])
        
        setPincodeSuggestions(uniqueSuggestions)
        setShowPincodeDropdown(true)
      } else {
        setPincodeSuggestions([])
        setShowPincodeDropdown(false)
      }
    } catch (error) {
      console.error('Pincode lookup error:', error)
      setPincodeSuggestions([])
      setShowPincodeDropdown(false)
    } finally {
      setPincodeLoading(false)
    }
  }

  // Handle pincode input change
  const handlePincodeChange = (value) => {
    setFormData(prev => ({ ...prev, pin: value }))
    
    if (value.length >= 3) {
      // Debounce the API call
      const timeoutId = setTimeout(() => {
        lookupPincode(value)
      }, 500)
      
      // Clear previous timeout
      return () => clearTimeout(timeoutId)
    } else {
      setPincodeSuggestions([])
      setShowPincodeDropdown(false)
    }
  }

  // Handle pincode suggestion selection
  const selectPincodeSuggestion = (suggestion) => {
    setFormData(prev => ({
      ...prev,
      pin: suggestion.pincode,
      city: suggestion.city,
      state: suggestion.state,
      country: suggestion.country
    }))
    setPincodeSuggestions([])
    setShowPincodeDropdown(false)
  }

  // Media handling functions
  const handleMediaUpload = (event) => {
    const files = Array.from(event.target.files)
    const validFiles = files.filter(file => {
      const maxSize = 10 * 1024 * 1024 // 10MB
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'image/webp']
      
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`)
        return false
      }
      
      if (!allowedTypes.includes(file.type)) {
        alert(`File ${file.name} has an unsupported format. Please upload images or PDF files.`)
        return false
      }
      
      return true
    })
    
    setMediaFiles(prev => [...prev, ...validFiles])
  }

  const removeMediaFile = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
  }

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) {
      return '🖼️'
    } else if (file.type === 'application/pdf') {
      return '📄'
    }
    return '📎'
  }

  // Fetch customers
  const fetchCustomers = async (page = 1, search = '') => {
    setLoading(true)
    try {
      const token = localStorage.getItem('ecs_token')
      const query = {
        page: page.toString(),
        size: pageSize.toString(),
        sort: 'created_at:desc'
      }
      
      if (search.trim()) {
        query.search = search.trim()
      }
      if (user?.role === 'admin' && filterBranchKey) {
        query.branch_key = filterBranchKey
      }

      const data = await api.listCustomers(token, query)
      const normalizedSearch = search.trim().toLowerCase()
      const items = (data.items || []).map((customer) => {
        // Fallback in UI so matched minor names still show even if backend response
        // does not yet include matched_minor_names (e.g. stale server process).
        const fallbackMatchedMinorNames = normalizedSearch
          ? (Array.isArray(customer?.minors) ? customer.minors : [])
              .filter((minor) => {
                const name = String(minor?.name || '').toLowerCase()
                const investorId = String(minor?.investor_id || '').toLowerCase()
                const pan = String(minor?.pan || '').toLowerCase()
                return (
                  name.includes(normalizedSearch) ||
                  investorId.includes(normalizedSearch) ||
                  pan.includes(normalizedSearch)
                )
              })
              .map((minor) => minor?.name)
              .filter(Boolean)
          : []

        return {
          ...customer,
          matched_minor_names: Array.isArray(customer?.matched_minor_names)
            ? customer.matched_minor_names
            : fallbackMatchedMinorNames
        }
      })
      setCustomers(items)
      setTotalPages(Math.ceil(data.total / pageSize))
      setTotalCustomers(data.total)
      setCurrentPage(page)
    } catch (err) {
      setError('Failed to fetch clients: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      setCurrentPage(1)
      fetchCustomers(1, searchTerm)
    } else {
      // If search is empty, load all customers
      setCurrentPage(1)
      fetchCustomers(1, '')
    }
  }

  // Handle search input change with debouncing
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm.trim()) {
        setCurrentPage(1)
        fetchCustomers(1, searchTerm)
      } else if (searchTerm === '') {
        // Only fetch when search is completely cleared
        setCurrentPage(1)
        fetchCustomers(1, '')
      }
    }, 500) // 500ms debounce

    return () => clearTimeout(debounceTimer)
  }, [searchTerm])

  useEffect(() => {
    if (branchFilterMountRef.current) {
      branchFilterMountRef.current = false
      return
    }
    setCurrentPage(1)
    fetchCustomers(1, searchTerm)
  }, [filterBranchKey])

  // Handle page change
  const handlePageChange = (page) => {
    fetchCustomers(page, searchTerm)
  }

  // Handle add customer
  const handleAddCustomer = async (e) => {
    e.preventDefault()
    
    // Validate form
    const validation = validateCustomerForm(formData)
    if (!validation.valid) {
      setError(validation.errors.join('. '))
      return
    }
    
    setLoading(true)
    try {
      const token = localStorage.getItem('ecs_token')
      
      // Build JSON payload for customer
      const branches = formData.branches && formData.branches.length > 0
        ? formData.branches
        : (() => {
            const ub = user?.branch || user?.branch_name || ''
            const m = availableBranches.find(b => b.value === ub || b.label === ub)
            return m ? [m.value] : (ub ? [ub] : [])
          })()

      const payload = {
        ...formData,
        branches,
        created_by: user?.emp_code || user?.username,
      }

      const created = await api.createCustomer(token, payload)

      // If supporting documents were selected, upload them after customer exists and verify
      if (mediaFiles && mediaFiles.length > 0 && created?.investor_id) {
        try {
          const uploadResult = await api.uploadCustomerMedia(token, created.investor_id, mediaFiles)
          const savedDocs = (uploadResult && typeof uploadResult.added === 'number') ? uploadResult.added : mediaFiles.length

          if (savedDocs < mediaFiles.length) {
            console.warn('Not all customer documents were saved', {
              investor_id: created.investor_id,
              attempted: mediaFiles.length,
              saved: savedDocs
            })
            setError(`Client created, but some documents may not have been saved (saved ${savedDocs} of ${mediaFiles.length}).`)
          }
        } catch (uploadErr) {
          console.error('Failed to upload client documents:', uploadErr)
          setError('Client created, but failed to upload supporting documents: ' + uploadErr.message)
        }
      }

      setSuccess('Client created successfully!')
      setShowAddModal(false)
      resetForm()
      fetchCustomers(currentPage, searchTerm)
    } catch (err) {
      const msg = err.errorType === 'duplicate_pan'
        ? 'PAN number already exists'
        : (err.detail || err.message || 'Failed to create client')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Handle edit customer
  const handleEditCustomer = async (e) => {
    e.preventDefault()
    
    // Validate form (for update, only validate fields that have changed)
    const validation = validateCustomerForm(formData, true, selectedCustomer) // Pass original customer data
    if (!validation.valid) {
      setError(validation.errors.join('. '))
      return
    }
    
    setLoading(true)
    try {
      const token = localStorage.getItem('ecs_token')
      
      // Prepare update data - send branches as canonical keys (no normalization)
      const updateData = { ...formData }
      
      await api.updateCustomer(token, selectedCustomer.investor_id, updateData)

      // If new supporting documents are selected, upload them via media endpoint and verify
      if (mediaFiles && mediaFiles.length > 0) {
        try {
          const uploadResult = await api.uploadCustomerMedia(token, selectedCustomer.investor_id, mediaFiles)
          const savedDocs = (uploadResult && typeof uploadResult.added === 'number') ? uploadResult.added : mediaFiles.length

          if (savedDocs < mediaFiles.length) {
            console.warn('Not all client documents were saved on update', {
              investor_id: selectedCustomer.investor_id,
              attempted: mediaFiles.length,
              saved: savedDocs
            })
            setError(`Client updated, but some documents may not have been saved (saved ${savedDocs} of ${mediaFiles.length}).`)
          }
        } catch (uploadErr) {
          console.error('Failed to upload client documents:', uploadErr)
          setError('Client updated, but failed to upload supporting documents: ' + uploadErr.message)
        }
      }

      setSuccess('Client updated successfully!')
      setShowEditModal(false)
      resetForm()
      fetchCustomers(currentPage, searchTerm)
    } catch (err) {
      setError('Failed to update client: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle delete customer
  const handleDeleteCustomer = async (customerId) => {
    if (!window.confirm('Are you sure you want to delete this client?')) {
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('ecs_token')
      await api.deleteCustomer(token, customerId)

      setSuccess('Client deleted successfully!')
      fetchCustomers(currentPage, searchTerm)
    } catch (err) {
      setError('Failed to delete client: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      name: '',
      pan: '',
      email: '',
      mobile: '',
      address1: '',
      address2: '',
      address3: '',
      city: '',
      state: '',
      pin: '',
      country: 'India',
      date_of_birth: '',
      branches: [],
      minors: []
    })
    setPincodeSuggestions([])
    setShowPincodeDropdown(false)
    setMediaFiles([])
  }

  // Open edit modal – fetch full customer so media_documents and minors are available
  const openEditModal = async (customer) => {
    try {
      const fresh = await api.getCustomer(token, customer.investor_id)
      setSelectedCustomer(fresh)
      customer = fresh
    } catch (err) {
      console.error('Failed to load client for edit:', err)
      setSelectedCustomer(customer)
    }
    const branchesArray = (customer.branches && Array.isArray(customer.branches) && customer.branches.length > 0)
      ? customer.branches
      : (() => {
          const dbBranch = customer.relationship_manager
          if (!dbBranch) return []
          const arr = Array.isArray(dbBranch) ? dbBranch : [dbBranch]
          return arr.map(b => {
            const opt = availableBranches.find(o => o.value === b || o.label === b)
            return opt ? opt.value : b
          }).filter(Boolean)
        })()
    
    // Extract DOB - handle null, undefined, or alternative field names
    const dob = customer.date_of_birth || customer.dob || customer.dateOfBirth || ''
    
    setFormData({
      title: customer.title || '',
      name: customer.name || '',
      pan: customer.pan || '',
      email: customer.email || '',
      mobile: customer.mobile || '',
      address1: customer.address1 || '',
      address2: customer.address2 || '',
      address3: customer.address3 || '',
      city: customer.city || '',
      state: customer.state || '',
      pin: customer.pin || '',
      country: customer.country || 'India',
      date_of_birth: dob,
      branches: branchesArray,
      minors: customer.minors || []
    })
    setShowEditModal(true)
  }

  // Open view modal — load full record so minors and documents are complete
  const openViewModal = async (customer) => {
    try {
      if (token && customer?.investor_id) {
        const fresh = await api.getCustomer(token, customer.investor_id)
        setSelectedCustomer(fresh)
      } else {
        setSelectedCustomer(customer)
      }
    } catch (err) {
      console.error('Failed to load client for view:', err)
      setSelectedCustomer(customer)
    }
    setShowViewModal(true)
  }

  // Close modals
  const closeModals = () => {
    setShowAddModal(false)
    setShowEditModal(false)
    setShowViewModal(false)
    setSelectedCustomer(null)
    setDeletingMediaId(null)
    resetForm()
  }

  // Delete existing supporting document (edit mode)
  const handleDeleteExistingMedia = async (mediaId) => {
    if (!selectedCustomer?.investor_id || !token) return
    setDeletingMediaId(mediaId)
    setError('')
    try {
      await api.deleteCustomerMedia(token, selectedCustomer.investor_id, mediaId)
      setSelectedCustomer(prev => ({
        ...prev,
        media_documents: (prev?.media_documents || []).filter(d => String(d.id) !== String(mediaId))
      }))
    } catch (err) {
      setError(err.message || 'Failed to delete document')
    } finally {
      setDeletingMediaId(null)
    }
  }

  // Clear messages
  const clearMessages = () => {
    setError('')
    setSuccess('')
  }

  const handleExportCustomers = async () => {
    if (!masterKey.trim()) {
      setError('Master key is required for export.')
      return
    }
    setExportImportLoading(true)
    setError('')
    try {
      const blob = await api.exportCustomers(token, masterKey.trim())
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `customers_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setSuccess('Customers exported successfully.')
      setShowExportModal(false)
      setMasterKey('')
    } catch (err) {
      setError(err.message || 'Export failed.')
    } finally {
      setExportImportLoading(false)
    }
  }

  const handleImportCustomers = async () => {
    if (!masterKey.trim()) {
      setError('Master key is required for import.')
      return
    }
    if (!importFile) {
      setError('Please select a CSV file.')
      return
    }
    setExportImportLoading(true)
    setError('')
    setImportResult(null)
    try {
      const result = await api.importCustomers(token, masterKey.trim(), importFile)
      setImportResult(result)
      setSuccess(`Imported ${result.imported} customer(s).`)
      if (result.imported > 0) fetchCustomers(currentPage, searchTerm)
      setImportFile(null)
      setShowImportModal(false)
      setMasterKey('')
    } catch (err) {
      setError(err.message || 'Import failed.')
    } finally {
      setExportImportLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(clearMessages, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--dashboard-text)] flex items-center">
            <FiUsers className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-red-600 dark:text-red-400" />
            <span className="hidden sm:inline">Client Management</span>
            <span className="sm:hidden">Customers</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--dashboard-muted)]">
            Branch: {getUserBranchDisplay()}
          </p>
        </div>
        <div className="mt-3 sm:mt-0 flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setShowExportModal(true); setMasterKey(''); setError('') }}
            className="inline-flex items-center px-3 py-2 sm:px-4 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)] text-xs sm:text-sm font-medium rounded-lg transition-colors duration-200"
            title="Export customers to CSV (admin + master key required)"
          >
            <FiDownload className="w-4 h-4 mr-2 flex-shrink-0" />
            Export
          </button>
          <button
            onClick={() => { setShowImportModal(true); setMasterKey(''); setImportFile(null); setImportResult(null); setError('') }}
            className="inline-flex items-center px-3 py-2 sm:px-4 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)] text-xs sm:text-sm font-medium rounded-lg transition-colors duration-200"
            title="Import customers from CSV (admin + master key required)"
          >
            <FiUpload className="w-4 h-4 mr-2 flex-shrink-0" />
            Import
          </button>
          <span className="hidden sm:inline text-[var(--dashboard-muted)] text-sm">|</span>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-3 py-2 sm:px-4 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors duration-200"
          >
            <FiPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Add Customer</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start">
          <FiAlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
          <button onClick={clearMessages} className="ml-3 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200">
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start">
          <FiCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-green-800 dark:text-green-300">{success}</p>
          </div>
          <button onClick={clearMessages} className="ml-3 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200">
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Export Customers Modal (admin + master key) */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70" onClick={() => setShowExportModal(false)}>
          <div className="bg-[var(--dashboard-card)] rounded-xl shadow-xl max-w-sm w-full p-6 border border-[var(--dashboard-border)]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--dashboard-text)] mb-2">Export Customers</h3>
            <p className="text-sm text-[var(--dashboard-muted)] mb-4">Enter master key to download customer details as CSV.</p>
            <input
              type="password"
              value={masterKey}
              onChange={e => setMasterKey(e.target.value)}
              placeholder="Master key"
              className="w-full px-3 py-2 border border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] mb-4"
            />
            <div className="flex gap-2">
              <button onClick={handleExportCustomers} disabled={exportImportLoading} className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium">
                {exportImportLoading ? 'Exporting…' : 'Export'}
              </button>
              <button onClick={() => { setShowExportModal(false); setMasterKey('') }} className="px-4 py-2 border border-[var(--dashboard-border)] rounded-lg text-[var(--dashboard-muted)] hover:bg-[var(--dashboard-border)]/50 text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Customers Modal (admin + master key) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70" onClick={() => setShowImportModal(false)}>
          <div className="bg-[var(--dashboard-card)] rounded-xl shadow-xl max-w-sm w-full p-6 border border-[var(--dashboard-border)]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--dashboard-text)] mb-2">Import Customers</h3>
            <p className="text-sm text-[var(--dashboard-muted)] mb-4">Upload a CSV with columns: Name, PAN, and optionally Investor ID, Email, Mobile, Address1, City, State, Pin, Branch(es).</p>
            <input
              type="password"
              value={masterKey}
              onChange={e => setMasterKey(e.target.value)}
              placeholder="Master key"
              className="w-full px-3 py-2 border border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] mb-3"
            />
            <input
              type="file"
              accept=".csv"
              onChange={e => setImportFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-[var(--dashboard-muted)] mb-4 file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-red-600 file:text-white file:text-sm file:font-medium file:cursor-pointer"
            />
            {importResult && (
              <p className="text-sm text-green-600 dark:text-green-400 mb-2">Imported: {importResult.imported} of {importResult.total_rows}. {importResult.errors?.length ? `Errors: ${importResult.errors.length}` : ''}</p>
            )}
            <div className="flex gap-2">
              <button onClick={handleImportCustomers} disabled={exportImportLoading || !importFile} className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium">
                {exportImportLoading ? 'Importing…' : 'Import'}
              </button>
              <button onClick={() => { setShowImportModal(false); setMasterKey(''); setImportFile(null); setImportResult(null) }} className="px-4 py-2 border border-[var(--dashboard-border)] rounded-lg text-[var(--dashboard-muted)] hover:bg-[var(--dashboard-border)]/50 text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-[var(--card-bg)] rounded-lg shadow-sm border border-[var(--stroke)] p-4 sm:p-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--dashboard-muted)] w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, PAN, email, mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
              />
            </div>
          </div>
          {user?.role === 'admin' && (
            <div className="w-full sm:w-56">
              <SearchableSelect
                options={[{ label: 'All branches', value: '' }, ...availableBranches]}
                value={filterBranchKey}
                onChange={(v) => setFilterBranchKey(v != null ? String(v) : '')}
                placeholder="Filter by branch"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 sm:px-6 bg-red-600 hover:bg-red-700 disabled:bg-[var(--dashboard-muted)] text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            {loading ? (
              <FiRefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <FiSearch className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Search</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-[var(--card-bg)] rounded-lg shadow-sm border border-[var(--stroke)] p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <FiUsers className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-[var(--text-muted)]">Total Customers</p>
              <p className="text-lg sm:text-2xl font-bold text-[var(--text-primary)]">{totalCustomers.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--card-bg)] rounded-lg shadow-sm border border-[var(--stroke)] p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 bg-[var(--dashboard-primary)]/10 rounded-lg">
              <FiFilter className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--dashboard-primary)]" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-[var(--text-muted)]">Showing</p>
              <p className="text-lg sm:text-2xl font-bold text-[var(--text-primary)]">{customers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--card-bg)] rounded-lg shadow-sm border border-[var(--stroke)] p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FiDownload className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-[var(--text-muted)]">Branch</p>
              <p className="text-sm sm:text-lg font-bold text-[var(--text-primary)] truncate">{getUserBranchDisplay()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-[var(--card-bg)] rounded-lg shadow-sm border border-[var(--stroke)]">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--stroke)]">
          <h3 className="text-base sm:text-lg font-medium text-[var(--text-primary)]">Customers</h3>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <FiRefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-red-600 dark:text-red-400" />
            <span className="ml-2 text-sm text-[var(--text-muted)]">Loading customers...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <FiUsers className="w-10 h-10 sm:w-12 sm:h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-[var(--text-primary)] mb-2">No customers found</h3>
            <p className="text-sm text-[var(--text-muted)]">
              {searchTerm ? 'Try adjusting your search terms.' : 'Start by adding your first customer.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block sm:hidden">
              <div className="divide-y divide-[var(--stroke)]">
                {customers.map((customer) => (
                  <div key={customer.investor_id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {customer.name || 'N/A'}
                          </h4>
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">
                          ID: {customer.investor_id}
                        </div>
                        {customer.matched_minor_names?.length > 0 && (
                          <div className="mt-1 text-xs text-[var(--dashboard-primary)]">
                            Minor match: {customer.matched_minor_names.join(', ')}
                          </div>
                        )}
                        <div className="mt-2 space-y-1">
                          <div className="text-xs text-[var(--text-muted)]">
                            <span className="font-medium">Mobile:</span> {customer.mobile || 'N/A'}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            <span className="font-medium">PAN:</span> {customer.pan || 'N/A'}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            <span className="font-medium">Branch(es):</span> {getBranchDisplay(customer)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => openViewModal(customer)}
                          className="p-2 text-[var(--dashboard-primary)] hover:opacity-90"
                          title="View Details"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(customer)}
                          className="p-2 text-[var(--dashboard-primary)] hover:opacity-90"
                          title="Edit Customer"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteCustomer(customer.investor_id)}
                            className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete Customer"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--stroke)]">
                <thead className="bg-[var(--card-hover)]">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      PAN
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Branch
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--stroke)]">
                  {customers.map((customer) => (
                    <tr key={customer.investor_id} className="hover:bg-[var(--card-hover)]">
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <div>
                          <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {customer.name || 'N/A'}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            ID: {customer.investor_id}
                          </div>
                          {customer.matched_minor_names?.length > 0 && (
                            <div className="text-xs text-[var(--dashboard-primary)]">
                              Minor match: {customer.matched_minor_names.join(', ')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <div>
                          <div className="text-sm text-[var(--text-primary)]">
                            {customer.mobile || 'N/A'}
                          </div>
                          <div className="text-xs text-[var(--text-muted)] truncate">
                            {customer.email || 'No email'}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-[var(--text-primary)]">
                        {customer.pan || 'N/A'}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-[var(--text-primary)] truncate">
                        {getBranchDisplay(customer)}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-1 lg:space-x-2">
                          <button
                            onClick={() => openViewModal(customer)}
                            className="p-1 lg:p-2 text-[var(--dashboard-primary)] hover:opacity-90"
                            title="View Details"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(customer)}
                            className="p-1 lg:p-2 text-[var(--dashboard-primary)] hover:opacity-90"
                            title="Edit Customer"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteCustomer(customer.investor_id)}
                              className="p-1 lg:p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Delete Customer"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-[var(--stroke)]">
                <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
                  <div className="text-xs sm:text-sm text-[var(--text-primary)]">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                      className="px-3 py-1 text-xs sm:text-sm border border-[var(--stroke)] rounded-md hover:bg-[var(--card-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || loading}
                      className="px-3 py-1 text-xs sm:text-sm border border-[var(--stroke)] rounded-md hover:bg-[var(--card-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <CustomerModal
          title="Add Customer"
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleAddCustomer}
          onClose={closeModals}
          loading={loading}
          error={error}
          pincodeLoading={pincodeLoading}
          pincodeSuggestions={pincodeSuggestions}
          showPincodeDropdown={showPincodeDropdown}
          handlePincodeChange={handlePincodeChange}
          selectPincodeSuggestion={selectPincodeSuggestion}
          mediaFiles={mediaFiles}
          handleMediaUpload={handleMediaUpload}
          removeMediaFile={removeMediaFile}
          getFileIcon={getFileIcon}
          availableBranches={availableBranches}
        />
      )}

      {/* Edit Client Modal */}
      {showEditModal && (
        <CustomerModal
          title="Edit Customer"
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleEditCustomer}
          onClose={closeModals}
          loading={loading}
          error={error}
          pincodeLoading={pincodeLoading}
          pincodeSuggestions={pincodeSuggestions}
          showPincodeDropdown={showPincodeDropdown}
          handlePincodeChange={handlePincodeChange}
          selectPincodeSuggestion={selectPincodeSuggestion}
          mediaFiles={mediaFiles}
          handleMediaUpload={handleMediaUpload}
          removeMediaFile={removeMediaFile}
          getFileIcon={getFileIcon}
          availableBranches={availableBranches}
          existingMedia={selectedCustomer?.media_documents}
          onDeleteExistingMedia={handleDeleteExistingMedia}
          deletingMediaId={deletingMediaId}
        />
      )}

      {/* View Client Modal */}
      {showViewModal && selectedCustomer && (
        <ViewCustomerModal
          customer={selectedCustomer}
          onClose={closeModals}
          getBranchDisplay={getBranchDisplay}
        />
      )}
    </div>
  )
}

// Client Modal Component
function CustomerModal({ 
  title, 
  formData, 
  setFormData, 
  onSubmit, 
  onClose, 
  loading,
  error = '',
  pincodeLoading, 
  pincodeSuggestions, 
  showPincodeDropdown, 
  handlePincodeChange, 
  selectPincodeSuggestion,
  mediaFiles,
  handleMediaUpload,
  removeMediaFile,
  getFileIcon,
  availableBranches = [],
  existingMedia = [],
  onDeleteExistingMedia,
  deletingMediaId
}) {
  const { user } = useAuth()
  const pincodeDropdownRef = useRef(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle click outside to close pincode dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pincodeDropdownRef.current && !pincodeDropdownRef.current.contains(event.target)) {
        // Close dropdown logic would be handled by parent component
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--dashboard-card)] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[var(--dashboard-border)]">
          <h3 className="text-lg font-medium text-[var(--dashboard-text)]">{title}</h3>
        </div>
        
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start">
              <FiAlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--dashboard-text)] mb-1">
                Title
              </label>
              <select
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-[var(--dashboard-primary)]"
              >
                <option value="">Select Title</option>
                <option value="Mr.">Mr.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Ms.">Ms.</option>
                <option value="Dr.">Dr.</option>
                <option value="Prof.">Prof.</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--dashboard-text)] mb-1">
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-[var(--dashboard-primary)]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--dashboard-text)] mb-1">
                PAN Number *
              </label>
              <input
                type="text"
                name="pan"
                value={formData.pan}
                onChange={(e) => setFormData(prev => ({ ...prev, pan: e.target.value.toUpperCase() }))}
                pattern={getPattern('pan')}
                maxLength="10"
                title={getTitle('pan')}
                placeholder="ABCDE1234F"
                required
                className="w-full px-3 py-2 border border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-[var(--dashboard-primary)]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--dashboard-text)] mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="user@example.com"
                required
                className="w-full px-3 py-2 border border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-[var(--dashboard-primary)]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--dashboard-text)] mb-1">
                Mobile *
              </label>
              <input
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value.replace(/\D/g, '') }))}
                pattern={getPattern('mobile')}
                maxLength="10"
                title={getTitle('mobile')}
                placeholder="9876543210"
                required
                className="w-full px-3 py-2 border border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-[var(--dashboard-primary)]"
              />
            </div>
            
                    <div>
                      <label className="block text-sm font-medium text-[var(--dashboard-text)] mb-1">
                        Date of Birth *
                      </label>
                      <DatePickerInput
                        value={formData.date_of_birth}
                        onChange={(v) => setFormData(prev => ({ ...prev, date_of_birth: v }))}
                        required
                        inputClassName="w-full px-3 py-2 border border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-[var(--dashboard-primary)]"
                      />
                    </div>
                    
                    <div className="relative md:col-span-2">
                      <label className="block text-sm font-medium text-[var(--dashboard-text)] mb-1">
                        PIN Code * (Enter to auto-fill location)
                      </label>
                      <input
                        type="text"
                        name="pin"
                        value={formData.pin}
                        onChange={(e) => handlePincodeChange(e.target.value)}
                        required
                        placeholder="Enter PIN code to auto-fill location"
                        className="w-full px-3 py-2 border border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-[var(--dashboard-primary)]"
                      />
                      
                      {/* Loading indicator */}
                      {pincodeLoading && (
                        <div className="absolute right-3 top-8">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        </div>
                      )}
                      
                      {/* Pincode suggestions dropdown */}
                      {showPincodeDropdown && pincodeSuggestions.length > 0 && (
                        <div ref={pincodeDropdownRef} className="absolute z-10 w-full mt-1 bg-[var(--dashboard-card)] border border-[var(--dashboard-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {pincodeSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => selectPincodeSuggestion(suggestion)}
                              className="w-full px-3 py-2 text-left hover:bg-[var(--dashboard-border)]/50 focus:bg-[var(--dashboard-border)]/50 focus:outline-none"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium text-[var(--dashboard-text)]">
                                    {suggestion.pincode}
                                  </div>
                                  <div className="text-sm text-[var(--dashboard-muted)]">
                                    {suggestion.city}, {suggestion.state}
                                  </div>
                                </div>
                                <div className="text-xs text-[var(--dashboard-muted)]">
                                  {suggestion.country}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[var(--dashboard-text)] mb-1">
                        Address Line 1 *
                      </label>
                      <input
                        type="text"
                        name="address1"
                        value={formData.address1}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-[var(--dashboard-primary)]"
                      />
                    </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--dashboard-text)] mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                name="address2"
                value={formData.address2}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-[var(--dashboard-primary)]"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--dashboard-text)] mb-1">
                Address Line 3
              </label>
              <input
                type="text"
                name="address3"
                value={formData.address3}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-[var(--dashboard-primary)]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--dashboard-text)] mb-1">
                City *
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-[var(--dashboard-primary)]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--dashboard-text)] mb-1">
                State *
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-[var(--dashboard-primary)]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--dashboard-text)] mb-1">
                Country *
              </label>
              <input
                type="text"
                name="country"
                value={formData.country || 'India'}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-[var(--dashboard-primary)]"
              />
            </div>
            
            {user?.role === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-[var(--dashboard-text)] mb-1">
                Branch(es) *
              </label>
              <MultiSelect
                options={availableBranches.length > 0 ? availableBranches : getAllValidBranches().map(branch => ({ label: branch, value: branch }))}
                value={formData.branches}
                onChange={(branches) => setFormData(prev => ({ ...prev, branches: branches || [] }))}
                placeholder="Select one or more branches"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Admin only: map customer to one or more branches
              </p>
            </div>
            )}
          </div>

          {/* Minors Section */}
          <div className="space-y-6 pt-8 border-t-2 border-[var(--dashboard-border)] mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[var(--dashboard-card)] p-5 rounded-xl border border-[var(--dashboard-border)] shadow-sm">
              <div className="flex-1">
                <h4 className="text-lg font-bold text-[var(--dashboard-text)] flex items-center mb-2">
                  <div className="p-2 bg-[var(--dashboard-primary)]/12 rounded-lg mr-3">
                    <FiUsers className="w-5 h-5 text-[var(--dashboard-primary)]" />
                  </div>
                  Minors (Children/Wards)
                </h4>
                <p className="text-sm text-[var(--dashboard-muted)] ml-12">
                  Add minors attached to this customer. Each minor will have their own unique investor ID.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (formData.minors && formData.minors.length >= 10) {
                    alert('Maximum 10 minors can be added per customer')
                    return
                  }
                  setFormData(prev => ({
                    ...prev,
                    minors: [...(prev.minors || []), {
                      name: '',
                      date_of_birth: '',
                      pan: '',
                      relationship_type: 'child',
                      use_same_address: true,
                      address1: '',
                      address2: '',
                      address3: '',
                      city: '',
                      state: '',
                      pin: '',
                      father_name: '',
                      mother_name: ''
                    }]
                  }))
                }}
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-[var(--dashboard-primary)] hover:bg-[var(--dashboard-primary-hover)] rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <FiPlus className="w-4 h-4 mr-2" />
                Add Minor
              </button>
            </div>

            {formData.minors && formData.minors.length > 0 ? (
              <div className="space-y-5">
                {formData.minors.map((minor, index) => (
                  <div key={index} className="border-2 border-[var(--dashboard-border)] rounded-xl p-5 bg-[var(--dashboard-card)] shadow-md hover:shadow-lg transition-shadow duration-200">
                    <div className="flex items-center justify-between mb-5 pb-4 border-b border-[var(--dashboard-border)]">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--dashboard-primary)]/12 text-[var(--dashboard-primary)] font-bold text-sm">
                          {index + 1}
                        </div>
                        <h5 className="text-base font-semibold text-[var(--dashboard-text)]">
                          Minor {index + 1} Details
                        </h5>
                        {minor.relationship_type && (
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                            {minor.relationship_type === 'child' ? 'Child' : 'Ward'}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to remove Minor ${index + 1}?`)) {
                            setFormData(prev => ({
                              ...prev,
                              minors: prev.minors.filter((_, i) => i !== index)
                            }))
                          }
                        }}
                        className="p-2 text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 dark:hover:bg-red-600 rounded-lg transition-colors duration-200"
                        title="Remove Minor"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-[var(--dashboard-text)] mb-2">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={minor.name || ''}
                          onChange={(e) => {
                            const newMinors = [...formData.minors]
                            newMinors[index].name = e.target.value
                            setFormData(prev => ({ ...prev, minors: newMinors }))
                          }}
                          required
                          placeholder="Enter minor's full name"
                          className="w-full px-4 py-2.5 text-sm border-2 border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[var(--dashboard-text)] mb-2">
                          Date of Birth <span className="text-red-500">*</span>
                        </label>
                        <DatePickerInput
                          value={minor.date_of_birth || ''}
                          onChange={(v) => {
                            const newMinors = [...formData.minors]
                            newMinors[index].date_of_birth = v
                            setFormData(prev => ({ ...prev, minors: newMinors }))
                          }}
                          required
                          max={new Date().toISOString().split('T')[0]}
                          inputClassName="w-full px-4 py-2.5 text-sm border-2 border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[var(--dashboard-text)] mb-2">
                          PAN Number <span className="text-gray-400 text-xs">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={minor.pan || ''}
                          onChange={(e) => {
                            const newMinors = [...formData.minors]
                            newMinors[index].pan = e.target.value.toUpperCase()
                            setFormData(prev => ({ ...prev, minors: newMinors }))
                          }}
                          maxLength="10"
                          placeholder="ABCDE1234F"
                          className="w-full px-4 py-2.5 text-sm border-2 border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[var(--dashboard-text)] mb-2">
                          Relationship Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={minor.relationship_type || 'child'}
                          onChange={(e) => {
                            const newMinors = [...formData.minors]
                            newMinors[index].relationship_type = e.target.value
                            setFormData(prev => ({ ...prev, minors: newMinors }))
                          }}
                          required
                          className="w-full px-4 py-2.5 text-sm border-2 border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                          <option value="child">Parent-Child</option>
                          <option value="ward">Guardian-Ward</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
                          <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={minor.use_same_address !== false}
                              onChange={(e) => {
                                const newMinors = [...formData.minors]
                                newMinors[index].use_same_address = e.target.checked
                                if (e.target.checked) {
                                  // Copy parent's address
                                  newMinors[index].address1 = formData.address1
                                  newMinors[index].address2 = formData.address2
                                  newMinors[index].address3 = formData.address3
                                  newMinors[index].city = formData.city
                                  newMinors[index].state = formData.state
                                  newMinors[index].pin = formData.pin
                                }
                                setFormData(prev => ({ ...prev, minors: newMinors }))
                              }}
                              className="w-5 h-5 rounded border-2 border-[var(--dashboard-border)] text-[var(--dashboard-primary)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:ring-offset-2 cursor-pointer"
                            />
                            <div>
                              <span className="text-sm font-semibold text-[var(--dashboard-text)] block">
                                Use same address as major customer
                              </span>
                              <span className="text-xs text-[var(--dashboard-muted)]">
                                Address will be automatically copied from parent
                              </span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {minor.use_same_address === false && (
                        <div className="md:col-span-2 space-y-4 pt-2 border-t border-[var(--dashboard-border)]">
                          <div className="flex items-center mb-3">
                            <div className="h-px flex-1 bg-[var(--dashboard-border)]"></div>
                            <span className="px-3 text-xs font-semibold text-[var(--dashboard-muted)] uppercase tracking-wide">Different Address</span>
                            <div className="h-px flex-1 bg-[var(--dashboard-border)]"></div>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-[var(--dashboard-text)] mb-2">
                              Address Line 1
                            </label>
                            <input
                              type="text"
                              value={minor.address1 || ''}
                              onChange={(e) => {
                                const newMinors = [...formData.minors]
                                newMinors[index].address1 = e.target.value
                                setFormData(prev => ({ ...prev, minors: newMinors }))
                              }}
                              placeholder="Enter address line 1"
                              className="w-full px-4 py-2.5 text-sm border-2 border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-[var(--dashboard-text)] mb-2">
                              Address Line 2
                            </label>
                            <input
                              type="text"
                              value={minor.address2 || ''}
                              onChange={(e) => {
                                const newMinors = [...formData.minors]
                                newMinors[index].address2 = e.target.value
                                setFormData(prev => ({ ...prev, minors: newMinors }))
                              }}
                              placeholder="Enter address line 2"
                              className="w-full px-4 py-2.5 text-sm border-2 border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-[var(--dashboard-text)] mb-2">
                              City
                            </label>
                            <input
                              type="text"
                              value={minor.city || ''}
                              onChange={(e) => {
                                const newMinors = [...formData.minors]
                                newMinors[index].city = e.target.value
                                setFormData(prev => ({ ...prev, minors: newMinors }))
                              }}
                              placeholder="Enter city"
                              className="w-full px-4 py-2.5 text-sm border-2 border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-[var(--dashboard-text)] mb-2">
                              State
                            </label>
                            <input
                              type="text"
                              value={minor.state || ''}
                              onChange={(e) => {
                                const newMinors = [...formData.minors]
                                newMinors[index].state = e.target.value
                                setFormData(prev => ({ ...prev, minors: newMinors }))
                              }}
                              placeholder="Enter state"
                              className="w-full px-4 py-2.5 text-sm border-2 border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-[var(--dashboard-text)] mb-2">
                              PIN Code
                            </label>
                            <input
                              type="text"
                              value={minor.pin || ''}
                              onChange={(e) => {
                                const newMinors = [...formData.minors]
                                newMinors[index].pin = e.target.value.replace(/\D/g, '').slice(0, 6)
                                setFormData(prev => ({ ...prev, minors: newMinors }))
                              }}
                              maxLength="6"
                              placeholder="6 digits"
                              className="w-full px-4 py-2.5 text-sm border-2 border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-semibold text-[var(--dashboard-text)] mb-2">
                          Father's Name <span className="text-gray-400 text-xs">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={minor.father_name || ''}
                          onChange={(e) => {
                            const newMinors = [...formData.minors]
                            newMinors[index].father_name = e.target.value
                            setFormData(prev => ({ ...prev, minors: newMinors }))
                          }}
                          placeholder="Enter father's name"
                          className="w-full px-4 py-2.5 text-sm border-2 border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[var(--dashboard-text)] mb-2">
                          Mother's Name <span className="text-gray-400 text-xs">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={minor.mother_name || ''}
                          onChange={(e) => {
                            const newMinors = [...formData.minors]
                            newMinors[index].mother_name = e.target.value
                            setFormData(prev => ({ ...prev, minors: newMinors }))
                          }}
                          placeholder="Enter mother's name"
                          className="w-full px-4 py-2.5 text-sm border-2 border-[var(--dashboard-border)] rounded-lg bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 px-4 bg-[var(--dashboard-bg)] rounded-lg border-2 border-dashed border-[var(--dashboard-border)]">
                <FiUsers className="w-12 h-12 text-[var(--dashboard-muted)] mx-auto mb-3" />
                <p className="text-sm font-medium text-[var(--dashboard-muted)] mb-1">
                  No minors added yet
                </p>
                <p className="text-xs text-[var(--dashboard-muted)]">
                  Click "Add Minor" above to add a child or ward to this customer
                </p>
              </div>
            )}
          </div>

          {/* Media Upload Section */}
          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-medium text-[var(--dashboard-text)] mb-2">
                Supporting Documents
              </label>
              {existingMedia && existingMedia.length > 0 && (
                <div className="mb-3 space-y-2">
                  <h4 className="text-sm font-medium text-[var(--dashboard-text)]">
                    Existing documents ({existingMedia.length})
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {existingMedia.map((doc, idx) => {
                      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
                      const href = doc.filename ? `${baseUrl}/uploads/${doc.filename}` : null
                      const isDeleting = deletingMediaId !== null && String(doc.id) === String(deletingMediaId)
                      return (
                        <div key={doc.id ?? idx} className="flex items-center justify-between p-2 bg-[var(--dashboard-bg)] rounded-lg border border-[var(--dashboard-border)]">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{getFileIcon({ name: doc.original_name || doc.filename, type: doc.mime_type })}</span>
                            <div>
                              {href ? (
                                <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[var(--dashboard-primary)] hover:underline truncate max-w-48 block">
                                  {doc.original_name || doc.filename || 'Document'}
                                </a>
                              ) : (
                                <p className="text-sm font-medium text-[var(--dashboard-text)] truncate max-w-48">{doc.original_name || doc.filename || 'Document'}</p>
                              )}
                              {doc.uploaded_at && (
                                <p className="text-xs text-[var(--dashboard-muted)]">Uploaded {new Date(doc.uploaded_at).toLocaleString()}</p>
                              )}
                            </div>
                          </div>
                          {onDeleteExistingMedia && (
                            <button
                              type="button"
                              onClick={() => onDeleteExistingMedia(doc.id)}
                              disabled={isDeleting}
                              className="p-1.5 rounded-lg text-[var(--error)] hover:bg-[var(--error-muted)] disabled:opacity-50"
                              title="Delete document"
                              aria-label="Delete document"
                            >
                              {isDeleting ? (
                                <FiRefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <FiTrash2 className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="border-2 border-dashed border-[var(--dashboard-border)] rounded-lg p-6 text-center hover:border-[var(--dashboard-primary)] transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleMediaUpload}
                  className="hidden"
                  id="media-upload"
                />
                <label
                  htmlFor="media-upload"
                  className="inline-flex items-center px-4 py-2 border border-[var(--dashboard-primary)] text-sm font-semibold rounded-lg text-[var(--dashboard-primary)] bg-[var(--dashboard-primary)]/10 hover:bg-[var(--dashboard-primary)]/20 focus:outline-none focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:ring-offset-1 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                >
                  📎 Upload Documents
                </label>
                <p className="text-xs text-[var(--dashboard-muted)] mt-2">
                  Supported formats: JPEG, PNG, GIF, WebP, PDF (Max 10MB each)
                </p>
              </div>
            </div>

            {/* Display uploaded files */}
            {mediaFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-[var(--dashboard-text)]">
                  Uploaded Files ({mediaFiles.length})
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {mediaFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-[var(--dashboard-bg)] rounded-lg border border-[var(--dashboard-border)]">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getFileIcon(file)}</span>
                        <div>
                          <p className="text-sm font-medium text-[var(--dashboard-text)] truncate max-w-48">
                            {file.name}
                          </p>
                          <p className="text-xs text-[var(--dashboard-muted)]">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMediaFile(index)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--dashboard-text)] bg-[var(--dashboard-border)]/40 hover:bg-[var(--dashboard-border)]/70 rounded-lg transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-[var(--dashboard-muted)] rounded-lg transition-colors duration-200"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// View Client Modal Component
function ViewCustomerModal({ customer, onClose, getBranchDisplay }) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--dashboard-card)] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[var(--dashboard-border)]">
          <h3 className="text-lg font-medium text-[var(--dashboard-text)]">Customer Details</h3>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-dark-300 mb-2">Basic Information</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-[var(--dashboard-text)]">Name:</span>
                  <span className="ml-2 text-sm text-[var(--dashboard-text)]">{customer.name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-[var(--dashboard-text)]">Investor ID:</span>
                  <span className="ml-2 text-sm text-[var(--dashboard-text)]">{customer.investor_id}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-[var(--dashboard-text)]">PAN:</span>
                  <span className="ml-2 text-sm text-[var(--dashboard-text)]">{customer.pan || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-[var(--dashboard-text)]">Aadhar:</span>
                  <span className="ml-2 text-sm text-[var(--dashboard-text)]">{customer.aadhar_number || 'N/A'}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-dark-300 mb-2">Contact Information</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-[var(--dashboard-text)]">Mobile:</span>
                  <span className="ml-2 text-sm text-[var(--dashboard-text)]">{customer.mobile || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-[var(--dashboard-text)]">Email:</span>
                  <span className="ml-2 text-sm text-[var(--dashboard-text)]">{customer.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-[var(--dashboard-text)]">Branch(es):</span>
                  <span className="ml-2 text-sm text-[var(--dashboard-text)]">
                    {getBranchDisplay(customer)}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-dark-300 mb-2">Personal Information</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-[var(--dashboard-text)]">Date of Birth:</span>
                  <span className="ml-2 text-sm text-[var(--dashboard-text)]">{customer.date_of_birth || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-[var(--dashboard-text)]">Father's Name:</span>
                  <span className="ml-2 text-sm text-[var(--dashboard-text)]">{customer.father_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-[var(--dashboard-text)]">Mother's Name:</span>
                  <span className="ml-2 text-sm text-[var(--dashboard-text)]">{customer.mother_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-[var(--dashboard-text)]">Occupation:</span>
                  <span className="ml-2 text-sm text-[var(--dashboard-text)]">{customer.occupation || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-[var(--dashboard-text)]">Annual Income:</span>
                  <span className="ml-2 text-sm text-[var(--dashboard-text)]">
                    {customer.annual_income ? `₹${customer.annual_income.toLocaleString()}` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-dark-300 mb-2">Address</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-[var(--dashboard-text)]">Address 1:</span>
                  <span className="ml-2 text-sm text-[var(--dashboard-text)]">{customer.address1 || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-[var(--dashboard-text)]">Address 2:</span>
                  <span className="ml-2 text-sm text-[var(--dashboard-text)]">{customer.address2 || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-[var(--dashboard-text)]">Address 3:</span>
                  <span className="ml-2 text-sm text-[var(--dashboard-text)]">{customer.address3 || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-[var(--dashboard-text)]">City:</span>
                  <span className="ml-2 text-sm text-[var(--dashboard-text)]">{customer.city || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-[var(--dashboard-text)]">State:</span>
                  <span className="ml-2 text-sm text-[var(--dashboard-text)]">{customer.state || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-[var(--dashboard-text)]">PIN:</span>
                  <span className="ml-2 text-sm text-[var(--dashboard-text)]">{customer.pin || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Minors */}
            {customer.minors && Array.isArray(customer.minors) && customer.minors.length > 0 && (
              <div className="md:col-span-2 pt-4 border-t border-[var(--dashboard-border)]">
                <h4 className="text-sm font-medium text-gray-500 dark:text-dark-300 mb-3">Minors ({customer.minors.length})</h4>
                <div className="space-y-4">
                  {customer.minors.map((m, idx) => (
                    <div key={m.investor_id || m.minor_id || idx} className="rounded-lg border border-[var(--dashboard-border)] p-3 bg-[var(--dashboard-bg)]">
                      <p className="text-sm font-semibold text-[var(--dashboard-text)]">{m.name || `Minor ${idx + 1}`}</p>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-[var(--dashboard-text)]">
                        {m.investor_id && <div><span className="text-gray-500 dark:text-dark-300">Investor ID:</span> {m.investor_id}</div>}
                        {m.pan && <div><span className="text-gray-500 dark:text-dark-300">PAN:</span> {m.pan}</div>}
                        {m.date_of_birth && <div><span className="text-gray-500 dark:text-dark-300">DOB:</span> {m.date_of_birth}</div>}
                        {m.relationship_type && <div><span className="text-gray-500 dark:text-dark-300">Relationship:</span> {m.relationship_type}</div>}
                        {(m.father_name || m.mother_name) && (
                          <div className="sm:col-span-2">
                            {[m.father_name && `Father: ${m.father_name}`, m.mother_name && `Mother: ${m.mother_name}`].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents Section */}
            {customer.media_documents && customer.media_documents.length > 0 && (
              <div className="md:col-span-2 pt-4 border-t border-[var(--dashboard-border)]">
                <h4 className="text-sm font-medium text-gray-500 dark:text-dark-300 mb-3">
                  Documents ({customer.media_documents.length})
                </h4>
                <div className="space-y-3">
                  {customer.media_documents.map((doc) => {
                    const href = `${baseUrl}/uploads/${doc.filename}`
                    const sizeKB = doc.file_size ? Math.round(doc.file_size / 1024) : null
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between border border-gray-200 dark:border-dark-600 rounded-lg px-3 py-2 bg-[var(--dashboard-bg)]"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[var(--dashboard-text)]">
                            {doc.original_name || doc.filename}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-dark-300">
                            {doc.mime_type || 'File'}
                            {sizeKB !== null && ` • ${sizeKB} KB`}
                            {doc.uploaded_at && ` • Uploaded ${new Date(doc.uploaded_at).toLocaleString()}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-xs font-medium text-[var(--dashboard-primary)] border border-blue-200 dark:border-blue-500 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/40"
                          >
                            View
                          </a>
                          <a
                            href={href}
                            download={doc.original_name || doc.filename}
                            className="px-3 py-1.5 text-xs font-medium text-[var(--dashboard-primary)] border border-dashed border-blue-200 dark:border-blue-500 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/40"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end pt-4">
            <button
              onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-[var(--dashboard-text)] bg-[var(--dashboard-border)]/40 hover:bg-[var(--dashboard-border)]/70 rounded-lg transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

