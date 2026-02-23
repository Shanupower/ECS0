import React, { useEffect, useState } from 'react'
import { FiUpload, FiFile, FiTrash2, FiCheck, FiAlertCircle, FiRefreshCw, FiPlus } from 'react-icons/fi'

// Support both single (legacy) and array of documents
function StepFinal({ data, onBack, onSave, onSavePreset, presetPaymentMode = '', isSaving, saveError, saveSuccess, supportingDocument, setSupportingDocument, supportingDocuments, setSupportingDocuments }) {
  const docs = supportingDocuments != null ? supportingDocuments : (supportingDocument ? [supportingDocument] : [])
  const setDocs = setSupportingDocuments != null ? setSupportingDocuments : (files => { if (files.length === 1) setSupportingDocument(files[0]); else if (files.length === 0) setSupportingDocument(null) })
  const [transactionType, setTransactionType] = useState('')
  const [offlineDetails, setOfflineDetails] = useState({
    bankName: '',
    chequeNumber: '',
    chequeDate: '',
    branch: ''
  })
  const [onlineTransactionNumber, setOnlineTransactionNumber] = useState('')
  const [othersTransactionType, setOthersTransactionType] = useState('')
  const [validationError, setValidationError] = useState('')
  const [lastDocMeta, setLastDocMeta] = useState(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('last_supporting_document')
      if (raw) {
        const parsed = JSON.parse(raw)
        setLastDocMeta(parsed || null)
      } else {
        setLastDocMeta(null)
      }
    } catch {
      setLastDocMeta(null)
    }
  }, [])

  useEffect(() => {
    if (presetPaymentMode && !transactionType) {
      setTransactionType(presetPaymentMode)
    }
  }, [presetPaymentMode, transactionType])

  const dataUrlToFile = (dataUrl, filename, mimeType) => {
    const arr = dataUrl.split(',')
    const bstr = atob(arr[1] || '')
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new File([u8arr], filename, { type: mimeType })
  }

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
    const maxSize = 5 * 1024 * 1024
    const valid = files.filter(file => {
      if (file.size > maxSize) {
        setValidationError('Each file must be less than 5MB')
        return false
      }
      if (!allowedTypes.includes(file.type)) {
        setValidationError('Please upload images (JPEG, PNG, GIF) or PDF only')
        return false
      }
      return true
    })
    if (valid.length > 0) {
      setValidationError('')
      setDocs([...docs, ...valid])
      const file = valid[0]
      try {
        const reader = new FileReader()
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            sessionStorage.setItem('last_supporting_document', JSON.stringify({ name: file.name, type: file.type, dataUrl: reader.result, updatedAt: new Date().toISOString() }))
            setLastDocMeta({ name: file.name, type: file.type, dataUrl: reader.result })
          }
        }
        reader.readAsDataURL(file)
      } catch (err) { console.warn('Failed to store last document:', err) }
    }
    event.target.value = ''
  }

  const removeDocument = (index) => {
    if (index != null) {
      setDocs(docs.filter((_, i) => i !== index))
    } else {
      setDocs([])
    }
  }

  const applyLastDocument = () => {
    if (!lastDocMeta?.dataUrl) return
    const restored = dataUrlToFile(lastDocMeta.dataUrl, lastDocMeta.name || 'document', lastDocMeta.type || 'application/pdf')
    setDocs([...docs, restored])
  }

  const handleSave = () => {
    setValidationError('')
    // Validate transaction type
    if (!transactionType) {
      setValidationError('Please select transaction type (Online/Offline/Others)')
      return
    }
    
    // Validate transaction details
    if (transactionType === 'Offline') {
      if (!offlineDetails.bankName || !offlineDetails.chequeNumber || !offlineDetails.chequeDate || !offlineDetails.branch) {
        setValidationError('Please fill all offline transaction details (Bank Name, Cheque Number, Cheque Date, Branch)')
        return
      }
    } else if (transactionType === 'Online') {
      if (!onlineTransactionNumber || onlineTransactionNumber.trim() === '') {
        setValidationError('Please enter transaction number')
        return
      }
    } else if (transactionType === 'Others') {
      if (!othersTransactionType || othersTransactionType.trim() === '') {
        setValidationError('Please enter transaction type (e.g., RTGS, NEFT, etc.)')
        return
      }
    }
    
    // Validate product-specific details
    // Data is already normalized (snake_case), so we use product_category
    if (data.product_category === 'FD') {
      // Validate FD fields from data
      if (!data.fd_issuer_name || !data.fd_scheme_name || !data.fd_deposit_amount || 
          !data.fd_tenure_months || !data.fd_payout_frequency || !data.fd_application_number) {
        setValidationError('Please fill all Fixed Deposit details')
        return
      }
      if (parseFloat(data.fd_deposit_amount) <= 0) {
        setValidationError('Deposit amount must be a positive number')
        return
      }
      if (!data.fd_locked_interest_rate_pa || parseFloat(data.fd_locked_interest_rate_pa) <= 0) {
        setValidationError('Interest rate must be calculated')
        return
      }
    } else if (data.product_category === 'MF') {
      // Validate Mutual Fund required fields from data
      if (!data.scheme_name) {
        setValidationError('Scheme name is required for Mutual Funds')
        return
      }
      // Data is normalized, so use investment_amount
      if (!data.investment_amount || parseFloat(data.investment_amount) <= 0) {
        setValidationError('Investment amount must be a positive number')
        return
      }
    } else if (data.product_category === 'INS') {
      // Validate Insurance required fields from data
      if (!data.insurance_issuer_key) {
        setValidationError('Insurance issuer is required')
        return
      }
      if (!data.insurance_product_id) {
        setValidationError('Insurance product is required')
        return
      }
      const insuranceAmount = data.investment_amount ?? data.investmentAmount
      if (!insuranceAmount || parseFloat(insuranceAmount) <= 0) {
        setValidationError('Premium amount must be a positive number')
        return
      }
    } else if (data.product_category === 'BOND') {
      // Validate Bonds required fields from data
      if (!data.issuer_company && !data.issuerCompany) {
        setValidationError('Issuer company is required for Bonds')
        return
      }
      const bondAmount = data.investment_amount ?? data.investmentAmount
      if (!bondAmount || parseFloat(bondAmount) <= 0) {
        setValidationError('Investment amount must be a positive number')
        return
      }
    } else if (data.product_category === 'MISC') {
      // Validate Misc Services required fields from data
      if (!data.service_name || !data.service_price) {
        setValidationError('Please fill all Misc Services details')
        return
      }
      if (parseFloat(data.service_price) <= 0) {
        setValidationError('Service price must be a positive number')
        return
      }
    }
    
    // Validate supporting document(s)
    if (!docs.length) {
      setValidationError('Please upload at least one supporting document (screenshot or PDF)')
      return
    }
    
    // Merge additional data with transaction_details structure
    const transactionDetails = {
      entry_mode: transactionType === 'Others' ? 'Others' : transactionType,
      channel: transactionType === 'Online' ? onlineTransactionNumber : 
               transactionType === 'Offline' ? 'Cheque' :
               transactionType === 'Others' ? othersTransactionType : null,
      ...(transactionType === 'Offline' ? {
        bank_name: offlineDetails.bankName,
        reference_no: offlineDetails.chequeNumber,
        txn_date: offlineDetails.chequeDate,
        bank_branch: offlineDetails.branch
      } : {}),
      ...(transactionType === 'Online' ? {
        reference_no: onlineTransactionNumber
      } : {}),
      ...(transactionType === 'Others' ? {
        notes: othersTransactionType
      } : {})
    }
    
    // For Offline: send bank_branch (not branch) so receipt branch isn't overwritten; map cheque to instrument
    const finalData = {
      ...data,
      transactionType,
      transaction_details: transactionDetails,
      entry_mode: transactionDetails.entry_mode,
      transaction_channel: transactionDetails.channel,
      ...(transactionType === 'Offline' ? {
        bankName: offlineDetails.bankName,
        chequeNumber: offlineDetails.chequeNumber,
        chequeDate: offlineDetails.chequeDate,
        bank_branch: offlineDetails.branch,
        instrumentType: 'Cheque',
        instrumentNo: offlineDetails.chequeNumber,
        instrumentDate: offlineDetails.chequeDate
      } : {}),
      ...(transactionType === 'Online' ? { transactionNumber: onlineTransactionNumber } : {}),
      ...(transactionType === 'Others' ? { othersTransactionType } : {})
    }
    
    onSave(finalData)
  }

  const handleSavePreset = () => {
    if (!onSavePreset || !data?.product_category) return
    const preset = { productType: data.product_category }
    if (data.product_category === 'MF') {
      preset.amc_code = data.amc_code || null
      preset.amc_name = data.amc_name || null
      preset.scheme_code = data.scheme_code || null
      preset.scheme_name = data.scheme_name || null
    } else if (data.product_category === 'FD') {
      preset.issuer_key = data.fd_issuer_key || null
      preset.issuer_name = data.fd_issuer_name || null
      preset.scheme_id = data.fd_scheme_id || null
      preset.scheme_name = data.fd_scheme_name || null
    } else if (data.product_category === 'BOND') {
      preset.issuer_key = data.bond_issuer_key || null
      preset.issuer_name = data.bond_issuer_name || null
      preset.scheme_id = data.bond_scheme_id || null
      preset.scheme_name = data.bond_scheme_name || null
    } else if (data.product_category === 'INS') {
      preset.issuer_key = data.insurance_issuer_key || null
      preset.issuer_name = data.issuerCompany || data.issuer_company || null
      preset.product_id = data.insurance_product_id || null
      preset.product_name = data.schemeName || data.scheme_name || null
    } else if (data.product_category === 'MISC') {
      // Misc Services doesn't need preset data (service name is free text)
    }
    preset.payment_mode = transactionType || ''
    preset.label = `${data.product_category} preset`
    onSavePreset(preset)
  }

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '');
  const fmtAmt = (a) => {
    if (a === null || a === undefined || a === '') return '';
    const n = isNaN(Number(a)) ? a : Number(a);
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n); }
    catch { return String(a); }
  };

  const getProductTypeLabel = (type) => {
    switch(type) {
      case 'MF': return 'Mutual Funds';
      case 'INS': return 'Insurance';
      case 'FD': return 'Fixed Deposit';
      case 'BOND': return 'Bonds';
      case 'MISC': return 'Misc Services';
      default: return type;
    }
  }

  return (
    <div className="space-y-6">
      {validationError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center space-x-2 text-red-700 dark:text-red-300 text-sm">
          <FiAlertCircle className="w-4 h-4" />
          <span>{validationError}</span>
        </div>
      )}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Receipt Preview</h3>
        <p className="text-gray-600 dark:text-gray-400">Review your investment details before saving</p>
      </div>

      {/* Receipt Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
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
              <div className="text-lg font-bold">{data.receipt_no || data.receiptNo}</div>
              <div className="text-sm text-red-100 mt-1">{fmtDate(data.date)}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Employee & Investor Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Employee Details
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Name:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{data.employee_name || data.employeeName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Code:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{data.emp_code || data.empCode || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Branch:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{data.branch || '—'}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Investor Details
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">ID:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{data.investor_id || data.investorId || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Name:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{data.investor_name || data.investorName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">PAN:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{data.pan || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Email:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{data.email || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Investment Details */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
              Investment Details
            </h3>
            
            {/* FD-specific display */}
            {data.product_category === 'FD' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.fd_issuer_name && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Issuer</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.fd_issuer_name} ({data.fd_issuer_type})</div>
                  </div>
                )}
                {data.fd_scheme_name && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Scheme</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.fd_scheme_name}</div>
                  </div>
                )}
                {data.fd_deposit_amount && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Deposit Amount</div>
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">{fmtAmt(data.fd_deposit_amount)}</div>
                  </div>
                )}
                {data.fd_tenure_months && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Tenure</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.fd_tenure_months} months</div>
                  </div>
                )}
                {data.fd_payout_frequency && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Payout Frequency</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.fd_payout_frequency}</div>
                  </div>
                )}
                {data.fd_total_rate_pa && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Interest Rate</div>
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">{data.fd_total_rate_pa.toFixed(2)}% p.a.</div>
                  </div>
                )}
                {data.fd_maturity_amount && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Maturity Amount</div>
                    <div className="text-lg font-semibold text-green-700 dark:text-green-400">{fmtAmt(data.fd_maturity_amount)}</div>
                  </div>
                )}
                {data.fd_application_number && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Application/FD Number</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.fd_application_number}</div>
                  </div>
                )}
              </div>
            ) : null}
            
            {/* NCD/Bond-specific display (exclude FD headers) */}
            {(data.product_category === 'BOND' || data.product_category === 'NCD') ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.bond_issuer_name && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Issuer</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.bond_issuer_name} ({data.bond_issuer_type})</div>
                  </div>
                )}
                {data.bond_scheme_name && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Scheme</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.bond_scheme_name}</div>
                    {(data.bond_category || data.bond_sub_category) && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {data.bond_category && <span>{data.bond_category}</span>}
                        {data.bond_category && data.bond_sub_category && <span className="mx-1">•</span>}
                        {data.bond_sub_category && <span>{data.bond_sub_category}</span>}
                      </div>
                    )}
                  </div>
                )}
                {data.bond_isin && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">ISIN</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.bond_isin}</div>
                  </div>
                )}
                {data.bond_transaction_type && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Transaction Type</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.bond_transaction_type}</div>
                  </div>
                )}
                {data.bond_number_of_units && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Number of Units</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.bond_number_of_units}</div>
                  </div>
                )}
                {data.bond_investment_amount && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Investment Amount</div>
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">{fmtAmt(data.bond_investment_amount)}</div>
                  </div>
                )}
                {data.bond_coupon_rate && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Coupon Rate</div>
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">{data.bond_coupon_rate}% p.a.</div>
                  </div>
                )}
                {data.bond_face_value && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Face Value</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">₹{data.bond_face_value}</div>
                  </div>
                )}
                {data.bond_transaction_date && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Transaction Date</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{fmtDate(data.bond_transaction_date)}</div>
                  </div>
                )}
                {data.bond_maturity_date && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Maturity Date</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{fmtDate(data.bond_maturity_date)}</div>
                  </div>
                )}
                {data.bond_application_number && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Application Number</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.bond_application_number}</div>
                  </div>
                )}
              </div>
            ) : data.product_category === 'MISC' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.service_name && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Service Name</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.service_name}</div>
                  </div>
                )}
                {data.service_price && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Service Price</div>
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">{fmtAmt(data.service_price)}</div>
                  </div>
                )}
              </div>
            ) : data.product_category !== 'FD' && data.product_category !== 'BOND' && data.product_category !== 'INS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">Product Type</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{getProductTypeLabel(data.product_category)}</div>
              </div>
              
              {data.transaction_type && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Transaction Type</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.transaction_type}</div>
                </div>
              )}
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">Transaction</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.txn_type || 'Fresh'}</div>
              </div>
              
              {/* Only show mode for MF products */}
              {data.product_category === 'MF' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Mode</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.mode || 'Lump Sum'}</div>
                </div>
              )}
              
              {data.investment_amount && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Amount</div>
                  <div className="text-lg font-semibold text-green-600 dark:text-green-400">{fmtAmt(data.investment_amount)}</div>
                </div>
              )}
              
              {data.folio_policy_no && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Folio/Policy No</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.folio_policy_no}</div>
                </div>
              )}
            </div>
            )}
            
            {/* Insurance Details Section */}
            {data.product_category === 'INS' && (
              <div className="mt-4 p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg border border-indigo-300 dark:border-indigo-800">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-indigo-600 rounded-full mr-2"></span>
                  Insurance Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.issuerCompany && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Issuer Company</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{data.issuerCompany}</div>
                    </div>
                  )}
                  {data.issuerCategory && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Category</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{data.issuerCategory}</div>
                    </div>
                  )}
                  {data.schemeName && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Product Name</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{data.schemeName}</div>
                    </div>
                  )}
                  {data.investment_amount && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Premium Amount</div>
                      <div className="font-semibold text-green-600 dark:text-green-400">{fmtAmt(data.investment_amount)}</div>
                    </div>
                  )}
                  {data.folioPolicyNo && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Policy Number</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{data.folioPolicyNo}</div>
                    </div>
                  )}
                  {data.folio_policy_no && !data.folioPolicyNo && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Policy Number</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{data.folio_policy_no}</div>
                    </div>
                  )}
                  {data.insurance_date_of_issue && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Date of Issue</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{fmtDate(data.insurance_date_of_issue)}</div>
                    </div>
                  )}
                  {data.insurance_renewal_date && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Renewal Date</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{fmtDate(data.insurance_renewal_date)}</div>
                    </div>
                  )}
                  {data.insurance_sum_assured && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Sum Assured</div>
                      <div className="font-semibold text-green-600 dark:text-green-400">{fmtAmt(data.insurance_sum_assured)}</div>
                    </div>
                  )}
                  {data.insurance_term && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Term</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{data.insurance_term} years</div>
                    </div>
                  )}
                  {data.insurance_premium_pay_term && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Premium Pay Term</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{data.insurance_premium_pay_term} years</div>
                    </div>
                  )}
                  {data.insurance_payment_schedule && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Payment Schedule</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{data.insurance_payment_schedule}</div>
                    </div>
                  )}
                  {data.insurance_money_back !== undefined && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Money Back</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          data.insurance_money_back 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}>
                          {data.insurance_money_back ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  )}
                  {data.insurance_selected_riders_details && Array.isArray(data.insurance_selected_riders_details) && data.insurance_selected_riders_details.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:col-span-2">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Selected Riders</div>
                      <div className="space-y-2">
                        {data.insurance_selected_riders_details.map((rider, index) => (
                          <div key={rider.id || index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {rider.name || rider.rider_name || `Rider ID: ${rider.id || rider.rider_id}`}
                            </span>
                            <span className="text-sm text-green-600 dark:text-green-400 font-semibold">
                              {rider.premium_fixed 
                                ? fmtAmt(rider.premium_fixed)
                                : rider.premium_percentage 
                                ? `${rider.premium_percentage}% of SA`
                                : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Fallback to show rider IDs if details are not available */}
                  {(!data.insurance_selected_riders_details || !Array.isArray(data.insurance_selected_riders_details) || data.insurance_selected_riders_details.length === 0) && 
                   data.insurance_selected_riders && Array.isArray(data.insurance_selected_riders) && data.insurance_selected_riders.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:col-span-2">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Selected Riders</div>
                      <div className="flex flex-wrap gap-2">
                        {data.insurance_selected_riders.map((riderId, index) => (
                          <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200">
                            Rider ID: {riderId}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Product-specific details */}
            {data.product_category === 'MF' && data.amc_name && (
              <>
                {/* New MF Scheme Details */}
                {(data.amc_name || data.scheme_name) && (
                  <div className="mt-4 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-300 dark:border-blue-800">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                      Mutual Fund Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.amc_name && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400">AMC</div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{data.amc_name}</div>
                        </div>
                      )}
                      {data.scheme_name && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400">Scheme</div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{data.scheme_name} {data.scheme_is_nfo && <span className="text-xs bg-yellow-100 dark:text-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded ml-2">NFO</span>}</div>
                        </div>
                      )}
                      {data.scheme_category && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400">Category</div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{data.scheme_category} - {data.scheme_sub_category}</div>
                        </div>
                      )}
                      {(data.scheme_plan || data.scheme_option || data.scheme_type) && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400">Plan, Option & Type</div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {data.scheme_plan && <span>{data.scheme_plan}</span>}
                            {data.scheme_option && (
                              <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                data.scheme_option === 'GROWTH' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                data.scheme_option === 'IDCW_PAYOUT' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                                'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'
                              }`}>
                                {data.scheme_option === 'GROWTH' ? 'Growth' : 
                                 data.scheme_option === 'IDCW_PAYOUT' ? 'IDCW – Payout' : 
                                 data.scheme_option === 'IDCW_REINVEST' ? 'IDCW – Reinvestment' : 
                                 data.scheme_option}
                              </span>
                            )}
                            {data.scheme_type && <span className="ml-2">- {data.scheme_type}</span>}
                          </div>
                        </div>
                      )}
                      {data.folio_number && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400">Folio Number</div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{data.folio_number}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            
            {data.product_category === 'MF' && !data.transaction_type && data.fd_issuer_name && (
                <div className="mt-4 p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg border border-purple-300 dark:border-purple-800">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-purple-600 rounded-full mr-2"></span>
                    Fixed Deposit Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.fd_issuer_name && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Issuer</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{data.fd_issuer_name} ({data.fd_issuer_type})</div>
                      </div>
                    )}
                    {data.fd_scheme_name && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Scheme</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{data.fd_scheme_name}</div>
                        {data.fd_is_cumulative && <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded ml-2">Cumulative</span>}
                      </div>
                    )}
                    {data.fd_deposit_amount && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Deposit Amount</div>
                        <div className="font-semibold text-green-600 dark:text-green-400">{fmtAmt(data.fd_deposit_amount)}</div>
                      </div>
                    )}
                    {data.fd_tenure_months && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Tenure</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{data.fd_tenure_months} months ({Math.floor(data.fd_tenure_months/12)} years)</div>
                      </div>
                    )}
                    {data.fd_payout_frequency && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Payout Frequency</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{data.fd_payout_frequency}</div>
                      </div>
                    )}
                    {data.fd_total_rate_pa && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Interest Rate</div>
                        <div className="font-semibold text-green-600 dark:text-green-400">{data.fd_total_rate_pa.toFixed(2)}% p.a.</div>
                      </div>
                    )}
                    {data.fd_maturity_amount && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Maturity Amount</div>
                        <div className="font-semibold text-green-700 dark:text-green-400">{fmtAmt(data.fd_maturity_amount)}</div>
                      </div>
                    )}
                    {data.fd_maturity_date && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Maturity Date</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{fmtDate(data.fd_maturity_date)}</div>
                      </div>
                    )}
                    {data.fd_application_number && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Application/FD Number</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{data.fd_application_number}</div>
                      </div>
                    )}
                    {data.fd_tds_applicable && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">TDS</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{data.fd_form_15g_15h ? 'Form 15G/15H Submitted' : 'Applicable'}</div>
                      </div>
                    )}
                  </div>
                </div>
            )}
            
            {/* NCD/Bond Details Section */}
            {data.product_category === 'BOND' && (
              <div className="mt-4 p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg border border-purple-300 dark:border-purple-800">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-purple-600 rounded-full mr-2"></span>
                  NCD/Bond Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.bond_issuer_name && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Issuer</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{data.bond_issuer_name} ({data.bond_issuer_type})</div>
                    </div>
                  )}
                  {data.bond_scheme_name && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Scheme Name</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{data.bond_scheme_name}</div>
                      {(data.bond_category || data.bond_sub_category) && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {data.bond_category && <span>{data.bond_category}</span>}
                          {data.bond_category && data.bond_sub_category && <span className="mx-1">•</span>}
                          {data.bond_sub_category && <span>{data.bond_sub_category}</span>}
                        </div>
                      )}
                    </div>
                  )}
                  {data.bond_isin && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">ISIN</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{data.bond_isin}</div>
                    </div>
                  )}
                  {data.bond_coupon_rate && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Coupon Rate</div>
                      <div className="font-semibold text-green-600 dark:text-green-400">{data.bond_coupon_rate}% p.a.</div>
                    </div>
                  )}
                  {data.bond_face_value && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Face Value</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">₹{data.bond_face_value}</div>
                    </div>
                  )}
                  {data.bond_issue_date && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Issue Date</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{fmtDate(data.bond_issue_date)}</div>
                    </div>
                  )}
                  {data.bond_maturity_date && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Maturity Date</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{fmtDate(data.bond_maturity_date)}</div>
                    </div>
                  )}
                  {data.bond_transaction_type && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Transaction Type</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{data.bond_transaction_type}</div>
                    </div>
                  )}
                  {data.bond_number_of_units && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Number of Units</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{data.bond_number_of_units}</div>
                    </div>
                  )}
                  {data.bond_investment_amount && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Investment Amount</div>
                      <div className="font-semibold text-green-600 dark:text-green-400">{fmtAmt(data.bond_investment_amount)}</div>
                    </div>
                  )}
                  {data.bond_transaction_date && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Transaction Date</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{fmtDate(data.bond_transaction_date)}</div>
                    </div>
                  )}
                  {data.bond_application_number && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Application Number</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{data.bond_application_number}</div>
                    </div>
                  )}
                  {data.bond_form_15g_15h !== undefined && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">TDS</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{data.bond_form_15g_15h ? 'Form 15G/15H Submitted' : 'Applicable'}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Transaction Details (MF only - SIP, SWP, STP, Switch) */}
            {data.product_category === 'MF' && data.transaction_type && (
              <div className="mt-4 p-4 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-300 dark:border-green-800">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                  Transaction Details: {data.transaction_type}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.sip_frequency && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">SIP Frequency</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{data.sip_frequency}</div>
                    </div>
                  )}
                  {data.sip_start_date && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Start Date</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{fmtDate(data.sip_start_date)}</div>
                    </div>
                  )}
                  {data.sip_end_date && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">End Date</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{fmtDate(data.sip_end_date)}</div>
                    </div>
                  )}
                  {data.sip_is_perpetual && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Type</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">Perpetual (40 years)</div>
                    </div>
                  )}
                  {data.swp_frequency && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">SWP Frequency</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{data.swp_frequency}</div>
                    </div>
                  )}
                  {data.swp_start_date && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Start Date</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{fmtDate(data.swp_start_date)}</div>
                    </div>
                  )}
                  {data.swp_amount && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Withdrawal Amount</div>
                      <div className="font-semibold text-green-600 dark:text-green-400">{fmtAmt(data.swp_amount)}</div>
                    </div>
                  )}
                  {data.stp_target_scheme_name && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Transfer to Scheme</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{data.stp_target_scheme_name}</div>
                    </div>
                  )}
                  {data.stp_frequency && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">STP Frequency</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{data.stp_frequency}</div>
                    </div>
                  )}
                  {data.stp_start_date && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Start Date</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{fmtDate(data.stp_start_date)}</div>
                    </div>
                  )}
                  {data.stp_amount && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Transfer Amount</div>
                      <div className="font-semibold text-green-600 dark:text-green-400">{fmtAmt(data.stp_amount)}</div>
                    </div>
                  )}
                  {data.switch_to_scheme_name && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Switch to Scheme</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{data.switch_to_scheme_name}</div>
                    </div>
                  )}
                  {data.switch_type && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Switch Type</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{data.switch_type}</div>
                    </div>
                  )}
                  {data.switch_value && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Switch Value</div>
                      <div className="font-semibold text-green-600 dark:text-green-400">{data.switch_type === 'Amount' ? fmtAmt(data.switch_value) : `${data.switch_value} units`}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Transaction Type */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
              <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
              Transaction Type *
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <button
                type="button"
                onClick={() => setTransactionType('Online')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  transactionType === 'Online'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">💻</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">Online</div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setTransactionType('Offline')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  transactionType === 'Offline'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">🏦</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">Offline</div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setTransactionType('Others')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  transactionType === 'Others'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">📝</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">Others</div>
                </div>
              </button>
            </div>

            {/* Online Transaction Details */}
            {transactionType === 'Online' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Transaction Number *
                </label>
                <input
                  type="text"
                  value={onlineTransactionNumber}
                  onChange={(e) => setOnlineTransactionNumber(e.target.value)}
                  placeholder="Enter transaction number"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Offline Transaction Details */}
            {transactionType === 'Offline' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      value={offlineDetails.bankName}
                      onChange={(e) => setOfflineDetails({...offlineDetails, bankName: e.target.value})}
                      placeholder="Enter bank name"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Cheque Number *
                    </label>
                    <input
                      type="text"
                      value={offlineDetails.chequeNumber}
                      onChange={(e) => setOfflineDetails({...offlineDetails, chequeNumber: e.target.value})}
                      placeholder="Enter cheque number"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Cheque Date *
                    </label>
                    <input
                      type="date"
                      value={offlineDetails.chequeDate}
                      onChange={(e) => setOfflineDetails({...offlineDetails, chequeDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Branch *
                    </label>
                    <input
                      type="text"
                      value={offlineDetails.branch}
                      onChange={(e) => setOfflineDetails({...offlineDetails, branch: e.target.value})}
                      placeholder="Enter branch"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Others Transaction Details */}
            {transactionType === 'Others' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Transaction Type * (e.g., RTGS, NEFT, etc.)
                </label>
                <input
                  type="text"
                  value={othersTransactionType}
                  onChange={(e) => setOthersTransactionType(e.target.value)}
                  placeholder="Enter transaction type (e.g., RTGS, NEFT, IMPS, etc.)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Specify the transaction type or payment method used
                </p>
              </div>
            )}
          </div>


          {/* Supporting Document(s) */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
              <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
              Supporting Document(s) *
            </h3>
            {docs.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                <FiUpload className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Upload photo proof or supporting document
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                  Supported formats: JPEG, PNG, GIF, PDF (Max 5MB each)
                </p>
                <label className="inline-flex items-center px-4 py-2 border border-blue-300 dark:border-blue-600 text-sm font-semibold rounded-lg text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
                  <FiUpload className="w-4 h-4 mr-2" />
                  Choose File
                  <input type="file" accept="image/*,.pdf" multiple onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            ) : (
              <div className="space-y-2">
                {docs.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center min-w-0">
                      <FiFile className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-3 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeDocument(index)} className="inline-flex items-center px-3 py-1.5 border border-red-300 dark:border-red-600 text-xs font-semibold rounded-lg text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/40 hover:bg-red-100 dark:hover:bg-red-900/60 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-all duration-200 flex-shrink-0 ml-2">
                      <FiTrash2 className="w-3 h-3 mr-1" /> Remove
                    </button>
                  </div>
                ))}
                <label className="inline-flex items-center px-4 py-2 mt-2 border border-dashed border-blue-300 dark:border-blue-600 text-sm font-semibold rounded-lg text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                  <FiPlus className="w-4 h-4 mr-2" />
                  Add more attachments
                  <input type="file" accept="image/*,.pdf" multiple onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            )}
          </div>

      {docs.length === 0 && lastDocMeta?.dataUrl && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-center justify-between">
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            Use your last uploaded document?
          </div>
          <button
            onClick={applyLastDocument}
            className="px-3 py-1.5 rounded-md bg-yellow-600 text-white text-sm font-semibold"
          >
            Use Last Document
          </button>
        </div>
      )}
        </div>
      </div>
      
      {saveSuccess && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400">
          <div className="flex items-center">
            <FiCheck className="w-5 h-5 mr-2" />
            <span className="font-medium">Success:</span>
            <span className="ml-1">{saveSuccess}</span>
          </div>
        </div>
      )}
      
      {saveError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          <div className="flex items-center">
            <FiAlertCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">Error:</span>
            <span className="ml-1">{saveError}</span>
          </div>
        </div>
      )}
      
      <div className="flex gap-4 justify-center">
        <button 
          onClick={onBack} 
          disabled={isSaving}
          className={`px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Back
        </button>
        <button
          onClick={handleSavePreset}
          disabled={isSaving || !onSavePreset}
          className={`px-6 py-3 border border-yellow-300 dark:border-yellow-700 rounded-lg font-semibold text-yellow-800 dark:text-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors ${isSaving || !onSavePreset ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Save Preset
        </button>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className={`px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isSaving ? (
            <div className="flex items-center">
              <FiRefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </div>
          ) : (
            'Save Receipt'
          )}
        </button>
      </div>
    </div>
  )
}

export default StepFinal

