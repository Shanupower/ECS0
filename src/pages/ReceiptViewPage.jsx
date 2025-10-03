import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiPrinter, FiDownload, FiFile, FiImage, FiEye } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import PrintReceipt from '../components/PrintReceipt'

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

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // Create a printable version
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${receipt?.receipt_no || receipt?.receiptNo || 'N/A'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .receipt { max-width: 800px; margin: 0 auto; }
            .rec-header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #e11919; padding-bottom: 10px; }
            .rec-brand { display: flex; align-items: center; gap: 10px; }
            .rec-meta { text-align: right; }
            .rec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
            .card h3 { margin: 0 0 10px 0; color: #e11919; }
            .rec-row { display: flex; margin: 5px 0; }
            .rec-label { font-weight: bold; width: 150px; }
            .rec-value { flex: 1; }
            .two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .muted { color: #666; }
            .rec-note { text-align: center; margin-top: 30px; padding: 15px; background: #f5f5f5; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            ${document.querySelector('.receipt-view').innerHTML}
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
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
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/transactions')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 mr-4"
              >
                <FiArrowLeft className="w-4 h-4 mr-2" />
                Back to Transactions
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Receipt {transformedReceipt.receiptNo}
                </h1>
                <p className="text-sm text-gray-500">
                  Created on {new Date(transformedReceipt.date).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <FiPrinter className="w-4 h-4 mr-2" />
                Print
              </button>
              <button
                onClick={handleDownload}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <FiDownload className="w-4 h-4 mr-2" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="receipt-view">
          <PrintReceipt data={transformedReceipt} />
        </div>
        
        {/* Attached Documents */}
        {receipt && receipt.media_count > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <FiFile className="w-5 h-5 text-gray-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Attached Documents</h3>
              <span className="ml-2 text-sm text-gray-500">({receipt.media_count} file{receipt.media_count !== 1 ? 's' : ''})</span>
            </div>
            
            {loadingMedia ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-500 mt-2">Loading documents...</p>
              </div>
            ) : mediaFiles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mediaFiles.map((file) => (
                  <div key={file.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center flex-1 min-w-0">
                        {file.mime_type?.startsWith('image/') ? (
                          <FiImage className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" />
                        ) : (
                          <FiFile className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate" title={file.original_name}>
                            {file.original_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.file_size / 1024).toFixed(1)} KB
                          </p>
                          <p className="text-xs text-gray-400">
                            Uploaded by {file.uploaded_by_name || 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex space-x-2">
                      <button
                        onClick={() => window.open(`/uploads/${file.filename}`, '_blank')}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                      >
                        <FiEye className="w-3 h-3 mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = `/uploads/${file.filename}`
                          link.download = file.original_name
                          link.click()
                        }}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                      >
                        <FiDownload className="w-3 h-3 mr-1" />
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <FiFile className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No documents found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
