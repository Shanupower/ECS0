import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { normalizeBranchForDB, normalizeBranchForEmployee, normalizeBranchForAPI, getAllValidBranches } from '../utils/branchMapping'
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
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiX
} from 'react-icons/fi'

export default function ClientManagementPage() {
  const { user, token } = useAuth()
  const canDelete = user?.role === 'admin' || user?.role === 'manager'
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
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
    branches: [] // Changed from branch to branches (array)
  })
  const [pincodeLoading, setPincodeLoading] = useState(false)
  const [pincodeSuggestions, setPincodeSuggestions] = useState([])
  const [showPincodeDropdown, setShowPincodeDropdown] = useState(false)
  const [mediaFiles, setMediaFiles] = useState([])
  const [availableBranches, setAvailableBranches] = useState([]) // Branches fetched from API

  const pageSize = 50 // Increased from 10 to show more customers per page

  // Fetch branches from API on component mount
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        if (token) {
          const branches = await api.listBranches(token)
          // Map branches to options format, using branch_name as both label and value
          const branchOptions = branches.map(branch => ({
            label: branch.branch_name,
            value: branch.branch_name
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

  // Auto-populate branch from user context
  useEffect(() => {
    if (user && formData.branches.length === 0) {
      const userBranch = user.branch || user.branch_name || ''
      if (userBranch) {
        setFormData(prev => ({
          ...prev,
          branches: [userBranch]
        }))
      }
    }
  }, [user])

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

      const data = await api.listCustomers(token, query)
      setCustomers(data.items || [])
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
      
      // Create FormData to handle file uploads
      const formDataToSend = new FormData()
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined) {
          formDataToSend.append(key, formData[key])
        }
      })
      
      // Add media files
      mediaFiles.forEach((file, index) => {
        formDataToSend.append('media', file)
      })
      
      // Add branches array - normalize each branch
      const branches = formData.branches && formData.branches.length > 0 
        ? formData.branches.map(b => normalizeBranchForDB(b))
        : [normalizeBranchForDB(user?.branch || user?.branch_name || 'UNASSIGNED')]
      
      // Send branches array - FormData with bracket notation for arrays (Express/multer will parse as array)
      branches.forEach((branch) => {
        formDataToSend.append('branches[]', branch)
      })
      
      formDataToSend.append('created_by', user?.emp_code || user?.username)
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/customers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create customer')
      }
      
      const result = await response.json()

      setSuccess(`Client created successfully! ${result.media_files > 0 ? `(${result.media_files} files uploaded)` : ''}`)
      setShowAddModal(false)
      resetForm()
      fetchCustomers(currentPage, searchTerm)
    } catch (err) {
      setError('Failed to create client: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle edit customer
  const handleEditCustomer = async (e) => {
    e.preventDefault()
    
    // Validate form (for update, only validate filled fields)
    const validation = validateCustomerForm(formData)
    if (!validation.valid) {
      setError(validation.errors.join('. '))
      return
    }
    
    setLoading(true)
    try {
      const token = localStorage.getItem('ecs_token')
      
      // Prepare update data with normalized branches
      const updateData = { ...formData }
      if (updateData.branches && updateData.branches.length > 0) {
        updateData.branches = updateData.branches.map(b => normalizeBranchForAPI(b))
      }
      
      await api.updateCustomer(token, selectedCustomer.investor_id, updateData)

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
      branches: []
    })
    setPincodeSuggestions([])
    setShowPincodeDropdown(false)
    setMediaFiles([])
  }

  // Open edit modal
  const openEditModal = (customer) => {
    setSelectedCustomer(customer)
    // Convert DB format (relationship_manager) to employee format for dropdown
    // Handle both single branch (string) and multiple branches (array)
    const dbBranch = customer.relationship_manager || ''
    const branchesArray = Array.isArray(dbBranch) 
      ? dbBranch.map(b => normalizeBranchForEmployee(b))
      : dbBranch 
        ? [normalizeBranchForEmployee(dbBranch)] 
        : []
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
      date_of_birth: customer.date_of_birth || '',
      branches: branchesArray
    })
    setShowEditModal(true)
  }

  // Open view modal
  const openViewModal = (customer) => {
    setSelectedCustomer(customer)
    setShowViewModal(true)
  }

  // Close modals
  const closeModals = () => {
    setShowAddModal(false)
    setShowEditModal(false)
    setShowViewModal(false)
    setSelectedCustomer(null)
    resetForm()
  }

  // Clear messages
  const clearMessages = () => {
    setError('')
    setSuccess('')
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <FiUsers className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-red-600 dark:text-red-400" />
            <span className="hidden sm:inline">Client Management</span>
            <span className="sm:hidden">Customers</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-dark-300">
            Branch: {user?.branch || 'Unknown Branch'}
          </p>
        </div>
        <div className="mt-3 sm:mt-0">
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

      {/* Search and Filters */}
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-4 sm:p-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-dark-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, PAN, email, mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-dark-400 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 sm:px-6 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center justify-center"
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
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <FiUsers className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-dark-300">Total Customers</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{totalCustomers.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FiFilter className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-dark-300">Showing</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{customers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FiDownload className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-dark-300">Branch</p>
              <p className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white truncate">{user?.branch || 'Unknown'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-dark-700">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Customers</h3>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <FiRefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-red-600 dark:text-red-400" />
            <span className="ml-2 text-sm text-gray-600 dark:text-dark-300">Loading customers...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <FiUsers className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 dark:text-dark-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">No customers found</h3>
            <p className="text-sm text-gray-600 dark:text-dark-300">
              {searchTerm ? 'Try adjusting your search terms.' : 'Start by adding your first customer.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block sm:hidden">
              <div className="divide-y divide-gray-200 dark:divide-dark-700">
                {customers.map((customer) => (
                  <div key={customer.investor_id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {customer.name || 'N/A'}
                          </h4>
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-dark-400">
                          ID: {customer.investor_id}
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="text-xs text-gray-600 dark:text-dark-300">
                            <span className="font-medium">Mobile:</span> {customer.mobile || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-dark-300">
                            <span className="font-medium">PAN:</span> {customer.pan || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-dark-300">
                            <span className="font-medium">Branch(es):</span> {
                              Array.isArray(customer.relationship_manager)
                                ? customer.relationship_manager.join(', ')
                                : customer.relationship_manager || 'N/A'
                            }
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => openViewModal(customer)}
                          className="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="View Details"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(customer)}
                          className="p-2 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
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
              <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-700">
                <thead className="bg-gray-50 dark:bg-dark-700">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                      PAN
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                      Branch
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-700">
                  {customers.map((customer) => (
                    <tr key={customer.investor_id} className="hover:bg-gray-50 dark:hover:bg-dark-700">
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {customer.name || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-dark-400">
                            ID: {customer.investor_id}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <div>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {customer.mobile || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-dark-400 truncate">
                            {customer.email || 'No email'}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-gray-900 dark:text-white">
                        {customer.pan || 'N/A'}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-gray-900 dark:text-white truncate">
                        {Array.isArray(customer.relationship_manager)
                          ? customer.relationship_manager.join(', ')
                          : customer.relationship_manager || 'N/A'}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-1 lg:space-x-2">
                          <button
                            onClick={() => openViewModal(customer)}
                            className="p-1 lg:p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="View Details"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(customer)}
                            className="p-1 lg:p-2 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
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
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-dark-700">
                <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
                  <div className="text-xs sm:text-sm text-gray-700 dark:text-dark-300">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                      className="px-3 py-1 text-xs sm:text-sm border border-gray-300 dark:border-dark-600 rounded-md hover:bg-gray-50 dark:hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || loading}
                      className="px-3 py-1 text-xs sm:text-sm border border-gray-300 dark:border-dark-600 rounded-md hover:bg-gray-50 dark:hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* View Client Modal */}
      {showViewModal && selectedCustomer && (
        <ViewCustomerModal
          customer={selectedCustomer}
          onClose={closeModals}
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
  pincodeLoading, 
  pincodeSuggestions, 
  showPincodeDropdown, 
  handlePincodeChange, 
  selectPincodeSuggestion,
  mediaFiles,
  handleMediaUpload,
  removeMediaFile,
  getFileIcon,
  availableBranches = []
}) {
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
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
        </div>
        
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">
                Title
              </label>
              <select
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="user@example.com"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">
                        Date of Birth *
                      </label>
                      <input
                        type="date"
                        name="date_of_birth"
                        value={formData.date_of_birth}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    
                    <div className="relative md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">
                        PIN Code * (Enter to auto-fill location)
                      </label>
                      <input
                        type="text"
                        name="pin"
                        value={formData.pin}
                        onChange={(e) => handlePincodeChange(e.target.value)}
                        required
                        placeholder="Enter PIN code to auto-fill location"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      
                      {/* Loading indicator */}
                      {pincodeLoading && (
                        <div className="absolute right-3 top-8">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        </div>
                      )}
                      
                      {/* Pincode suggestions dropdown */}
                      {showPincodeDropdown && pincodeSuggestions.length > 0 && (
                        <div ref={pincodeDropdownRef} className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {pincodeSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => selectPincodeSuggestion(suggestion)}
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-600 focus:bg-gray-100 dark:focus:bg-dark-600 focus:outline-none"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {suggestion.pincode}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-dark-400">
                                    {suggestion.city}, {suggestion.state}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-400 dark:text-dark-500">
                                  {suggestion.country}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">
                        Address Line 1 *
                      </label>
                      <input
                        type="text"
                        name="address1"
                        value={formData.address1}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                name="address2"
                value={formData.address2}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">
                Address Line 3
              </label>
              <input
                type="text"
                name="address3"
                value={formData.address3}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">
                City *
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">
                State *
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">
                Country *
              </label>
              <input
                type="text"
                name="country"
                value={formData.country || 'India'}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">
                Branch(es) *
              </label>
              <MultiSelect
                options={availableBranches.length > 0 ? availableBranches : getAllValidBranches().map(branch => ({ label: branch, value: branch }))}
                value={formData.branches}
                onChange={(branches) => setFormData(prev => ({ ...prev, branches: branches || [] }))}
                placeholder="Select one or more branches"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                You can select multiple branches for this customer
              </p>
            </div>
          </div>

          {/* Media Upload Section */}
          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-2">
                Supporting Documents
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
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
                  className="inline-flex items-center px-4 py-2 border border-blue-300 dark:border-blue-600 text-sm font-semibold rounded-lg text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                >
                  📎 Upload Documents
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Supported formats: JPEG, PNG, GIF, WebP, PDF (Max 10MB each)
                </p>
              </div>
            </div>

            {/* Display uploaded files */}
            {mediaFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-dark-300">
                  Uploaded Files ({mediaFiles.length})
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {mediaFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getFileIcon(file)}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-48">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
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
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-dark-300 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 rounded-lg transition-colors duration-200"
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
function ViewCustomerModal({ customer, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Customer Details</h3>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-dark-300 mb-2">Basic Information</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-300">Name:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">{customer.name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-300">Investor ID:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">{customer.investor_id}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-300">PAN:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">{customer.pan || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-300">Aadhar:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">{customer.aadhar_number || 'N/A'}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-dark-300 mb-2">Contact Information</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-300">Mobile:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">{customer.mobile || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-300">Email:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">{customer.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-300">Branch(es):</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">
                    {Array.isArray(customer.relationship_manager)
                      ? customer.relationship_manager.join(', ')
                      : customer.relationship_manager || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-dark-300 mb-2">Personal Information</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-300">Date of Birth:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">{customer.date_of_birth || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-300">Father's Name:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">{customer.father_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-300">Mother's Name:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">{customer.mother_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-300">Occupation:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">{customer.occupation || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-300">Annual Income:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">
                    {customer.annual_income ? `₹${customer.annual_income.toLocaleString()}` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-dark-300 mb-2">Address</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-300">Address 1:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">{customer.address1 || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-300">Address 2:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">{customer.address2 || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-300">Address 3:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">{customer.address3 || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-300">City:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">{customer.city || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-300">State:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">{customer.state || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-300">PIN:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">{customer.pin || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-dark-300 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

