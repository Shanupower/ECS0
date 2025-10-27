import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiPrinter, FiDownload, FiFile, FiImage, FiEye } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

export default function ReceiptViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const [receipt, setReceipt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mediaFiles, setMediaFiles] = useState([])
  const [loadingMedia, setLoadingMedia] = useState(false)

  useEffect(() => {
    loadReceipt()
  }, [id, token])

  useEffect(() => {
    if (receipt && receipt.media_count > 0) {
      loadMediaFiles()
    }
  }, [receipt])

  const loadReceipt = async () => {
    if (!token) return

    setLoading(true)
    setError('')

    try {
      const result = await api.getReceipt(token, id)
      
      // Handle different response formats
      let receiptData = result
      if (result.data) {
        receiptData = result.data
      }
      
      setReceipt(receiptData)
    } catch (err) {
      console.error('Error loading receipt:', err)
      
      // Handle specific error cases
      if (err.message && (err.message.includes('403') || err.message.includes('Forbidden') || err.message.includes('forbidden'))) {
        setError('You do not have permission to view this receipt. You can only view receipts you created.')
      } else if (err.message && (err.message.includes('404') || err.message.includes('Not Found'))) {
        setError('Receipt not found. It may have been deleted or the ID is incorrect.')
      } else {
        setError(err.message || 'Failed to load receipt')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadMediaFiles = async () => {
    if (!token || !id) return

    setLoadingMedia(true)
    try {
      const mediaFiles = await api.getReceiptMedia(token, id)
      setMediaFiles(mediaFiles)
    } catch (err) {
      console.error('Error loading media files:', err)
      setMediaFiles([])
    } finally {
      setLoadingMedia(false)
    }
  }

  const handlePrint = async () => {
    try {
      console.log(`Printing PDF for receipt ${id}`)
      // Download PDF from backend
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/receipts/${id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to load PDF for printing')
      }
      
      // Get PDF blob
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      // Open PDF in new window for printing
      const printWindow = window.open(url)
      
      // Wait for PDF to load, then trigger print
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print()
          }, 500)
        }
      } else {
        // Fallback if popup blocked
        alert('Please allow popups to print the receipt')
      }
      
      // Clean up after print dialog closes
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
      }, 5000)
      
    } catch (err) {
      console.error('Failed to print PDF:', err)
      alert('Failed to print PDF: ' + err.message)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      console.log(`Downloading PDF for receipt ${id}`)
      // Download PDF from backend
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/receipts/${id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log('Response status:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`)
      }
      
      console.log('Converting to blob...')
      const blob = await response.blob()
      console.log('Blob created:', blob.size, 'bytes')
      
      const url = window.URL.createObjectURL(blob)
      
      // Create download link
      const link = document.createElement('a')
      link.href = url
      link.download = `Receipt-${transformedReceipt.receiptNo}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up
      setTimeout(() => window.URL.revokeObjectURL(url), 1000)
      
      console.log('PDF downloaded successfully')
    } catch (err) {
      console.error('Failed to download PDF:', err)
      alert('Failed to download PDF: ' + err.message)
    }
  }

  const handleViewDocument = async (mediaId) => {
    try {
      // Use the API endpoint to get the media file
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/receipts/${id}/media/${mediaId}`, {
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

  const handleDownloadDocument = async (mediaId, originalName) => {
    try {
      // Use the API endpoint to get the media file
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/receipts/${id}/media/${mediaId}`, {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading receipt...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/transactions')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Go Back to Transactions
          </button>
        </div>
      </div>
    )
  }

  if (!receipt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 text-xl mb-4">📄 Receipt Not Found</div>
          <p className="text-gray-500 mb-4">The receipt you're looking for doesn't exist or has been deleted.</p>
          <button
            onClick={() => navigate('/transactions')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Go Back to Transactions
          </button>
        </div>
      </div>
    )
  }

  // Transform API data to match PrintReceipt component expectations
  const transformedReceipt = {
    receiptNo: receipt.receipt_no || receipt.receiptNo,
    date: receipt.date,
    branch: receipt.branch,
    employeeName: receipt.employee_name || receipt.employeeName,
    empCode: receipt.emp_code || receipt.empCode,
    investorId: receipt.investor_id || receipt.investorId,
    investorName: receipt.investor_name || receipt.investorName,
    investorAddress: receipt.investor_address || receipt.investorAddress,
    pinCode: receipt.pin_code || receipt.pinCode,
    pan: receipt.pan,
    email: receipt.email,
    product_category: receipt.product_category,
    txnCategory: receipt.txnCategory ? [receipt.txnCategory] : [],
    txnType: receipt.txn_type || receipt.txnType,
    mode: receipt.mode,
    sip_stp_swp_period: receipt.period_installments || receipt.sip_stp_swp_period,
    noOfInstallments: receipt.installments_count || receipt.noOfInstallments,
    from: receipt.from_text || receipt.from,
    to: receipt.to_text || receipt.to,
    unitsOrAmount: receipt.units_or_amount || receipt.unitsOrAmount,
    investmentAmount: receipt.investment_amount || receipt.investmentAmount,
    schemeName: receipt.scheme_name || receipt.schemeName,
    schemeOption: receipt.scheme_option || receipt.schemeOption,
    folioPolicyNo: receipt.folio_policy_no || receipt.folioPolicyNo,
    fdType: receipt.fd_type || receipt.fdType,
    clientType: receipt.client_type || receipt.clientType,
    depositPeriodYM: receipt.deposit_period_ym || receipt.depositPeriodYM,
    roi: receipt.roi_percent || receipt.roi,
    interestPayable: receipt.interest_payable || receipt.interestPayable,
    interestFrequency: receipt.interest_frequency || receipt.interestFrequency,
    instrumentType: receipt.instrument_type || receipt.instrumentType,
    instrumentNo: receipt.instrument_no || receipt.instrumentNo,
    instrumentDate: receipt.instrument_date || receipt.instrumentDate,
    bankName: receipt.bank_name || receipt.bankName,
    bankBranch: receipt.bank_branch || receipt.bankBranch,
    fdr_demat_policy: receipt.fdr_demat_policy,
    renewalDueDate: receipt.renewal_due_date || receipt.renewalDueDate,
    maturityAmount: receipt.maturity_amount || receipt.maturityAmount,
    renewalAmount: receipt.renewal_amount || receipt.renewalAmount,
    // SIP fields
    sip_frequency: receipt.sip_frequency,
    sip_start_date: receipt.sip_start_date,
    sip_end_date: receipt.sip_end_date,
    sip_is_perpetual: receipt.sip_is_perpetual,
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/transactions')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 mr-4"
              >
                <FiArrowLeft className="w-4 h-4 mr-2" />
                Back to Transactions
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Receipt {transformedReceipt.receiptNo}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Created on {new Date(transformedReceipt.date).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center px-4 py-2 border border-green-300 dark:border-green-600 rounded-md shadow-sm text-sm font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <FiDownload className="w-4 h-4 mr-2" />
                Download PDF
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <FiPrinter className="w-4 h-4 mr-2" />
                Print
              </button>
              <button
                disabled
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed relative group"
              >
                <span className="flex items-center">
                  <span className="mr-1">📱</span>
                  WhatsApp
                </span>
                <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  Soon
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Receipt Layout */}
        <div className="receipt-content bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-red-600 font-bold text-xl">ECS</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">ECS Financial</h1>
                  <p className="text-red-100 text-sm">AMFI Registered Mutual Fund Distributor</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-red-100">Receipt No</div>
                <div className="text-lg font-bold">{transformedReceipt.receiptNo || '—'}</div>
                <div className="text-sm text-red-100 mt-1">{transformedReceipt.date ? new Date(transformedReceipt.date).toLocaleDateString('en-IN') : '—'}</div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Employee & Investor Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 dark:bg-dark-700 rounded-xl p-4 border border-gray-200 dark:border-dark-600">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Employee Details
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Name:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{transformedReceipt.employeeName || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Code:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{transformedReceipt.empCode || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Branch:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{transformedReceipt.branch || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-dark-700 rounded-xl p-4 border border-gray-200 dark:border-dark-600">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Investor Details
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">ID:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{transformedReceipt.investorId || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Name:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{transformedReceipt.investorName || '—'}</span>
                  </div>
                  {transformedReceipt.pan && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">PAN:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{transformedReceipt.pan}</span>
                    </div>
                  )}
                  {transformedReceipt.email && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Email:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{transformedReceipt.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Investment Details */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
                Investment Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {transformedReceipt.product_category && (
                  <div className="bg-white dark:bg-dark-700 rounded-lg p-4 border border-blue-100 dark:border-dark-600">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Product Type</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.product_category}</div>
                  </div>
                )}
                
                {transformedReceipt.txnType && (
                  <div className="bg-white dark:bg-dark-700 rounded-lg p-4 border border-blue-100 dark:border-dark-600">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Transaction</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.txnType}</div>
                  </div>
                )}
                
                {transformedReceipt.mode && (
                  <div className="bg-white dark:bg-dark-700 rounded-lg p-4 border border-blue-100 dark:border-dark-600">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Mode</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.mode}</div>
                  </div>
                )}
                
                {transformedReceipt.investmentAmount && (
                  <div className="bg-white dark:bg-dark-700 rounded-lg p-4 border border-blue-100 dark:border-dark-600">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Amount</div>
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(transformedReceipt.investmentAmount)}
                    </div>
                  </div>
                )}
                
                {transformedReceipt.folioPolicyNo && (
                  <div className="bg-white dark:bg-dark-700 rounded-lg p-4 border border-blue-100 dark:border-dark-600">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Folio/Policy No</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.folioPolicyNo}</div>
                  </div>
                )}

                {transformedReceipt.schemeName && (
                  <div className="bg-white dark:bg-dark-700 rounded-lg p-4 border border-blue-100 dark:border-dark-600">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Scheme Name</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.schemeName}</div>
                  </div>
                )}
              </div>

              {/* SIP Details */}
              {(transformedReceipt.sip_frequency || transformedReceipt.sip_start_date) && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    SIP Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {transformedReceipt.sip_frequency && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Frequency</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.sip_frequency}</div>
                      </div>
                    )}
                    {transformedReceipt.sip_start_date && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Start Date</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{new Date(transformedReceipt.sip_start_date).toLocaleDateString('en-IN')}</div>
                      </div>
                    )}
                    {transformedReceipt.sip_end_date && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">End Date</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{new Date(transformedReceipt.sip_end_date).toLocaleDateString('en-IN')}</div>
                      </div>
                    )}
                    {transformedReceipt.sip_is_perpetual && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Type</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">Perpetual (30 years)</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Attached Documents */}
        {receipt && receipt.media_count > 0 && (
          <div className="mt-8 bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-200 dark:border-dark-700 p-6">
            <div className="flex items-center mb-6">
              <FiFile className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Attached Documents</h3>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">({receipt.media_count} file{receipt.media_count !== 1 ? 's' : ''})</span>
            </div>
            
            {loadingMedia ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Loading documents...</p>
              </div>
            ) : mediaFiles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mediaFiles.map((file) => (
                  <div key={file.id} className="border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 rounded-xl p-4 hover:shadow-lg transition-all">
                    <div className="flex items-center mb-3">
                        {file.mime_type?.startsWith('image/') ? (
                        <FiImage className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
                        ) : (
                        <FiFile className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-3 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate" title={file.original_name}>
                            {file.original_name}
                          </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(file.file_size / 1024).toFixed(1)} KB
                          </p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDocument(file.id)}
                        className="inline-flex items-center justify-center flex-1 px-3 py-2 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                      >
                        <FiEye className="w-4 h-4 mr-1.5" />
                        View
                      </button>
                      <button
                        onClick={() => handleDownloadDocument(file.id, file.original_name)}
                        className="inline-flex items-center justify-center flex-1 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-600 rounded-md hover:bg-gray-200 dark:hover:bg-dark-500 transition-colors"
                      >
                        <FiDownload className="w-4 h-4 mr-1.5" />
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FiFile className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No documents found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
