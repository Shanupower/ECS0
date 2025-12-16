import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { getCategoryDisplayName } from '../utils/categoryMapping'
import { 
  FiClock, 
  FiFilter, 
  FiEye, 
  FiTrash2, 
  FiRotateCw, 
  FiRefreshCw,
  FiAlertCircle,
  FiUser,
  FiCalendar,
  FiCheck,
  FiFile,
  FiDownload,
  FiChevronDown,
  FiChevronUp,
  FiAward,
  FiX
} from 'react-icons/fi'

export default function TransactionsPage() {
  const { token, user } = useAuth()
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    from: new Date().toISOString().slice(0, 7) + '-01', // First day of current month
    to: new Date().toISOString().slice(0, 10), // Today
    category: '',
    status: '',
    emp_code: '',
    size: 20,
    sort: 'created_at:desc'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    hasMore: false
  })
  const [successMessage, setSuccessMessage] = useState('')
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showErrorToast, setShowErrorToast] = useState(false)
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [showBonusModal, setShowBonusModal] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [bonusData, setBonusData] = useState({ additional_cc: 0, additional_si: 0 })

  const isAdmin = user?.role === 'admin'

  const toggleRow = (receiptId) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(receiptId)) {
      newExpanded.delete(receiptId)
    } else {
      newExpanded.add(receiptId)
    }
    setExpandedRows(newExpanded)
  }

  const loadReceipts = async () => {
    if (!token) return
    
    setLoading(true)
    setError('')
    
    try {
      // Create a clean query object with only the filters we need
      const query = {
        from: filters.from,
        to: filters.to,
        category: filters.category || undefined,
        status: filters.status || undefined,
        page: pagination.page
      }
      
      // Remove undefined values
      Object.keys(query).forEach(key => query[key] === undefined && delete query[key])
      
      let result
      
      // Handle branch users - they should use branch receipts endpoint
      if (user?.role === 'branch' && user?.branch_code) {
        result = await api.getBranchReceipts(token, user.branch_code, query)
      }
      // Use employee-specific endpoint if filtering by employee code and user is admin
      // or if user is employee (show only their own receipts)
      else if (filters.emp_code && isAdmin) {
        result = await api.getReceiptsByEmpCode(token, filters.emp_code, query)
      } else if (!isAdmin && user?.emp_code) {
        // For employees, always use their own emp_code
        // Only pass date, category, and status filters (not emp_code)
        const empQuery = {
          from: filters.from,
          to: filters.to,
          category: filters.category || undefined,
          status: filters.status || undefined,
          page: pagination.page
        }
        // Remove undefined values
        Object.keys(empQuery).forEach(key => empQuery[key] === undefined && delete empQuery[key])
        result = await api.getReceiptsByEmpCode(token, user.emp_code, empQuery)
      } else {
        result = await api.listReceipts(token, query)
      }
      
      let receiptsData = []
      if (Array.isArray(result)) {
        receiptsData = result
        setPagination(prev => ({ ...prev, total: result.length, hasMore: result.length === filters.size }))
      } else if (result.items && Array.isArray(result.items)) {
        // Handle the new API response structure: {items: [], page: 1, size: 20, total: 2}
        receiptsData = result.items
        setPagination(prev => ({ 
          ...prev, 
          total: result.total || result.items.length,
          hasMore: result.items.length === result.size
        }))
      } else if (result.data && Array.isArray(result.data)) {
        // Handle legacy response structure: {data: [], total: 2}
        receiptsData = result.data
        setPagination(prev => ({ 
          ...prev, 
          total: result.total || result.data.length,
          hasMore: result.hasMore || false
        }))
      }

      // Load media files for each receipt
      const receiptsWithMedia = await Promise.all(
        receiptsData.map(async (receipt) => {
          try {
            const receiptId = receipt._key || receipt.id
            if (!receiptId) return receipt
            
            // Fetch media files for this receipt
            const mediaResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/receipts/${receiptId}/media`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            
            if (mediaResponse.ok) {
              const mediaFiles = await mediaResponse.json()
              return { ...receipt, media_files: mediaFiles }
            }
          } catch (err) {
            console.warn(`Failed to load media for receipt ${receipt._key || receipt.id}:`, err)
          }
          return receipt
        })
      )
      
      setReceipts(receiptsWithMedia)
    } catch (err) {
      console.error('Error loading receipts:', err)
      setError(err.message || 'Failed to load receipts')
      setReceipts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Reset to page 1 when any filter changes
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [filters.from, filters.to, filters.category, filters.status, filters.emp_code])

  useEffect(() => {
    loadReceipts()
  }, [token, filters.from, filters.to, filters.category, filters.status, filters.emp_code, pagination.page])

  // Check for success/error messages from receipt creation
  useEffect(() => {
    const checkForMessages = () => {
      const forceRefresh = localStorage.getItem('receipt_force_refresh')
      
      if (forceRefresh === 'true') {
        // Force refresh the receipts list
        loadReceipts()
        localStorage.removeItem('receipt_force_refresh')
      }
      
      // Check for success message
      const successMsg = localStorage.getItem('receipt_success_message')
      const successTimestamp = localStorage.getItem('receipt_success_timestamp')
      
      if (successMsg && successTimestamp) {
        const messageTime = parseInt(successTimestamp)
        const currentTime = Date.now()
        
        // Show message if it's less than 5 seconds old
        if (currentTime - messageTime < 5000) {
          setSuccessMessage(successMsg)
          setShowSuccessToast(true)
          
          // Clear the message from localStorage
          localStorage.removeItem('receipt_success_message')
          localStorage.removeItem('receipt_success_timestamp')
          
          // Auto-hide toast after 5 seconds
          setTimeout(() => {
            setShowSuccessToast(false)
            setSuccessMessage('')
          }, 5000)
        } else {
          // Clean up old messages
          localStorage.removeItem('receipt_success_message')
          localStorage.removeItem('receipt_success_timestamp')
        }
      }
      
      // Check for error message
      const errorMsg = localStorage.getItem('receipt_error_message')
      const errorTimestamp = localStorage.getItem('receipt_error_timestamp')
      
      if (errorMsg && errorTimestamp) {
        const messageTime = parseInt(errorTimestamp)
        const currentTime = Date.now()
        
        // Show message if it's less than 5 seconds old
        if (currentTime - messageTime < 5000) {
          setErrorMessage(errorMsg)
          setShowErrorToast(true)
          
          // Clear the message from localStorage
          localStorage.removeItem('receipt_error_message')
          localStorage.removeItem('receipt_error_timestamp')
          
          // Auto-hide toast after 5 seconds
          setTimeout(() => {
            setShowErrorToast(false)
            setErrorMessage('')
          }, 5000)
        } else {
          // Clean up old messages
          localStorage.removeItem('receipt_error_message')
          localStorage.removeItem('receipt_error_timestamp')
        }
      }
    }
    
    checkForMessages()
  }, [])

  const handleAddBonus = (receipt) => {
    setSelectedReceipt(receipt)
    setBonusData({
      additional_cc: receipt.additional_cc || 0,
      additional_si: receipt.additional_si || 0
    })
    setShowBonusModal(true)
  }

  const handleSaveBonus = async () => {
    if (!selectedReceipt || !token) return
    
    try {
      await api.updateReceiptBonus(token, selectedReceipt._key || selectedReceipt.id, bonusData)
      setShowBonusModal(false)
      setSelectedReceipt(null)
      setBonusData({ additional_cc: 0, additional_si: 0 })
      setSuccessMessage('Bonus updated successfully')
      setShowSuccessToast(true)
      setTimeout(() => setShowSuccessToast(false), 5000)
      loadReceipts()
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update bonus')
      setShowErrorToast(true)
      setTimeout(() => setShowErrorToast(false), 5000)
    }
  }

  const handleCloseBonusModal = () => {
    setShowBonusModal(false)
    // Reset data only when closing, not when canceling
    setTimeout(() => {
      setSelectedReceipt(null)
      setBonusData({ additional_cc: 0, additional_si: 0 })
    }, 300) // Small delay to allow modal close animation
  }

  const handleDelete = async (receiptId, reason = 'deleted by user') => {
    if (!confirm('Are you sure you want to delete this receipt?')) return
    
    try {
      await api.deleteReceipt(token, receiptId, reason)
      await loadReceipts() // Reload the list
    } catch (err) {
      alert('Failed to delete receipt: ' + err.message)
    }
  }

  const handleRestore = async (receiptId) => {
    try {
      await api.restoreReceipt(token, receiptId)
      await loadReceipts() // Reload the list
    } catch (err) {
      alert('Failed to restore receipt: ' + err.message)
    }
  }

  const handleStatusChange = async (receiptId, newStatus) => {
    if (!confirm(`Are you sure you want to change the status to ${newStatus}?`)) return
    
    try {
      await api.updateReceiptStatus(token, receiptId, newStatus)
      await loadReceipts() // Reload the list
    } catch (err) {
      alert('Failed to update status: ' + err.message)
    }
  }

  const handleViewDocument = async (receiptId, mediaId, filename) => {
    try {
      // Use the proper API endpoint to get the media file
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/receipts/${receiptId}/media/${mediaId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch document')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      
      // Clean up the URL after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    } catch (err) {
      alert('Failed to view document: ' + err.message)
    }
  }

  const handleDownloadDocument = async (receiptId, mediaId, originalName) => {
    try {
      // Use the proper API endpoint to get the media file
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/receipts/${receiptId}/media/${mediaId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to download document')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      // Create download link
      const link = document.createElement('a')
      link.href = url
      link.download = originalName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the URL after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    } catch (err) {
      alert('Failed to download document: ' + err.message)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  const getStatusBadge = (receipt) => {
    if (receipt.deleted_at) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400"></span>
          Deleted
        </span>
      )
    }
    
    // Check transaction status - default to 'Pending' if not set
    const status = receipt.status || receipt.transaction_status || 'Pending'
    
    if (status === 'Completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
          <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400"></span>
          Completed
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-600 dark:bg-yellow-400"></span>
          Pending
        </span>
      )
    }
  }

  const handleDownloadHistory = async () => {
    if (!token) return
    try {
      const query = {
        from: filters.from,
        to: filters.to,
        branch_code: user?.branch_code || undefined,
        emp_code: isAdmin ? (filters.emp_code || undefined) : undefined,
        status: filters.status || undefined,
        category: filters.category || undefined
      }
      Object.keys(query).forEach(key => query[key] === undefined && delete query[key])
      const blob = await api.exportTransactions(token, query)
      // api.exportTransactions returns text; use fetch-style download instead
    } catch (err) {
      console.error('Failed to export transactions via API helper, falling back to direct download:', err)
    }

    // Fallback: direct browser download using fetch
    try {
      const qs = new URLSearchParams({
        from: filters.from,
        to: filters.to,
        ...(user?.branch_code ? { branch_code: user.branch_code } : {}),
        ...(isAdmin && filters.emp_code ? { emp_code: filters.emp_code } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.category ? { category: filters.category } : {})
      }).toString()

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/export/transactions?${qs}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (!res.ok) throw new Error('Failed to download transaction history')
      const csvText = await res.text()
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    } catch (err) {
      setErrorMessage(err.message || 'Failed to download transaction history')
      setShowErrorToast(true)
      setTimeout(() => setShowErrorToast(false), 5000)
    }
  }

  const getRowBackgroundColor = (receipt) => {
    if (receipt.deleted_at) {
      return 'bg-red-50 dark:bg-red-900/10 border-l-4 border-red-400'
    }
    
    const status = receipt.status || receipt.transaction_status || 'Pending'
    
    if (status === 'Completed') {
      return 'bg-green-50 dark:bg-green-900/10 border-l-4 border-green-400'
    } else {
      return 'bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-400'
    }
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center">
          <FiCheck className="w-5 h-5 mr-2" />
          <span>{successMessage}</span>
          <button
            onClick={() => setShowSuccessToast(false)}
            className="ml-4 text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Error Toast */}
      {showErrorToast && (
        <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center">
          <FiAlertCircle className="w-5 h-5 mr-2" />
          <span>{errorMessage}</span>
          <button
            onClick={() => setShowErrorToast(false)}
            className="ml-4 text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center flex-1 min-w-0">
          <FiClock className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400 mr-2 sm:mr-3 flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">Transaction History</h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-dark-300 mt-0.5 hidden sm:block">View and manage all receipts</p>
          </div>
        </div>
        <button
          onClick={loadReceipts}
          disabled={loading}
          className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 border border-gray-300 dark:border-dark-600 rounded-lg sm:text-sm font-medium text-gray-700 dark:text-dark-200 bg-white dark:bg-dark-700 hover:bg-gray-50 dark:hover:bg-dark-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800 disabled:opacity-50 transition-colors duration-200"
        >
          <FiRefreshCw className={`w-5 h-5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline ml-2">Refresh</span>
        </button>
        <button
          onClick={handleDownloadHistory}
          disabled={loading}
          className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 border border-gray-300 dark:border-dark-600 rounded-lg sm:text-sm font-medium text-gray-700 dark:text-dark-200 bg-white dark:bg-dark-700 hover:bg-gray-50 dark:hover:bg-dark-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800 disabled:opacity-50 transition-colors duration-200"
        >
          <FiDownload className="w-5 h-5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline ml-2">Download CSV</span>
        </button>
      </div>
      
      {/* Filters */}
      <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
        <div className="flex items-center mb-3 sm:mb-4">
          <FiFilter className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400 mr-2" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">From Date</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiCalendar className="h-4 w-4 text-gray-400 dark:text-dark-400" />
              </div>
              <input
                type="date"
                value={filters.from}
                onChange={e => setFilters(prev => ({ ...prev, from: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">To Date</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiCalendar className="h-4 w-4 text-gray-400 dark:text-dark-400" />
              </div>
              <input
                type="date"
                value={filters.to}
                onChange={e => setFilters(prev => ({ ...prev, to: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Category</label>
            <select
              value={filters.category}
              onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="w-full p-3 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200"
            >
              <option value="">All Categories</option>
              <option value="MF">Mutual Fund</option>
              <option value="FD">Fixed Deposit</option>
              <option value="INS">Insurance</option>
              <option value="BOND">Bonds</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full p-3 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
        {isAdmin && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Employee Code</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiUser className="h-4 w-4 text-gray-400 dark:text-dark-400" />
              </div>
              <input
                type="text"
                value={filters.emp_code}
                onChange={e => setFilters(prev => ({ ...prev, emp_code: e.target.value }))}
                placeholder="Filter by employee"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200"
              />
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center px-4 py-2 text-gray-500 dark:text-dark-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 dark:border-red-400 mr-3"></div>
            Loading receipts...
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center">
          <FiAlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
          {/* Mobile Card View */}
          <div className="block sm:hidden">
            <div className="divide-y divide-gray-200 dark:divide-dark-700">
              {receipts.map((receipt) => (
                <div key={receipt._key || receipt.id || receipt.receipt_no} className="p-4">
                  <div className="space-y-3">
                    {/* Header with Receipt # and Status */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-base font-bold text-gray-900 dark:text-white">
                            {receipt.receipt_no || receipt.receiptNo}
                          </h4>
                          {getStatusBadge(receipt)}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(receipt.date)}</p>
                      </div>
                      <button
                        onClick={() => window.open(`/receipts/${receipt._key || receipt.id}`, '_blank')}
                        className="flex-shrink-0 inline-flex items-center px-2.5 py-1.5 border border-blue-300 dark:border-blue-600 text-xs font-medium rounded-lg text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60"
                      >
                        <FiEye className="w-3.5 h-3.5 mr-1" />
                        View
                      </button>
                    </div>

                    {/* Key Info Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Amount</span>
                        <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(receipt.fd_deposit_amount || receipt.investment_amount || receipt.investmentAmount)}</p>
                      </div>
                      {isAdmin && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Employee</span>
                          <p className="font-medium text-gray-900 dark:text-white truncate">{receipt.employee_name || receipt.employeeName}</p>
                        </div>
                      )}
                    </div>

                    {/* Investor Info */}
                    <div className="border-t border-gray-200 dark:border-dark-700 pt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Investor</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{receipt.investor_name || receipt.investorName}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{receipt.investor_id || receipt.investorId}</p>
                    </div>

                    {/* Product Info */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Product</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{receipt.fd_scheme_name || receipt.scheme_name || receipt.schemeName || 'N/A'}</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        <p className="text-xs text-gray-600 dark:text-gray-400">{getCategoryDisplayName(receipt.product_category)}</p>
                        {receipt.scheme_option && receipt.product_category === 'MF' && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                            receipt.scheme_option === 'GROWTH' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                            receipt.scheme_option === 'IDCW_PAYOUT' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                            'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'
                          }`}>
                            {receipt.scheme_option === 'GROWTH' ? 'G' : 
                             receipt.scheme_option === 'IDCW_PAYOUT' ? 'IP' : 
                             receipt.scheme_option === 'IDCW_REINVEST' ? 'IR' : 
                             receipt.scheme_option}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Documents */}
                    {receipt.media_count > 0 && (
                      <div className="pt-2 border-t border-gray-200 dark:border-dark-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Documents ({receipt.media_count})</p>
                        <button
                          onClick={() => handleViewDocument(receipt._key || receipt.id, 'all')}
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60"
                        >
                          <FiFile className="w-3.5 h-3.5 mr-1.5" />
                          View Documents
                        </button>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-dark-700">
                      <button
                        onClick={() => window.open(`/receipts/${receipt._key || receipt.id}`, '_blank')}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                      >
                        <FiEye className="w-3.5 h-3.5 mr-1.5" />
                        View Details
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleAddBonus(receipt)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-orange-300 dark:border-orange-600 text-xs font-medium rounded-lg text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/40 hover:bg-orange-100 dark:hover:bg-orange-900/60"
                        >
                          <FiAward className="w-3.5 h-3.5 mr-1.5" />
                          Add Bonus
                        </button>
                      )}
                      {(isAdmin || (receipt.emp_code || receipt.empCode) === user?.emp_code) && (
                        <button
                          onClick={() => handleDelete(receipt._key || receipt.id)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-red-300 dark:border-red-600 text-xs font-medium rounded-lg text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/40 hover:bg-red-100 dark:hover:bg-red-900/60"
                        >
                          <FiTrash2 className="w-3.5 h-3.5 mr-1.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto max-h-[65vh] overflow-y-auto">
            <table className="w-full table-auto">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-dark-700 dark:to-dark-800 sticky top-0 z-10 border-b-2 border-gray-300 dark:border-dark-600">
                <tr>
                  <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 dark:text-dark-300 uppercase tracking-wider w-[35px]"></th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-dark-300 uppercase">Receipt #</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-dark-300 uppercase">Investor / Product</th>
                  {isAdmin ? (
                    <>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-dark-300 uppercase">Employee</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 dark:text-dark-300 uppercase">Amount</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-dark-300 uppercase">Date</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 dark:text-dark-300 uppercase">Amount</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-700">
                {receipts.map((receipt) => {
                  const receiptId = receipt._key || receipt.id
                  const isExpanded = expandedRows.has(receiptId)
                  
                  return (
                    <React.Fragment key={receiptId}>
                      <tr 
                        className={`hover:opacity-80 cursor-pointer transition-all group ${getRowBackgroundColor(receipt)}`}
                        onClick={() => toggleRow(receiptId)}
                      >
                        <td className="px-2 py-3 text-center">
                          <div className="flex items-center justify-center w-full">
                            {isExpanded ? (
                              <FiChevronUp className="w-4 h-4 text-red-600 dark:text-red-400 transition-transform" />
                            ) : (
                              <FiChevronDown className="w-4 h-4 text-gray-400 dark:text-dark-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-sm text-gray-900 dark:text-white tracking-tight">
                            {receipt.receipt_no || receipt.receiptNo}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="space-y-1.5">
                            <div>
                              <div className="font-medium text-sm text-gray-900 dark:text-white truncate" title={receipt.investor_name || receipt.investorName}>
                                {receipt.investor_name || receipt.investorName}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-dark-400 truncate">{receipt.investor_id || receipt.investorId}</div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className="text-xs font-medium text-gray-700 dark:text-dark-300 truncate" title={receipt.fd_scheme_name || receipt.scheme_name || receipt.schemeName}>
                                {receipt.fd_scheme_name || receipt.scheme_name || receipt.schemeName || 'N/A'}
                              </div>
                              <span className="text-gray-400 dark:text-dark-500">•</span>
                              <span className="text-xs text-gray-600 dark:text-dark-400">
                                {getCategoryDisplayName(receipt.product_category)}
                              </span>
                              {receipt.scheme_option && receipt.product_category === 'MF' && (
                                <>
                                  <span className="text-gray-400 dark:text-dark-500">•</span>
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                    receipt.scheme_option === 'GROWTH' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                    receipt.scheme_option === 'IDCW_PAYOUT' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                                    'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'
                                  }`}>
                                    {receipt.scheme_option === 'GROWTH' ? 'G' : 
                                     receipt.scheme_option === 'IDCW_PAYOUT' ? 'IP' : 
                                     receipt.scheme_option === 'IDCW_REINVEST' ? 'IR' : 
                                     receipt.scheme_option}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        {isAdmin ? (
                          <td className="px-3 py-3">
                            <div>
                              <div className="font-medium text-sm text-gray-900 dark:text-white truncate" title={receipt.employee_name || receipt.employeeName}>
                                {receipt.employee_name || receipt.employeeName}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-dark-400 truncate">{receipt.emp_code || receipt.empCode}</div>
                            </div>
                          </td>
                        ) : (
                          <td className="px-3 py-3">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatDate(receipt.date)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-dark-400">
                                {getCategoryDisplayName(receipt.product_category)}
                              </div>
                            </div>
                          </td>
                        )}
                        <td className="px-3 py-3">
                          <div className="text-right">
                            <div className="text-base font-bold text-gray-900 dark:text-white">
                              {formatCurrency(receipt.fd_deposit_amount || receipt.investment_amount || receipt.investmentAmount)}
                            </div>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Row */}
                      {isExpanded && (
                        <tr className="bg-gray-50/50 dark:bg-dark-700/50 border-l-4 border-red-600">
                          <td colSpan="5" className="px-4 py-4">
                            <div className="flex items-center justify-between gap-6">
                              {/* Status Section */}
                              <div className="flex flex-col gap-2">
                                <div className="text-xs font-semibold text-gray-600 dark:text-dark-400 uppercase tracking-wider">Status</div>
                                <div>{getStatusBadge(receipt)}</div>
                              </div>
                              
                              {/* Documents Section */}
                              <div className="flex flex-col gap-2 flex-1">
                                <div className="text-xs font-semibold text-gray-600 dark:text-dark-400 uppercase tracking-wider">Documents</div>
                                {receipt.media_files && receipt.media_files.length > 0 ? (
                                  <div className="flex flex-wrap items-center gap-2">
                                    {receipt.media_files.map((file, idx) => (
                                      <button
                                        key={idx}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleViewDocument(receiptId, file.id, file.filename)
                                        }}
                                        className="inline-flex items-center justify-center w-9 h-9 text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-md transition-all hover:scale-110 group shadow-sm"
                                        title={`View ${file.original_name}`}
                                      >
                                        <FiFile className="w-4 h-4" />
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-400 italic">No documents attached</div>
                                )}
                              </div>
                              
                              {/* Actions Section - Pushed to the right */}
                              <div className="flex flex-col gap-2">
                                <div className="text-xs font-semibold text-gray-600 dark:text-dark-400 uppercase tracking-wider">Actions</div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      window.open(`/receipts/${receiptId}`, '_blank')
                                    }}
                                    className="inline-flex items-center px-3 py-1.5 border border-blue-300 dark:border-blue-600 text-xs font-medium rounded-md text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all hover:shadow-sm"
                                  >
                                    <FiEye className="w-3.5 h-3.5 mr-1.5" />
                                    View Details
                                  </button>
                                  {isAdmin && !receipt.deleted_at && (receipt.status || receipt.transaction_status || 'Pending') === 'Pending' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleStatusChange(receiptId, 'Completed')
                                      }}
                                      className="inline-flex items-center px-3 py-1.5 border border-green-300 dark:border-green-600 text-xs font-medium rounded-md text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/40 hover:bg-green-100 dark:hover:bg-green-900/60 transition-all hover:shadow-sm"
                                    >
                                      <FiCheck className="w-3.5 h-3.5 mr-1.5" />
                                      Complete
                                    </button>
                                  )}
                                  {isAdmin && !receipt.deleted_at && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleAddBonus(receipt)
                                      }}
                                      className="inline-flex items-center px-3 py-1.5 border border-orange-300 dark:border-orange-600 text-xs font-medium rounded-md text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/40 hover:bg-orange-100 dark:hover:bg-orange-900/60 transition-all hover:shadow-sm mr-2"
                                    >
                                      <FiAward className="w-3.5 h-3.5 mr-1.5" />
                                      Bonus
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      receipt.deleted_at ? handleRestore(receiptId) : handleDelete(receiptId)
                                    }}
                                    className="inline-flex items-center px-3 py-1.5 border border-red-300 dark:border-red-600 text-xs font-medium rounded-md text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/40 hover:bg-red-100 dark:hover:bg-red-900/60 transition-all hover:shadow-sm"
                                  >
                                    {receipt.deleted_at ? (
                                      <>
                                        <FiRotateCw className="w-3.5 h-3.5 mr-1.5" />
                                        Restore
                                      </>
                                    ) : (
                                      <>
                                        <FiTrash2 className="w-3.5 h-3.5 mr-1.5" />
                                        Delete
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {receipts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FiClock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No receipts found for the selected filters.</p>
            </div>
          )}
          
          {/* Pagination */}
          {pagination.hasMore && (
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-dark-700">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                className="w-full py-2 sm:py-3 px-4 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bonus Modal */}
      {showBonusModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Add Bonus - Receipt {selectedReceipt.receipt_no || selectedReceipt.receiptNo}
                </h2>
                <button
                  onClick={handleCloseBonusModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Additional CC (Commission Credit)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={bonusData.additional_cc}
                    onChange={(e) => setBonusData({ ...bonusData, additional_cc: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Current CC: ₹{((selectedReceipt.cc_amount || 0) + (selectedReceipt.additional_cc || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Additional SI (Service Income)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={bonusData.additional_si}
                    onChange={(e) => setBonusData({ ...bonusData, additional_si: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Current SI: ₹{((selectedReceipt.si_amount || 0) + (selectedReceipt.additional_si || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCloseBonusModal}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBonus}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Save Bonus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
