import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast.jsx'
import { api } from '../api'
import { getCategoryDisplayName } from '../utils/categoryMapping'
import { normalizeReceiptsArray } from '../utils/receiptNormalizer'
import { Card, Button, EmptyState, Skeleton, SegmentedControl, Chip } from '../components/ui'
import DatePickerInput from '../components/ui/DatePickerInput.jsx'
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
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
  FiX,
  FiSearch,
  FiArrowUp,
  FiArrowDown,
  FiEdit,
  FiXCircle,
  FiBarChart,
  FiFileText,
  FiDollarSign,
  FiActivity,
  FiTrendingUp,
  FiSave,
  FiUpload,
  FiUploadCloud
} from 'react-icons/fi'

export default function TransactionsPage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(() => {
    const y = new Date().getFullYear()
    const params = new URLSearchParams(window.location.search)
    return {
      from: `${y}-01-01`,
      to: `${y}-12-31`,
      category: params.get('category') || '',
    status: params.get('status') || '',
    mode: '',
    emp_code: '',
    branch_code: params.get('branch') || '',
    search: '',
    amount_min: '',
    amount_max: '',
    size: 20,
    sort: 'created_at:desc'
  };
  });
  const [branches, setBranches] = useState([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    hasMore: false
  })
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [showBonusModal, setShowBonusModal] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [bonusData, setBonusData] = useState({ additional_cc: 0, additional_si: 0 })
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectRemark, setRejectRemark] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editData, setEditData] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [drafts, setDrafts] = useState([])
  const [loadingDrafts, setLoadingDrafts] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Apology + attach-documents modal state for legacy receipts missing media
  const [showLegacyDocsModal, setShowLegacyDocsModal] = useState(false)
  const [legacyReceipt, setLegacyReceipt] = useState(null)
  const [legacyFiles, setLegacyFiles] = useState([])
  const [legacyUploadError, setLegacyUploadError] = useState('')
  const [legacyUploading, setLegacyUploading] = useState(false)

  const isAdmin = user?.role === 'admin'
  const formatDateForInput = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const parseDateInput = (value) => {
    if (!value) return null
    const [year, month, day] = value.split('-').map(Number)
    if (!year || !month || !day) return null
    return new Date(year, month - 1, day)
  }

  const toggleRow = (receiptId) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(receiptId)) {
      newExpanded.delete(receiptId)
    } else {
      newExpanded.add(receiptId)
    }
    setExpandedRows(newExpanded)
  }

  const handleLegacyFilesChange = (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    const maxSize = 10 * 1024 * 1024 // 10MB per file, matches backend

    const valid = files.filter(file => {
      if (file.size > maxSize) {
        setLegacyUploadError(`File ${file.name} is too large. Maximum size is 10MB.`)
        return false
      }
      if (!allowedTypes.includes(file.type)) {
        setLegacyUploadError(`File ${file.name} has an unsupported format. Please upload images or PDF files.`)
        return false
      }
      return true
    })

    if (valid.length) {
      setLegacyUploadError('')
      setLegacyFiles(prev => [...prev, ...valid])
    }
    event.target.value = ''
  }

  const handleLegacyUpload = async () => {
    if (!legacyReceipt || !token || !legacyFiles.length) {
      setLegacyUploadError('Please select at least one document to upload.')
      return
    }
    setLegacyUploading(true)
    setLegacyUploadError('')
    try {
      const receiptId = legacyReceipt._key || legacyReceipt.id
      const uploadResult = await api.uploadReceiptMedia(token, receiptId, legacyFiles)
      const uploadedCount = (uploadResult && Array.isArray(uploadResult.files)) ? uploadResult.files.length : legacyFiles.length

      if (uploadedCount < legacyFiles.length) {
        setLegacyUploadError(`Some documents may not have been saved (saved ${uploadedCount} of ${legacyFiles.length}).`)
      } else {
        toast.success('Documents uploaded successfully.')
        setShowLegacyDocsModal(false)
        setLegacyFiles([])
        setLegacyReceipt(null)
        // Refresh receipts so UI shows new media_files
        loadReceipts(false)
      }
    } catch (err) {
      console.error('Legacy document upload failed:', err)
      setLegacyUploadError(err.message || 'Failed to upload documents.')
    } finally {
      setLegacyUploading(false)
    }
  }

  const loadSummary = async () => {
    if (!token) return
    
    setLoadingSummary(true)
    try {
      const txnType = filters.category === 'MF' ? mapModeDisplayToTxnType(filters.mode) : ''
      const query = {
        from: filters.from,
        to: filters.to,
        category: filters.category || undefined,
        status: filters.status || undefined,
        txn_type: txnType || undefined,
        search: filters.search || undefined,
        branch_code: filters.branch_code || undefined,
        emp_code: filters.emp_code || undefined
      }
      
      // Remove undefined values
      Object.keys(query).forEach(key => query[key] === undefined && delete query[key])
      
      const summaryData = await api.getTransactionSummary(token, query)
      setSummary(summaryData)
    } catch (err) {
      console.error('Error loading summary:', err)
    } finally {
      setLoadingSummary(false)
    }
  }

  const loadReceipts = async () => {
    if (!token) return
    
    const isLoadMore = pagination.page > 1
    if (isLoadMore) setLoadingMore(true)
    else setLoading(true)
    setError('')
    
    try {
      const txnType = filters.category === 'MF' ? mapModeDisplayToTxnType(filters.mode) : ''
      // Create a clean query object with all filters
      const query = {
        from: filters.from,
        to: filters.to,
        category: filters.category || undefined,
        status: filters.status || undefined,
        txn_type: txnType || undefined,
        search: filters.search || undefined,
        branch_code: filters.branch_code || undefined,
        sort: filters.sort || 'created_at:desc',
        page: pagination.page,
        size: filters.size || 20
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
          txn_type: txnType || undefined,
          search: filters.search || undefined,
          sort: filters.sort || 'created_at:desc',
          page: pagination.page,
          size: filters.size || 20
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

      // Load media files for each receipt and normalize fields
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
      
      // Normalize all receipts to use consistent field names (backward compatibility)
      let normalizedReceipts = normalizeReceiptsArray(receiptsWithMedia)
      
      // Apply amount range filter on frontend
      if (filters.amount_min || filters.amount_max) {
        normalizedReceipts = normalizedReceipts.filter(receipt => {
          const amount = receipt.investment_amount || receipt.fd_deposit_amount || 0
          if (filters.amount_min && amount < parseFloat(filters.amount_min)) return false
          if (filters.amount_max && amount > parseFloat(filters.amount_max)) return false
          return true
        })
      }
      
      setReceipts(prev => (isLoadMore ? [...prev, ...normalizedReceipts] : normalizedReceipts))
    } catch (err) {
      console.error('Error loading receipts:', err)
      setError(err.message || 'Failed to load receipts')
      setReceipts([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadDrafts = async () => {
    if (!token) return
    setLoadingDrafts(true)
    try {
      const list = await api.listReceiptDrafts(token)
      setDrafts(Array.isArray(list) ? list : [])
    } catch (err) {
      console.error('Failed to load receipt drafts:', err)
      setDrafts([])
    } finally {
      setLoadingDrafts(false)
    }
  }

  // Load branches for admin users
  useEffect(() => {
    if (isAdmin && token) {
      loadBranches()
    }
  }, [isAdmin, token])

  const loadBranches = async () => {
    if (!token) return
    setLoadingBranches(true)
    try {
      const branchesData = await api.listBranches(token)
      setBranches(Array.isArray(branchesData) ? branchesData : [])
    } catch (err) {
      console.error('Failed to load branches:', err)
    } finally {
      setLoadingBranches(false)
    }
  }

  useEffect(() => {
    // Reset to page 1 when any filter changes
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [filters.from, filters.to, filters.category, filters.status, filters.mode, filters.emp_code, filters.branch_code, filters.search, filters.sort, filters.amount_min, filters.amount_max])

  // Clear URL search params once after reading (dashboard click-filter) so address bar stays clean
  useEffect(() => {
    if (searchParams.get('category') || searchParams.get('branch')) setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadReceipts()
    loadSummary()
    loadDrafts()
  }, [token, filters.from, filters.to, filters.category, filters.status, filters.mode, filters.emp_code, filters.branch_code, filters.search, filters.sort, pagination.page])

  // Check for success/error messages from receipt creation
  useEffect(() => {
    const checkForMessages = () => {
      const forceRefresh = localStorage.getItem('receipt_force_refresh')
      
      if (forceRefresh === 'true') {
        // Force refresh the receipts list and drafts
        loadReceipts()
        loadDrafts()
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
          toast.success(successMsg)
          localStorage.removeItem('receipt_success_message')
          localStorage.removeItem('receipt_success_timestamp')
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
          toast.error(errorMsg)
          localStorage.removeItem('receipt_error_message')
          localStorage.removeItem('receipt_error_timestamp')
        } else {
          // Clean up old messages
          localStorage.removeItem('receipt_error_message')
          localStorage.removeItem('receipt_error_timestamp')
        }
      }

      // Check for receipt upload warning (documents may not have been saved)
      const uploadErrorMsg = localStorage.getItem('receipt_upload_error')
      if (uploadErrorMsg) {
        toast.error(uploadErrorMsg)
        localStorage.removeItem('receipt_upload_error')
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
      toast.success('Bonus updated successfully')
      loadReceipts()
    } catch (err) {
      toast.error(err.message || 'Failed to update bonus')
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
      toast.error('Failed to delete receipt: ' + err.message)
    }
  }

  const handleRestore = async (receiptId) => {
    try {
      await api.restoreReceipt(token, receiptId)
      await loadReceipts() // Reload the list
    } catch (err) {
      toast.error('Failed to restore receipt: ' + err.message)
    }
  }

  const handleStatusChange = async (receiptId, newStatus) => {
    if (!confirm(`Are you sure you want to change the status to ${newStatus}?`)) return
    
    try {
      await api.updateReceiptStatus(token, receiptId, newStatus)
      await loadReceipts() // Reload the list
    } catch (err) {
      toast.error('Failed to update status: ' + err.message)
    }
  }

  const handleReject = (receipt) => {
    setSelectedReceipt(receipt)
    setRejectRemark('')
    setShowRejectModal(true)
  }

  const handleConfirmReject = async () => {
    if (!selectedReceipt || !token) return
    
    if (!rejectRemark.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }
    
    try {
      // Update status to Failed
      await api.updateReceiptStatus(token, selectedReceipt._key || selectedReceipt.id, 'Failed')
      
      // Update receipt with rejection remark
      await api.updateReceipt(token, selectedReceipt._key || selectedReceipt.id, {
        rejection_remark: rejectRemark.trim(),
        rejected_at: new Date().toISOString(),
        rejected_by: user?.emp_code || user?.id
      })
      
      setShowRejectModal(false)
      setSelectedReceipt(null)
      setRejectRemark('')
      setSuccessMessage('Transaction rejected successfully')
      toast.success('Transaction rejected successfully')
      loadReceipts()
    } catch (err) {
      toast.error(err.message || 'Failed to reject transaction')
    }
  }

  const handleEdit = (receipt) => {
    setSelectedReceipt(receipt)
    // Pre-populate edit data with current receipt values (receipt is already normalized)
    const normalizeMfTxnTypeForEdit = (raw) => {
      const v = String(raw || '').trim()
      if (!v) return ''
      const lower = v.toLowerCase()
      // Switch Over variants -> backend expects "Switch Over"
      if (lower === 'switchover' || lower === 'switch_over' || lower === 'switch-over' || v === 'Switch Over' || lower === 'switch over') return 'Switch Over'
      // Lumpsum variants -> backend expects "Lumpsum"
      if (v === 'Lumpsum' || v === 'LumpSum' || v === 'Lump Sum') return 'Lumpsum'
      return v // SIP / STP / SWP
    }
    setEditData({
      // Core fields
      date: receipt.date || '',
      investment_amount: receipt.investment_amount || receipt.fd_deposit_amount || '',
      scheme_name: receipt.scheme_name || receipt.fd_scheme_name || '',
      folio_policy_no: receipt.folio_policy_no || '',
      txn_type: receipt.product_category === 'MF'
        ? (normalizeMfTxnTypeForEdit(receipt.txn_type) || normalizeMfTxnTypeForEdit(mapModeDisplayToTxnType(receipt.mode)) || '')
        : (receipt.txn_type || ''),
      switch_from_scheme_name: receipt.switch_from_scheme_name || '',
      switch_to_scheme_name: receipt.switch_to_scheme_name || '',
      // Transaction / payment details
      entry_mode: receipt.entry_mode || '',
      transaction_channel: receipt.channel || receipt.transaction_channel || '',
      transaction_reference_no: receipt.reference_no || receipt.transaction_reference_no || '',
      txn_date: receipt.txn_date || receipt.date || '',
      instrument_type: receipt.instrument_type || '',
      instrument_no: receipt.instrument_no || '',
      instrument_date: receipt.instrument_date || '',
      bank_name: receipt.bank_name || '',
      bank_branch: receipt.bank_branch || '',
      transaction_notes: receipt.notes || '',
      account_last4: receipt.account_last4 || ''
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedReceipt || !token || !editData) return
    
    try {
      await api.updateReceipt(token, selectedReceipt._key || selectedReceipt.id, editData)
      setShowEditModal(false)
      setSelectedReceipt(null)
      setEditData(null)
      setSuccessMessage('Receipt updated successfully')
      toast.success('Receipt updated successfully')
      loadReceipts()
    } catch (err) {
      toast.error(err.message || 'Failed to update receipt')
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
      toast.error('Failed to view document: ' + err.message)
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
      toast.error('Failed to download document: ' + err.message)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  const formatDateDisplay = (value) => {
    if (!value) return ''
    const raw = String(value).trim()
    let date
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [y, m, d] = raw.split('-').map(Number)
      date = new Date(y, m - 1, d)
    } else {
      date = new Date(raw)
    }
    if (Number.isNaN(date.getTime())) return ''
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const formatDate = (dateString) => {
    return formatDateDisplay(dateString)
  }

  // Helper function to check if this is a switch over transaction
  // Note: receipts are already normalized, so we only need to check snake_case fields
  const isSwitchOver = (receipt) => {
    // Check transaction type
    const txnType = receipt.txn_type || ''
    const isSwitchOverType = txnType === 'Switch Over' || txnType === 'SwitchOver' || txnType === 'SWITCH_OVER' || txnType === 'switch_over'
    
    // Also check if switch_to_scheme_name exists (alternative detection method)
    const hasSwitchToScheme = receipt.switch_to_scheme_name
    
    return isSwitchOverType || !!hasSwitchToScheme
  }

  // Helper function to get the correct scheme name for display
  // For switch over transactions, show "FROM → TO" scheme details
  // Note: receipts are already normalized, so we only need to check snake_case fields
  const getDisplaySchemeName = (receipt) => {
    // For switch over transactions, prefer "from → to" if both are available
    if (isSwitchOver(receipt)) {
      const fromName = receipt.switch_from_scheme_name || receipt.scheme_name || receipt.fd_scheme_name
      const toName = receipt.switch_to_scheme_name || receipt.scheme_name || receipt.fd_scheme_name
      
      if (fromName && toName && fromName !== toName) {
        return `${fromName} → ${toName}`
      }
      
      // Fallback: at least show the "to" scheme
      return toName || fromName || 'N/A'
    }
    // For regular transactions, show the normal scheme name
    return receipt.fd_scheme_name || receipt.scheme_name || 'N/A'
  }

  // Helper function to get mode from receipt
  // Note: receipts are already normalized, so we only need to check snake_case fields
  const getMode = (receipt) => {
    const normalizeTxnTypeToDisplayMode = (raw) => {
      const v = String(raw || '').trim()
      if (!v) return ''
      if (v === 'SwitchOver' || v === 'SWITCH_OVER' || v === 'switch_over') return 'Switch Over'
      if (v === 'Switch Over') return 'Switch Over'
      if (v === 'Lumpsum' || v === 'LumpSum' || v === 'Lump Sum') return 'Lump Sum'
      return v // SIP / SWP / STP
    }

    // MF: prefer txn_type for mode display; fallback to legacy receipt.mode + inference
    if (receipt.product_category === 'MF') {
      const txnTypeRaw = receipt.txn_type || receipt.transaction_type || ''
      const txnMode = normalizeTxnTypeToDisplayMode(txnTypeRaw)
      if (txnMode) return txnMode

      // Legacy fallback: use receipt.mode when txn_type isn't present (older receipts)
      if (receipt.mode) return String(receipt.mode)

      // Infer from MF frequencies
      if (isSwitchOver(receipt)) return 'Switch Over'
      if (receipt.sip_frequency) return 'SIP'
      if (receipt.swp_frequency) return 'SWP'
      if (receipt.stp_frequency) return 'STP'
      return 'Lump Sum'
    }

    return receipt.mode || ''
  }

  // Helper function to get mode display with description
  const getModeDisplay = (receipt) => {
    const mode = getMode(receipt)
    if (!mode) return ''

    // For switch over, include mode in description
    if (isSwitchOver(receipt)) {
      return ` • ${mode}`
    }

    // For other transactions, just return mode
    return mode
  }

  // Helper: format payment/transaction details for display (receipts are normalized with entry_mode, bank_name, etc.)
  const hasPaymentDetails = (receipt) => receipt.entry_mode || receipt.channel || receipt.reference_no || receipt.bank_name || receipt.bank_branch || receipt.instrument_no || receipt.instrument_type || receipt.notes
  const formatPaymentDate = (d) => formatDateDisplay(d)

  // Backend expects txn_type values like "Lumpsum" for Lump Sum and "Switch Over" for Switch Over.
  const mapModeDisplayToTxnType = (modeDisplay) => {
    const v = String(modeDisplay || '').trim()
    if (!v) return ''
    if (v === 'Lump Sum') return 'Lumpsum'
    if (v === 'Switch Over') return 'Switch Over'
    return v // SIP / SWP / STP
  }

  const getStatusBadge = (receipt) => {
    if (receipt.deleted_at) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-caption font-semibold bg-[var(--error-muted)] text-[var(--error)] border border-[var(--error)]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--error)]" />
          Deleted
        </span>
      )
    }
    
    const status = receipt.status || receipt.transaction_status || 'Pending'
    
    if (status === 'Completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-caption font-semibold bg-[var(--success-muted)] text-[var(--success)] border border-[var(--success)]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
          Completed
        </span>
      )
    } else if (status === 'Failed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-caption font-semibold bg-[var(--error-muted)] text-[var(--error)] border border-[var(--error)]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--error)]" />
          Failed
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-caption font-semibold bg-[var(--warn-muted)] text-[var(--warn)] border border-[var(--warn)]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--warn)]" />
          Pending
        </span>
      )
    }
  }

  const handleDownloadHistory = async (format = 'csv') => {
    if (!token) return
    try {
      const txnType = filters.category === 'MF' ? mapModeDisplayToTxnType(filters.mode) : ''
      const query = {
        from: filters.from,
        to: filters.to,
        branch_code: isAdmin ? (filters.branch_code || user?.branch_code || undefined) : (user?.branch_code || undefined),
        emp_code: isAdmin ? (filters.emp_code || undefined) : undefined,
        status: filters.status || undefined,
        category: filters.category || undefined,
        txn_type: txnType || undefined,
        search: filters.search || undefined
      }
      Object.keys(query).forEach(key => query[key] === undefined && delete query[key])

      if (format === 'csv' || format === 'excel') {
        const qs = new URLSearchParams({
          ...query,
          format: format === 'excel' ? 'xlsx' : 'csv'
        }).toString()

        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/export/transactions?${qs}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        if (!res.ok) throw new Error('Failed to download transaction history')
        const stamp = new Date().toISOString().split('T')[0]
        if (format === 'excel') {
          const buf = await res.arrayBuffer()
          const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `transactions_${stamp}.xlsx`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          setTimeout(() => window.URL.revokeObjectURL(url), 1000)
        } else {
          const csvText = await res.text()
          const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `transactions_${stamp}.csv`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          setTimeout(() => window.URL.revokeObjectURL(url), 1000)
        }
      } else if (format === 'pdf') {
        // PDF summary report - create from current data
        const pdfContent = generatePDFReport(receipts, summary, filters)
        const blob = new Blob([pdfContent], { type: 'application/pdf' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `transaction_summary_${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => window.URL.revokeObjectURL(url), 1000)
      }
    } catch (err) {
      toast.error(err.message || 'Failed to export transaction history')
    }
  }

  const generatePDFReport = (receipts, summary, filters) => {
    // Simple PDF generation using browser print API
    // For a proper PDF, we'd use a library like jsPDF, but for now we'll create a printable HTML report
    const reportWindow = window.open('', '_blank')
    const reportHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Transaction Summary Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #DC2626; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #FEF2F2; color: #DC2626; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
            .summary-card { background: #FEF2F2; padding: 15px; border-radius: 8px; }
            .summary-card h3 { margin: 0 0 10px 0; color: #DC2626; }
            .summary-card p { margin: 5px 0; font-size: 18px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Transaction Summary Report</h1>
          <p><strong>Date Range:</strong> ${filters.from} to ${filters.to}</p>
          ${summary ? `
            <div class="summary">
              <div class="summary-card">
                <h3>Total Receipts</h3>
                <p>${summary.total_receipts || 0}</p>
              </div>
              <div class="summary-card">
                <h3>Total Investment</h3>
                <p>${formatCurrency(summary.total_investment || 0)}</p>
              </div>
              <div class="summary-card">
                <h3>Average Transaction</h3>
                <p>${formatCurrency(summary.avg_investment || 0)}</p>
              </div>
            </div>
          ` : ''}
          <table>
            <thead>
              <tr>
                <th>Receipt No</th>
                <th>Date</th>
                <th>Investor</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${receipts.slice(0, 100).map(r => `
                <tr>
                  <td>${r.receipt_no || r.receiptNo || 'N/A'}</td>
                  <td>${formatDate(r.date)}</td>
                  <td>${r.investor_name || r.investorName || 'N/A'}</td>
                  <td>${getCategoryDisplayName(r.product_category)}</td>
                  <td>${formatCurrency(r.investment_amount || r.fd_deposit_amount || 0)}</td>
                  <td>${r.status || r.transaction_status || 'Pending'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            Generated on ${new Date().toLocaleString('en-IN')}
          </p>
        </body>
      </html>
    `
    reportWindow.document.write(reportHTML)
    reportWindow.document.close()
    setTimeout(() => {
      reportWindow.print()
    }, 250)
    return '' // Return empty string as we're using print dialog
  }

  const getRowBackgroundColor = (receipt) => {
    const status = receipt.status || receipt.transaction_status || 'Pending'

    // Always show a colored left bar based on semantic status
    if (status === 'Completed') {
      // success: green
      return 'border-l-4 border-[var(--success)] bg-[var(--success-muted)]'
    }

    if (status === 'Failed') {
      // danger: red
      return 'border-l-4 border-[var(--error)] bg-[var(--error-muted)]'
    }

    // Treat everything else (including explicit Pending) as warning/open
    return 'border-l-4 border-[var(--warn)] bg-[var(--warn-muted)]'
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center flex-1 min-w-0">
          <FiClock className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--accent)] mr-2 sm:mr-3 flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-page-title text-[var(--text-primary)] truncate">Transaction History</h1>
            <p className="text-helper mt-0.5 hidden sm:block">View and manage all receipts</p>
          </div>
        </div>
        <Button variant="secondary" icon={loading ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiRefreshCw className="w-4 h-4" />} onClick={loadReceipts} disabled={loading}>
          Refresh
        </Button>
        <div className="relative group">
          <Button
            variant="secondary"
            icon={<FiDownload className="w-4 h-4" />}
            onClick={() => handleDownloadHistory('csv')}
            disabled={loading}
            className="sm:inline-flex"
          >
            <span className="hidden sm:inline">Export</span>
          </Button>
          <div className="absolute right-0 mt-2 w-48 rounded-card border border-[var(--stroke)] bg-[var(--card-bg)] shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 overflow-hidden">
            <button
              type="button"
              onClick={() => handleDownloadHistory('csv')}
              className="w-full text-left px-4 py-2.5 text-body text-[var(--text-primary)] hover:bg-[var(--card-hover)]"
            >
              Download CSV
            </button>
            <button
              type="button"
              onClick={() => handleDownloadHistory('excel')}
              className="w-full text-left px-4 py-2.5 text-body text-[var(--text-primary)] hover:bg-[var(--card-hover)]"
            >
              Download Excel
            </button>
            <button
              type="button"
              onClick={() => handleDownloadHistory('pdf')}
              className="w-full text-left px-4 py-2.5 text-body text-[var(--text-primary)] hover:bg-[var(--card-hover)]"
            >
              Download PDF Report
            </button>
          </div>
        </div>
      </div>

      {/* My receipt drafts - resume incomplete receipts */}
      {drafts.length > 0 && (
        <div className="mb-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 p-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <FiSave className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            My drafts
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            Incomplete receipts you can resume from Create Receipt.
          </p>
          <ul className="space-y-2">
            {drafts.map((draft) => {
              const id = draft._key || draft.id
              const created = draft.created_at ? new Date(draft.created_at).toLocaleString() : '—'
              const source = draft.source === 'failed_receipt' ? 'Saved after error' : draft.source === 'manual_save' ? 'Saved manually' : 'Draft'
              return (
                <li key={id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2">
                  <div className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{created}</span>
                    <span className="mx-2 text-gray-400">·</span>
                    <span className="text-gray-700 dark:text-gray-300">{source}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/receipts?draftId=${id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/60"
                    >
                      <FiSave className="w-3.5 h-3.5" />
                      Resume
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm('Delete this draft?')) return
                        try {
                          await api.deleteReceiptDraft(token, id)
                          loadDrafts()
                        } catch (err) {
                          alert(err.message || 'Failed to delete draft')
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Summary Statistics Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <Card padding="md" hover>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-label text-[var(--text-muted)] mb-1">Total Receipts</div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                  {summary.total_receipts || 0}
                </div>
              </div>
              <div className="w-12 h-12 bg-[var(--accent-muted)] rounded-card flex items-center justify-center">
                <FiFileText className="w-6 h-6 text-[var(--accent)]" />
              </div>
            </div>
          </Card>

          <Card padding="md" hover>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-label text-[var(--text-muted)] mb-1">Total Investment</div>
                <div className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                  {formatCurrency(summary.total_investment || 0)}
                </div>
              </div>
              <div className="w-12 h-12 bg-[var(--success-muted)] rounded-card flex items-center justify-center">
                <FiDollarSign className="w-6 h-6 text-[var(--success)]" />
              </div>
            </div>
          </Card>

          <Card padding="md" hover>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-label text-[var(--text-muted)] mb-1">Avg Transaction</div>
                <div className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                  {formatCurrency(summary.avg_investment || 0)}
                </div>
              </div>
              <div className="w-12 h-12 bg-[var(--accent-muted)] rounded-card flex items-center justify-center">
                <FiBarChart className="w-6 h-6 text-[var(--accent)]" />
              </div>
            </div>
          </Card>

          <Card padding="md" hover>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-label text-[var(--text-muted)] mb-1">Pending</div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--warn)]">
                  {summary.status_counts?.Pending || 0}
                </div>
              </div>
              <div className="w-12 h-12 bg-[var(--warn-muted)] rounded-card flex items-center justify-center">
                <FiClock className="w-6 h-6 text-[var(--warn)]" />
              </div>
            </div>
          </Card>

          <Card padding="md" hover>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-label text-[var(--text-muted)] mb-1">Completed</div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--success)]">
                  {summary.status_counts?.Completed || 0}
                </div>
              </div>
              <div className="w-12 h-12 bg-[var(--success-muted)] rounded-card flex items-center justify-center">
                <FiCheck className="w-6 h-6 text-[var(--success)]" />
              </div>
            </div>
          </Card>

          <Card padding="md" hover>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-label text-[var(--text-muted)] mb-1">Failed</div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--error)]">
                  {summary.status_counts?.Failed || 0}
                </div>
              </div>
              <div className="w-12 h-12 bg-[var(--error-muted)] rounded-card flex items-center justify-center">
                <FiAlertCircle className="w-6 h-6 text-[var(--error)]" />
              </div>
            </div>
          </Card>
        </div>
      )}
      
      {/* Filters */}
      <Card padding="md" hover={false}>
        <div className="flex items-center mb-3 sm:mb-4">
          <FiFilter className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent)] mr-2" />
          <h3 className="text-section-title text-[var(--text-primary)]">Filters & Search</h3>
        </div>

        {/* Active filter chips */}
        {(filters.category || filters.status || filters.branch_code || filters.emp_code || filters.search) && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-label text-[var(--text-muted)]">Active:</span>
            {filters.search && (
              <Chip
                label={`Search: ${filters.search.slice(0, 20)}${filters.search.length > 20 ? '…' : ''}`}
                onClose={() => setFilters(prev => ({ ...prev, search: '' }))}
                selected
              />
            )}
            {filters.category && (
              <Chip
                label={`Category: ${getCategoryDisplayName(filters.category)}`}
                onClose={() => setFilters(prev => ({ ...prev, category: '', mode: '' }))}
                selected
              />
            )}
            {filters.status && (
              <Chip
                label={`Status: ${filters.status}`}
                onClose={() => setFilters(prev => ({ ...prev, status: '' }))}
                selected
              />
            )}
            {filters.branch_code && (
              <Chip
                label={`Branch: ${branches.find(b => (b.branch_code || b.id) === filters.branch_code)?.branch_name || filters.branch_code}`}
                onClose={() => setFilters(prev => ({ ...prev, branch_code: '' }))}
                selected
              />
            )}
            {filters.emp_code && (
              <Chip
                label={`Employee: ${filters.emp_code}`}
                onClose={() => setFilters(prev => ({ ...prev, emp_code: '' }))}
                selected
              />
            )}
          </div>
        )}
        
        {/* Search Bar */}
        <div className="mb-4">
          <label className="block text-label text-[var(--text-secondary)] mb-2">Search</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-4 w-4 text-[var(--text-muted)]" />
            </div>
            <input
              type="text"
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search by name, investor ID, PAN, or receipt #..."
              className="w-full pl-10 pr-4 py-3 rounded-input border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] placeholder:text-[var(--placeholder)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--canvas)]"
            />
          </div>
        </div>

        {/* Quick Date - SegmentedControl */}
        <div className="mb-4">
          <label className="block text-label text-[var(--text-secondary)] mb-2">Quick select</label>
          <SegmentedControl
            options={[
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'This Week' },
              { value: 'month', label: 'This Month' },
              { value: 'quarter', label: 'This Quarter' },
              { value: 'year', label: 'This Year' }
            ]}
            value={(() => {
              const today = new Date()
              const fromDate = parseDateInput(filters.from)
              const toDate = parseDateInput(filters.to)
              const todayStr = formatDateForInput(today)
              if (filters.from === todayStr && filters.to === todayStr) return 'today'
              const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7)
              if (fromDate?.toDateString() === weekAgo.toDateString() && toDate?.toDateString() === today.toDateString()) return 'week'
              const monthAgo = new Date(today); monthAgo.setMonth(today.getMonth() - 1)
              if (fromDate?.toDateString() === monthAgo.toDateString() && toDate?.toDateString() === today.toDateString()) return 'month'
              const quarterAgo = new Date(today); quarterAgo.setMonth(today.getMonth() - 3)
              if (fromDate?.toDateString() === quarterAgo.toDateString() && toDate?.toDateString() === today.toDateString()) return 'quarter'
              const yearStart = `${today.getFullYear()}-01-01`
              if (filters.from === yearStart && filters.to === todayStr) return 'year'
              return 'today'
            })()}
            onChange={(value) => {
              const today = new Date()
              const toStr = formatDateForInput(today)
              let from = toStr
              if (value === 'week') { const d = new Date(today); d.setDate(today.getDate() - 7); from = formatDateForInput(d) }
              else if (value === 'month') { const d = new Date(today); d.setMonth(today.getMonth() - 1); from = formatDateForInput(d) }
              else if (value === 'quarter') { const d = new Date(today); d.setMonth(today.getMonth() - 3); from = formatDateForInput(d) }
              else if (value === 'year') from = `${today.getFullYear()}-01-01`
              setFilters(prev => ({ ...prev, from, to: toStr }))
            }}
          />
        </div>

        {/* Status - SegmentedControl */}
        <div className="mb-4">
          <label className="block text-label text-[var(--text-secondary)] mb-2">Status</label>
          <SegmentedControl
            options={[
              { value: '', label: 'All' },
              { value: 'Pending', label: 'Pending' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Failed', label: 'Failed' }
            ]}
            value={filters.status || ''}
            onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-label text-[var(--text-secondary)] mb-2">From Date</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiCalendar className="h-4 w-4 text-[var(--text-muted)]" />
              </div>
              <DatePickerInput
                value={filters.from}
                onChange={(v) => setFilters(prev => ({ ...prev, from: v }))}
                inputClassName="w-full pl-10 pr-4 py-3 rounded-input border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--canvas)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-label text-[var(--text-secondary)] mb-2">To Date</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiCalendar className="h-4 w-4 text-[var(--text-muted)]" />
              </div>
              <DatePickerInput
                value={filters.to}
                onChange={(v) => setFilters(prev => ({ ...prev, to: v }))}
                inputClassName="w-full pl-10 pr-4 py-3 rounded-input border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--canvas)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-label text-[var(--text-secondary)] mb-2">Category</label>
            <select
              value={filters.category}
              onChange={e => setFilters(prev => ({ ...prev, category: e.target.value, mode: e.target.value !== 'MF' ? '' : prev.mode }))}
              className="w-full p-3 rounded-input border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--canvas)]"
            >
              <option value="">All Categories</option>
              <option value="MF">Mutual Fund</option>
              <option value="FD">Fixed Deposit</option>
              <option value="INS">Insurance</option>
              <option value="BOND">Bonds</option>
            </select>
          </div>
        </div>

        {/* Mode Filter - Only show when MF category is selected */}
        {filters.category === 'MF' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">Mode</label>
            <select
              value={filters.mode}
              onChange={e => setFilters(prev => ({ ...prev, mode: e.target.value }))}
              className="w-full sm:w-auto sm:min-w-[200px] p-3 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200"
            >
              <option value="">All Modes</option>
              <option value="Lump Sum">Lump Sum</option>
              <option value="SIP">SIP</option>
              <option value="SWP">SWP</option>
              <option value="STP">STP</option>
              <option value="Switch Over">Switch Over</option>
            </select>
          </div>
        )}

        {/* Admin Filters Row */}
        {isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Branch</label>
              <select
                value={filters.branch_code}
                onChange={e => setFilters(prev => ({ ...prev, branch_code: e.target.value }))}
                disabled={loadingBranches}
                className="w-full p-3 border border-gray-300 dark:border-[var(--stroke)] bg-white dark:bg-[var(--card-bg-opaque)] text-gray-900 dark:text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] transition-colors duration-200 disabled:opacity-50"
              >
                <option value="">All Branches</option>
                {branches.map(branch => (
                  <option key={branch.branch_code || branch.id} value={branch.branch_code || branch.id}>
                    {branch.branch_name || branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Employee Code</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
                <input
                  type="text"
                  value={filters.emp_code}
                  onChange={e => setFilters(prev => ({ ...prev, emp_code: e.target.value }))}
                  placeholder="Filter by employee code"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-[var(--stroke)] bg-white dark:bg-[var(--card-bg-opaque)] text-gray-900 dark:text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] transition-colors duration-200"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Sort By</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <div className="flex flex-col">
                    <FiArrowUp className="h-2 w-2 text-[var(--text-muted)]" />
                    <FiArrowDown className="h-2 w-2 text-[var(--text-muted)] -mt-0.5" />
                  </div>
                </div>
                <select
                  value={filters.sort}
                  onChange={e => setFilters(prev => ({ ...prev, sort: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-[var(--stroke)] bg-white dark:bg-[var(--card-bg-opaque)] text-gray-900 dark:text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] transition-colors duration-200 appearance-none"
                >
                  <option value="created_at:desc">Newest First</option>
                  <option value="created_at:asc">Oldest First</option>
                  <option value="date:desc">Date (Newest)</option>
                  <option value="date:asc">Date (Oldest)</option>
                  <option value="receipt_no:asc">Receipt # (A-Z)</option>
                  <option value="receipt_no:desc">Receipt # (Z-A)</option>
                  <option value="amount:desc">Amount (High to Low)</option>
                  <option value="amount:asc">Amount (Low to High)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Employee Sort Option */}
        {!isAdmin && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Sort By</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <div className="flex flex-col">
                  <FiArrowUp className="h-2 w-2 text-[var(--text-muted)]" />
                  <FiArrowDown className="h-2 w-2 text-[var(--text-muted)] -mt-0.5" />
                </div>
              </div>
              <select
                value={filters.sort}
                onChange={e => setFilters(prev => ({ ...prev, sort: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-[var(--stroke)] bg-white dark:bg-[var(--card-bg-opaque)] text-gray-900 dark:text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] transition-colors duration-200 appearance-none"
              >
                <option value="created_at:desc">Newest First</option>
                <option value="created_at:asc">Oldest First</option>
                <option value="date:desc">Date (Newest)</option>
                <option value="date:asc">Date (Oldest)</option>
                <option value="receipt_no:asc">Receipt # (A-Z)</option>
                <option value="receipt_no:desc">Receipt # (Z-A)</option>
                <option value="amount:desc">Amount (High to Low)</option>
                <option value="amount:asc">Amount (Low to High)</option>
              </select>
            </div>
          </div>
        )}
      </Card>

      {/* Results */}
      {loading && (
        <Card padding="lg">
          <Skeleton variant="line" lines={8} />
          <div className="mt-4 h-64"><Skeleton variant="block" /></div>
        </Card>
      )}

      {error && (
        <div className="rounded-card border border-[var(--error)]/30 bg-[var(--error-muted)] px-4 py-3 flex items-center text-[var(--error)]">
          <FiAlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && (
        <Card padding="none" hover={false} className="overflow-hidden">
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
                      {(hasPaymentDetails(receipt)) && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Payment</span>
                          <p className="font-medium text-gray-900 dark:text-white" title={[receipt.bank_name, receipt.bank_branch, receipt.instrument_no || receipt.reference_no, receipt.notes].filter(Boolean).join(' • ') || undefined}>
                            <span>{receipt.entry_mode || (receipt.bank_name ? 'Offline' : (receipt.notes || receipt.channel ? 'Others' : 'Online')) || '—'}</span>
                            {(receipt.reference_no || receipt.channel) && (
                              <span className="text-gray-600 dark:text-gray-400"> • {(receipt.reference_no || receipt.channel).toString().slice(0, 14)}{((receipt.reference_no || receipt.channel) || '').length > 14 ? '…' : ''}</span>
                            )}
                          </p>
                          {(receipt.bank_name || receipt.instrument_no || receipt.instrument_date || receipt.txn_date) && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                              {[receipt.bank_name, receipt.instrument_no || (receipt.entry_mode === 'Offline' ? receipt.reference_no : null), formatPaymentDate(receipt.instrument_date || receipt.txn_date)].filter(Boolean).join(' • ')}
                            </p>
                          )}
                        </div>
                      )}
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
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{getDisplaySchemeName(receipt)}</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        <p className="text-xs text-gray-600 dark:text-gray-400">{getCategoryDisplayName(receipt.product_category)}</p>
                        {getMode(receipt) && receipt.product_category === 'MF' && (
                          <>
                            <span className="text-gray-400 dark:text-dark-500">•</span>
                            <span className="text-xs text-gray-600 dark:text-gray-400">{getMode(receipt)}</span>
                          </>
                        )}
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

                    {/* Bonus indicator */}
                    {(Number(receipt.additional_cc || 0) !== 0 || Number(receipt.additional_si || 0) !== 0) && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 text-[10px] font-semibold rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
                          <FiAward className="w-3 h-3 mr-1" />
                          Bonus CC/SI applied
                        </span>
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
                      {/* Edit button for pending receipts in mobile view */}
                      {!receipt.deleted_at && (receipt.status || receipt.transaction_status || 'Pending') === 'Pending' && (
                        <button
                          onClick={() => handleEdit(receipt)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-blue-300 dark:border-blue-600 text-xs font-medium rounded-lg text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60"
                        >
                          <FiEdit className="w-3.5 h-3.5 mr-1.5" />
                          Edit
                        </button>
                      )}
                      {/* Admin reject button for pending receipts in mobile view */}
                      {isAdmin && !receipt.deleted_at && (receipt.status || receipt.transaction_status || 'Pending') === 'Pending' && (
                        <button
                          onClick={() => handleReject(receipt)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-red-300 dark:border-red-600 text-xs font-medium rounded-lg text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/40 hover:bg-red-100 dark:hover:bg-red-900/60"
                        >
                          <FiXCircle className="w-3.5 h-3.5 mr-1.5" />
                          Reject
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
              <thead className="bg-[var(--card-hover)] sticky top-0 z-10 border-b-2 border-[var(--stroke)]">
                <tr>
                  <th className="px-2 py-3 text-center text-table-header w-[35px]"></th>
                  <th className="px-3 py-3 text-left text-table-header">Receipt #</th>
                  <th className="px-3 py-3 text-left text-table-header">Investor / Product</th>
                  {isAdmin ? (
                    <>
                      <th className="px-3 py-3 text-left text-table-header">Employee</th>
                      <th className="px-3 py-3 text-left text-table-header">Branch</th>
                      <th className="px-3 py-3 text-left text-table-header">Date</th>
                      <th className="px-3 py-3 text-right text-table-header">Amount</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-3 text-left text-table-header">Branch</th>
                      <th className="px-3 py-3 text-left text-table-header">Date</th>
                      <th className="px-3 py-3 text-right text-table-header">Amount</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-[var(--canvas)] divide-y divide-[var(--stroke)]">
                {receipts.map((receipt) => {
                  const receiptId = receipt._key || receipt.id
                  const isExpanded = expandedRows.has(receiptId)
                  const hasBonus = Number(receipt.additional_cc || 0) !== 0 || Number(receipt.additional_si || 0) !== 0
                  
                  return (
                    <React.Fragment key={receiptId}>
                      <tr 
                        className={`hover:opacity-80 cursor-pointer transition-all group ${getRowBackgroundColor(receipt)}`}
                        onClick={() => toggleRow(receiptId)}
                      >
                        <td className="px-2 py-3 text-center align-middle">
                          <div className="flex items-center justify-center w-full">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleRow(receiptId) }}
                              className="flex h-9 w-9 items-center justify-center rounded-pill border border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--text-muted)] hover:bg-[var(--card-hover)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-colors"
                              aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                            >
                              {isExpanded ? (
                                <FiChevronUp className="w-5 h-5" />
                              ) : (
                                <FiChevronDown className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-sm text-gray-900 dark:text-white tracking-tight">
                              {receipt.receipt_no || receipt.receiptNo}
                            </div>
                            {hasBonus && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
                                <FiAward className="w-3 h-3 mr-0.5" />
                                Bonus
                              </span>
                            )}
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
                              <div className="text-xs font-medium text-gray-700 dark:text-dark-300 truncate" title={getDisplaySchemeName(receipt)}>
                                {getDisplaySchemeName(receipt)}
                              </div>
                              <span className="text-gray-400 dark:text-dark-500">•</span>
                              <span className="text-xs text-gray-600 dark:text-dark-400">
                                {getCategoryDisplayName(receipt.product_category)}
                              </span>
                              {getMode(receipt) && receipt.product_category === 'MF' && (
                                <>
                                  <span className="text-gray-400 dark:text-dark-500">•</span>
                                  <span className="text-xs text-gray-600 dark:text-dark-400">{getMode(receipt)}</span>
                                </>
                              )}
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
                          <>
                            <td className="px-3 py-3">
                              <div>
                                <div className="font-medium text-sm text-gray-900 dark:text-white truncate" title={receipt.employee_name || receipt.employeeName}>
                                  {receipt.employee_name || receipt.employeeName}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-dark-400 truncate">{receipt.emp_code || receipt.empCode}</div>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div>
                                <div className="font-medium text-sm text-gray-900 dark:text-white truncate">{receipt.branch || '—'}</div>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatDate(receipt.date)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-dark-400">
                                {getCategoryDisplayName(receipt.product_category)}
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-3">
                              <div>
                                <div className="font-medium text-sm text-gray-900 dark:text-white truncate">{receipt.branch || '—'}</div>
                              </div>
                            </td>
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
                          </>
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
                        <tr className="bg-[var(--card-hover)]/50 border-l-4 border-[var(--accent)]">
                          <td colSpan={isAdmin ? 7 : 6} className="px-4 py-4">
                            <div className="w-full flex flex-col gap-3 mb-4">
                              <div className="text-label text-[var(--text-muted)] uppercase tracking-wider">Receipt details</div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Receipt date</span>
                                  <p className="font-medium text-gray-900 dark:text-white">{formatDate(receipt.date)}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">PAN</span>
                                  <p className="font-medium text-gray-900 dark:text-white">{receipt.pan || '—'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Branch</span>
                                  <p className="font-medium text-gray-900 dark:text-white">{receipt.branch || '—'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Mode</span>
                                  <p className="font-medium text-gray-900 dark:text-white">{getMode(receipt) || receipt.mode || '—'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Transaction type</span>
                                  <p className="font-medium text-gray-900 dark:text-white">{receipt.txn_type || receipt.transaction_type || '—'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Folio / Policy</span>
                                  <p className="font-medium text-gray-900 dark:text-white">{receipt.folio_policy_no || receipt.insurance_policy_number || '—'}</p>
                                </div>
                                {(receipt.switch_from_scheme_name || receipt.switch_to_scheme_name) && (
                                  <>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Switch from</span>
                                      <p className="font-medium text-gray-900 dark:text-white">{receipt.switch_from_scheme_name || '—'}</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Switch to</span>
                                      <p className="font-medium text-gray-900 dark:text-white">{receipt.switch_to_scheme_name || '—'}</p>
                                    </div>
                                  </>
                                )}
                                {(String(receipt.txn_type || receipt.transaction_type || '').trim().toUpperCase() === 'STP' || receipt.stp_target_scheme_name) && (
                                  <>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">STP from</span>
                                      <p className="font-medium text-gray-900 dark:text-white">{receipt.scheme_name || receipt.schemeName || '—'}</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">STP to</span>
                                      <p className="font-medium text-gray-900 dark:text-white">{receipt.stp_target_scheme_name || '—'}</p>
                                    </div>
                                  </>
                                )}
                                {receipt.product_category === 'INS' && (
                                  <>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Date of issue</span>
                                      <p className="font-medium text-gray-900 dark:text-white">{receipt.insurance_date_of_issue ? formatDate(receipt.insurance_date_of_issue) : '—'}</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Renewal date</span>
                                      <p className="font-medium text-gray-900 dark:text-white">{(receipt.insurance_renewal_date || receipt.renewal_due_date) ? formatDate(receipt.insurance_renewal_date || receipt.renewal_due_date) : '—'}</p>
                                    </div>
                                  </>
                                )}
                                {receipt.product_category === 'FD' && receipt.fd_maturity_date && (
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">FD maturity</span>
                                    <p className="font-medium text-gray-900 dark:text-white">{formatDate(receipt.fd_maturity_date)}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-start justify-between gap-6">
                              {hasPaymentDetails(receipt) && (
                                <div className="flex flex-col gap-2 min-w-0">
                                  <div className="text-label text-[var(--text-muted)] uppercase tracking-wider">Payment / Transaction</div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Type</span>
                                      <p className="font-medium text-gray-900 dark:text-white">
                                        {receipt.entry_mode || (receipt.bank_name ? 'Offline' : (receipt.notes || receipt.channel ? 'Others' : 'Online')) || '—'}
                                      </p>
                                    </div>
                                    {(receipt.reference_no || receipt.channel || receipt.instrument_no) && (
                                      <div>
                                        <span className="text-gray-500 dark:text-gray-400">{receipt.entry_mode === 'Offline' || receipt.instrument_no ? 'Cheque / Instrument No' : 'Reference No'}</span>
                                        <p className="font-medium text-gray-900 dark:text-white">{receipt.instrument_no || receipt.reference_no || receipt.channel}</p>
                                      </div>
                                    )}
                                    {receipt.bank_name && (
                                      <div>
                                        <span className="text-gray-500 dark:text-gray-400">Bank</span>
                                        <p className="font-medium text-gray-900 dark:text-white">{receipt.bank_name}</p>
                                      </div>
                                    )}
                                    {receipt.bank_branch && (
                                      <div>
                                        <span className="text-gray-500 dark:text-gray-400">Branch</span>
                                        <p className="font-medium text-gray-900 dark:text-white">{receipt.bank_branch}</p>
                                      </div>
                                    )}
                                    {(receipt.instrument_date || receipt.txn_date) && (
                                      <div>
                                        <span className="text-gray-500 dark:text-gray-400">Date</span>
                                        <p className="font-medium text-gray-900 dark:text-white">{formatPaymentDate(receipt.instrument_date || receipt.txn_date)}</p>
                                      </div>
                                    )}
                                    {receipt.notes && (
                                      <div className="sm:col-span-2">
                                        <span className="text-gray-500 dark:text-gray-400">Notes</span>
                                        <p className="font-medium text-gray-900 dark:text-white">{receipt.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              {/* Status Section */}
                              <div className="flex flex-col gap-2">
                                <div className="text-label text-[var(--text-muted)] uppercase tracking-wider">Status</div>
                                <div>{getStatusBadge(receipt)}</div>
                                {receipt.rejection_remark && (
                                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Rejection Reason:</div>
                                    <div className="text-xs text-red-600 dark:text-red-300">{receipt.rejection_remark}</div>
                                    {receipt.rejected_by && (
                                      <div className="text-xs text-red-500 dark:text-red-400 mt-1">
                                        Rejected by: {receipt.rejected_by}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {/* Documents Section */}
                              <div className="flex flex-col gap-2 flex-1 min-w-0">
                                <div className="text-label text-[var(--text-muted)] uppercase tracking-wider">Documents</div>
                                {receipt.media_files && receipt.media_files.length > 0 ? (
                                  <div className="flex flex-wrap items-center gap-2">
                                    {receipt.media_files.map((file, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleViewDocument(receiptId, file.id, file.filename)
                                        }}
                                        className="inline-flex items-center gap-2 rounded-pill px-3 py-2 text-caption font-medium text-[var(--accent)] bg-[var(--accent-muted)] hover:bg-[var(--accent)]/20 border border-[var(--accent)]/30 transition-colors"
                                        title={`View / Download ${file.original_name || file.filename || 'document'}`}
                                      >
                                        <FiFile className="w-4 h-4 flex-shrink-0" />
                                        View
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1">
                                    <div className="text-helper text-[var(--text-muted)] italic">No documents attached</div>
                                    {!receipt.deleted_at && (receipt.status || receipt.transaction_status || 'Pending') === 'Pending' && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setLegacyReceipt(receipt)
                                          setLegacyFiles([])
                                          setLegacyUploadError('')
                                          setShowLegacyDocsModal(true)
                                        }}
                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] underline underline-offset-2"
                                      >
                                        Add supporting documents
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {/* Actions Section */}
                              <div className="flex flex-col gap-2">
                                <div className="text-label text-[var(--text-muted)] uppercase tracking-wider">Actions</div>
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
                                  {/* Edit button for pending receipts */}
                                  {!receipt.deleted_at && (receipt.status || receipt.transaction_status || 'Pending') === 'Pending' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleEdit(receipt)
                                      }}
                                      className="inline-flex items-center px-3 py-1.5 border border-blue-300 dark:border-blue-600 text-xs font-medium rounded-md text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all hover:shadow-sm"
                                    >
                                      <FiEdit className="w-3.5 h-3.5 mr-1.5" />
                                      Edit
                                    </button>
                                  )}
                                  {/* Admin actions for pending receipts */}
                                  {isAdmin && !receipt.deleted_at && (receipt.status || receipt.transaction_status || 'Pending') === 'Pending' && (
                                    <>
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
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleReject(receipt)
                                        }}
                                        className="inline-flex items-center px-3 py-1.5 border border-red-300 dark:border-red-600 text-xs font-medium rounded-md text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/40 hover:bg-red-100 dark:hover:bg-red-900/60 transition-all hover:shadow-sm"
                                      >
                                        <FiXCircle className="w-3.5 h-3.5 mr-1.5" />
                                        Reject
                                      </button>
                                    </>
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
            <EmptyState
              icon={<FiClock className="w-12 h-12 mx-auto text-[var(--text-muted)]" />}
              title="No receipts found"
              message="Try adjusting your filters or create a new receipt."
              primaryAction={<Button onClick={() => { setFilters(prev => ({ ...prev, category: '', branch_code: '', search: '', status: '' })); setSearchParams({}) }}>Reset filters</Button>}
              secondaryAction={<Button variant="secondary" onClick={() => navigate('/receipts')}>Create receipt</Button>}
            />
          )}
          
          {/* Pagination */}
          {pagination.hasMore && (
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-[var(--stroke)]">
              <Button
                className="w-full"
                variant="secondary"
                icon={loadingMore ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : null}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Reject Transaction
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Receipt: {selectedReceipt.receipt_no || selectedReceipt.receiptNo}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowRejectModal(false)
                    setSelectedReceipt(null)
                    setRejectRemark('')
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Rejection Reason <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <textarea
                    value={rejectRemark}
                    onChange={(e) => setRejectRemark(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent resize-none"
                    placeholder="Please provide a reason for rejecting this transaction..."
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This will mark the transaction as Failed and cannot be undone.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowRejectModal(false)
                    setSelectedReceipt(null)
                    setRejectRemark('')
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={!rejectRemark.trim()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <FiXCircle size={18} />
                  <span>Reject Transaction</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legacy Documents Modal (receipts missing media_files) */}
      {showLegacyDocsModal && legacyReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Add supporting documents
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Receipt: {legacyReceipt.receipt_no || legacyReceipt.receiptNo || legacyReceipt._key}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowLegacyDocsModal(false)
                    setLegacyReceipt(null)
                    setLegacyFiles([])
                    setLegacyUploadError('')
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Upload files <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleLegacyFilesChange}
                    className="w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0 file:text-sm file:font-semibold
                      file:bg-blue-50 dark:file:bg-blue-900/40 file:text-blue-700 dark:file:text-blue-300
                      hover:file:bg-blue-100 dark:hover:file:bg-blue-900/60"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Allowed: images and PDF. Max size: 10MB per file.
                  </p>
                </div>

                {legacyFiles.length > 0 && (
                  <div className="rounded-lg border border-[var(--stroke)] bg-[var(--card-bg)] p-4">
                    <div className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                      Selected files ({legacyFiles.length})
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {legacyFiles.map((f, idx) => (
                        <div key={`${f.name}-${idx}`} className="flex items-center justify-between gap-3">
                          <div className="text-sm text-[var(--text-secondary)] truncate">
                            {f.name}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setLegacyFiles(prev => prev.filter((_, i) => i !== idx))
                              setLegacyUploadError('')
                            }}
                            className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                            aria-label={`Remove ${f.name}`}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {legacyUploadError && (
                  <div className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 text-sm">
                    {legacyUploadError}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLegacyDocsModal(false)
                      setLegacyReceipt(null)
                      setLegacyFiles([])
                      setLegacyUploadError('')
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 font-medium transition-all"
                    disabled={legacyUploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleLegacyUpload}
                    disabled={legacyUploading || legacyFiles.length === 0}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {legacyUploading ? (
                      <>
                        <FiRefreshCw className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <FiUpload className="w-4 h-4" />
                        Upload
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedReceipt && editData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Edit Receipt
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Receipt: {selectedReceipt.receipt_no || selectedReceipt.receiptNo}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedReceipt(null)
                    setEditData(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Date
                    </label>
                    <DatePickerInput
                      value={editData.date || ''}
                      onChange={(v) => setEditData({ ...editData, date: v })}
                      inputClassName="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Investment Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editData.investment_amount}
                      onChange={(e) => setEditData({ ...editData, investment_amount: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Scheme Name
                    </label>
                    <input
                      type="text"
                      value={editData.scheme_name}
                      onChange={(e) => setEditData({ ...editData, scheme_name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Folio/Policy Number
                    </label>
                    <input
                      type="text"
                      value={editData.folio_policy_no}
                      onChange={(e) => setEditData({ ...editData, folio_policy_no: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    {selectedReceipt?.product_category === 'MF' && (
                      <>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Investment Type
                        </label>
                        <select
                          value={editData.txn_type}
                          onChange={(e) => setEditData({ ...editData, txn_type: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                        >
                          <option value="">Select Type</option>
                          <option value="Lumpsum">Lump Sum</option>
                          <option value="SIP">SIP</option>
                          <option value="STP">STP</option>
                          <option value="SWP">SWP</option>
                          <option value="Switch Over">Switch Over</option>
                        </select>
                      </>
                    )}
                  </div>
                  {(editData.txn_type === 'Switch Over' || editData.switch_from_scheme_name || editData.switch_to_scheme_name) && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Switch from (scheme)
                        </label>
                        <input
                          type="text"
                          value={editData.switch_from_scheme_name || ''}
                          onChange={(e) => setEditData({ ...editData, switch_from_scheme_name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Switch to (scheme)
                        </label>
                        <input
                          type="text"
                          value={editData.switch_to_scheme_name || ''}
                          onChange={(e) => setEditData({ ...editData, switch_to_scheme_name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                        />
                      </div>
                    </>
                  )}
                  {(editData.txn_type === 'STP' || editData.stp_target_scheme_name) && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          STP from (scheme)
                        </label>
                        <input
                          type="text"
                          value={editData.scheme_name || ''}
                          onChange={(e) => setEditData({ ...editData, scheme_name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          STP to (scheme)
                        </label>
                        <input
                          type="text"
                          value={editData.stp_target_scheme_name || ''}
                          onChange={(e) => setEditData({ ...editData, stp_target_scheme_name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Entry Mode
                    </label>
                    <select
                      value={editData.entry_mode}
                      onChange={(e) => setEditData({ ...editData, entry_mode: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    >
                      <option value="">Select Entry Mode</option>
                      <option value="Online">Online</option>
                      <option value="Offline">Offline</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Transaction / Reference Number
                    </label>
                    <input
                      type="text"
                      value={editData.transaction_reference_no}
                      onChange={(e) => setEditData({ ...editData, transaction_reference_no: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Channel
                    </label>
                    <input
                      type="text"
                      value={editData.transaction_channel}
                      onChange={(e) => setEditData({ ...editData, transaction_channel: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Transaction Date
                    </label>
                    <DatePickerInput
                      value={editData.txn_date || ''}
                      onChange={(v) => setEditData({ ...editData, txn_date: v })}
                      inputClassName="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={editData.bank_name}
                      onChange={(e) => setEditData({ ...editData, bank_name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Bank Branch
                    </label>
                    <input
                      type="text"
                      value={editData.bank_branch}
                      onChange={(e) => setEditData({ ...editData, bank_branch: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Instrument Type
                    </label>
                    <select
                      value={editData.instrument_type || ''}
                      onChange={(e) => setEditData({ ...editData, instrument_type: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    >
                      <option value="">Select Instrument Type</option>
                      <option value="Cheque">Cheque</option>
                      <option value="NEFT">NEFT</option>
                      <option value="RTGS">RTGS</option>
                      <option value="UPI">UPI</option>
                      <option value="IMPS">IMPS</option>
                      <option value="DD">DD</option>
                      <option value="Cash">Cash</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Instrument / Cheque Number
                    </label>
                    <input
                      type="text"
                      value={editData.instrument_no || ''}
                      onChange={(e) => setEditData({ ...editData, instrument_no: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Instrument Date
                    </label>
                    <DatePickerInput
                      value={editData.instrument_date || ''}
                      onChange={(v) => setEditData({ ...editData, instrument_date: v })}
                      inputClassName="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Transaction Notes
                    </label>
                    <textarea
                      rows={3}
                      value={editData.transaction_notes || ''}
                      onChange={(e) => setEditData({ ...editData, transaction_notes: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
                      placeholder="Any notes about this transaction"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Account Last 4 Digits
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={editData.account_last4 || ''}
                      onChange={(e) => setEditData({ ...editData, account_last4: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedReceipt(null)
                    setEditData(null)
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all flex items-center space-x-2"
                >
                  <FiEdit size={18} />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
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
                    Current CC: ₹{(Number((selectedReceipt.collection_credit ?? selectedReceipt.cc ?? selectedReceipt.calculations?.collection_credit ?? selectedReceipt.calculations?.cc ?? ((selectedReceipt.cc_amount || 0) + (selectedReceipt.additional_cc || 0))) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
