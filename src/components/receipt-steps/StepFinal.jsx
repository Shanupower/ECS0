import React, { useEffect, useState } from 'react'
import { FiUpload, FiFile, FiTrash2, FiCheck, FiAlertCircle, FiRefreshCw, FiPlus } from 'react-icons/fi'
import { Button } from '../ui'
import { formatMinInvestment } from '../../data/mf_amc_categories'
import DatePickerInput from '../ui/DatePickerInput.jsx'

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
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    const maxSize = 10 * 1024 * 1024 // 10MB to match backend/upload limits
    const valid = files.filter(file => {
      if (file.size > maxSize) {
        setValidationError('Each file must be less than 10MB')
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
      preset.mf_amc_category = data.mf_amc_category || 'MF'
      preset.mf_amc_category_min_investment = data.mf_amc_category_min_investment ?? null
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
    <div className="receipt-step-card space-y-6 p-6">
      {validationError && (
        <div className="rounded-xl border border-[var(--error)]/40 bg-[var(--error-muted)] p-4 flex items-center gap-2 text-[var(--error)] text-sm">
          <FiAlertCircle className="w-4 h-4" />
          <span>{validationError}</span>
        </div>
      )}
      <div className="text-center">
        <h3 className="receipt-step-title mb-2">Receipt Preview</h3>
        <p className="receipt-step-helper">Review your investment details before saving</p>
      </div>

      {/* Receipt Preview */}
      <div className="bg-[var(--card-bg)] rounded-card border border-[var(--stroke)] overflow-hidden shadow-sm">
        {/* Header – fixed dark gradient + white text so it stays visible in light and dark mode */}
        <div className="receipt-preview-header p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-card flex items-center justify-center">
                <span className="receipt-preview-header__text font-bold text-xl">ECS</span>
              </div>
              <div>
                <h1 className="receipt-preview-header__text text-xl font-bold">ECS Financial</h1>
                <p className="receipt-preview-header__text receipt-preview-header__text--muted text-caption">AMFI Registered Mutual Fund Distributor</p>
              </div>
            </div>
            <div className="text-right">
              <div className="receipt-preview-header__text receipt-preview-header__text--muted text-caption">Receipt No</div>
              <div className="receipt-preview-header__text text-lg font-bold">{data.receipt_no || data.receiptNo}</div>
              <div className="receipt-preview-header__text receipt-preview-header__text--muted text-caption mt-1">{fmtDate(data.date)}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Employee & Investor Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[var(--card-hover)] rounded-card p-4">
              <h3 className="text-card-title text-[var(--text-primary)] mb-3 flex items-center">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] mr-2" />
                Employee Details
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-helper text-[var(--text-muted)]">Name:</span>
                  <span className="font-medium text-[var(--text-primary)]">{data.employee_name || data.employeeName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-helper text-[var(--text-muted)]">Code:</span>
                  <span className="font-medium text-[var(--text-primary)]">{data.emp_code || data.empCode || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-helper text-[var(--text-muted)]">Branch:</span>
                  <span className="font-medium text-[var(--text-primary)]">{data.branch_name || data.branch_code || data.branch || '—'}</span>
                </div>
              </div>
            </div>

            <div className="bg-[var(--card-hover)] rounded-card p-4">
              <h3 className="text-card-title text-[var(--text-primary)] mb-3 flex items-center">
                <span className="w-2 h-2 rounded-full bg-[var(--success)] mr-2" />
                Investor Details
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-helper text-[var(--text-muted)]">ID:</span>
                  <span className="font-medium text-[var(--text-primary)]">{data.investor_id || data.investorId || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-helper text-[var(--text-muted)]">Name:</span>
                  <span className="font-medium text-[var(--text-primary)]">{data.investor_name || data.investorName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-helper text-[var(--text-muted)]">PAN:</span>
                  <span className="font-medium text-[var(--text-primary)]">{data.pan || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-helper text-[var(--text-muted)]">Email:</span>
                  <span className="font-medium text-[var(--text-primary)] text-body">{data.email || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Investment Details */}
          <div className="rounded-card p-6 border border-[var(--stroke)] bg-[var(--accent-muted)]">
            <h3 className="text-title text-[var(--text-primary)] mb-4 flex items-center">
              <span className="w-3 h-3 rounded-full bg-[var(--accent)] mr-3" />
              Investment Details
            </h3>
            
            {/* FD-specific display */}
            {data.product_category === 'FD' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.fd_issuer_name && (
                  <div className="bg-[var(--card-bg)] rounded-card p-4">
                    <div className="text-helper text-[var(--text-muted)]">Issuer</div>
                    <div className="text-body font-semibold text-[var(--text-primary)]">{data.fd_issuer_name} ({data.fd_issuer_type})</div>
                  </div>
                )}
                {data.fd_scheme_name && (
                  <div className="bg-[var(--card-bg)] rounded-card p-4">
                    <div className="text-helper text-[var(--text-muted)]">Scheme</div>
                    <div className="text-body font-semibold text-[var(--text-primary)]">{data.fd_scheme_name}</div>
                  </div>
                )}
                {data.fd_deposit_amount && (
                  <div className="bg-[var(--card-bg)] rounded-card p-4">
                    <div className="text-helper text-[var(--text-muted)]">Deposit Amount</div>
                    <div className="text-body font-semibold text-[var(--success)]">{fmtAmt(data.fd_deposit_amount)}</div>
                  </div>
                )}
                {data.fd_tenure_months && (
                  <div className="bg-[var(--card-bg)] rounded-card p-4">
                    <div className="text-helper text-[var(--text-muted)]">Tenure</div>
                    <div className="text-body font-semibold text-[var(--text-primary)]">{data.fd_tenure_months} months</div>
                  </div>
                )}
                {data.fd_payout_frequency && (
                  <div className="bg-[var(--card-bg)] rounded-card p-4">
                    <div className="text-helper text-[var(--text-muted)]">Payout Frequency</div>
                    <div className="text-body font-semibold text-[var(--text-primary)]">{data.fd_payout_frequency}</div>
                  </div>
                )}
                {data.fd_total_rate_pa && (
                  <div className="bg-[var(--card-bg)] rounded-card p-4">
                    <div className="text-helper text-[var(--text-muted)]">Interest Rate</div>
                    <div className="text-body font-semibold text-[var(--success)]">{data.fd_total_rate_pa.toFixed(2)}% p.a.</div>
                  </div>
                )}
                {data.fd_maturity_amount && (
                  <div className="bg-[var(--card-bg)] rounded-card p-4">
                    <div className="text-helper text-[var(--text-muted)]">Maturity Amount</div>
                    <div className="text-lg font-semibold text-[var(--success)]">{fmtAmt(data.fd_maturity_amount)}</div>
                  </div>
                )}
                {data.fd_application_number && (
                  <div className="bg-[var(--card-bg)] rounded-card p-4">
                    <div className="text-helper text-[var(--text-muted)]">Application/FD Number</div>
                    <div className="text-body font-semibold text-[var(--text-primary)]">{data.fd_application_number}</div>
                  </div>
                )}
              </div>
            ) : null}
            
            {/* NCD/Bond-specific display (exclude FD headers) */}
            {(data.product_category === 'BOND' || data.product_category === 'NCD') ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.bond_issuer_name && (
                  <div className="bg-[var(--card-bg)] rounded-card p-4">
                    <div className="text-helper text-[var(--text-muted)]">Issuer</div>
                    <div className="text-body font-semibold text-[var(--text-primary)]">{data.bond_issuer_name} ({data.bond_issuer_type})</div>
                  </div>
                )}
                {data.bond_scheme_name && (
                  <div className="bg-[var(--card-bg)] rounded-card p-4">
                    <div className="text-helper text-[var(--text-muted)]">Scheme</div>
                    <div className="text-body font-semibold text-[var(--text-primary)]">{data.bond_scheme_name}</div>
                    {(data.bond_category || data.bond_sub_category) && (
                      <div className="text-caption text-[var(--text-muted)] mt-1">
                        {data.bond_category && <span>{data.bond_category}</span>}
                        {data.bond_category && data.bond_sub_category && <span className="mx-1">•</span>}
                        {data.bond_sub_category && <span>{data.bond_sub_category}</span>}
                      </div>
                    )}
                  </div>
                )}
                {data.bond_isin && (
                  <div className="bg-[var(--card-bg)] rounded-card p-4">
                    <div className="text-helper text-[var(--text-muted)]">ISIN</div>
                    <div className="text-body font-semibold text-[var(--text-primary)]">{data.bond_isin}</div>
                  </div>
                )}
                {data.bond_transaction_type && (
                  <div className="bg-[var(--card-bg)] rounded-card p-4">
                    <div className="text-helper text-[var(--text-muted)]">Transaction Type</div>
                    <div className="text-body font-semibold text-[var(--text-primary)]">{data.bond_transaction_type}</div>
                  </div>
                )}
                {data.bond_number_of_units && (
                  <div className="bg-[var(--card-bg)] rounded-card p-4">
                    <div className="text-helper text-[var(--text-muted)]">Number of Units</div>
                    <div className="text-body font-semibold text-[var(--text-primary)]">{data.bond_number_of_units}</div>
                  </div>
                )}
                {data.bond_investment_amount && (
                  <div className="bg-[var(--card-bg)] rounded-card p-4">
                    <div className="text-helper text-[var(--text-muted)]">Investment Amount</div>
                    <div className="text-body font-semibold text-[var(--success)]">{fmtAmt(data.bond_investment_amount)}</div>
                  </div>
                )}
                {data.bond_coupon_rate && (
                  <div className="bg-[var(--card-bg)] rounded-card p-4">
                    <div className="text-helper text-[var(--text-muted)]">Coupon Rate</div>
                    <div className="text-body font-semibold text-[var(--success)]">{data.bond_coupon_rate}% p.a.</div>
                  </div>
                )}
                {data.bond_face_value && (
                  <div className="bg-[var(--card-bg)] rounded-card p-4">
                    <div className="text-helper text-[var(--text-muted)]">Face Value</div>
                    <div className="text-body font-semibold text-[var(--text-primary)]">₹{data.bond_face_value}</div>
                  </div>
                )}
                {data.bond_transaction_date && (
                  <div className="bg-[var(--card-bg)] rounded-card p-4">
                    <div className="text-helper text-[var(--text-muted)]">Transaction Date</div>
                    <div className="text-body font-semibold text-[var(--text-primary)]">{fmtDate(data.bond_transaction_date)}</div>
                  </div>
                )}
                {data.bond_maturity_date && (
                  <div className="bg-[var(--card-bg)] rounded-card p-4">
                    <div className="text-helper text-[var(--text-muted)]">Maturity Date</div>
                    <div className="text-body font-semibold text-[var(--text-primary)]">{fmtDate(data.bond_maturity_date)}</div>
                  </div>
                )}
                {data.bond_application_number && (
                  <div className="bg-[var(--card-bg)] rounded-card p-4">
                    <div className="text-helper text-[var(--text-muted)]">Application Number</div>
                    <div className="text-body font-semibold text-[var(--text-primary)]">{data.bond_application_number}</div>
                  </div>
                )}
              </div>
            ) : data.product_category === 'MISC' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.service_name && (
                  <div className="bg-[var(--card-bg)] rounded-card p-4">
                    <div className="text-helper text-[var(--text-muted)]">Service Name</div>
                    <div className="text-body font-semibold text-[var(--text-primary)]">{data.service_name}</div>
                  </div>
                )}
                {data.service_price && (
                  <div className="bg-[var(--card-bg)] rounded-card p-4">
                    <div className="text-helper text-[var(--text-muted)]">Service Price</div>
                    <div className="text-body font-semibold text-[var(--success)]">{fmtAmt(data.service_price)}</div>
                  </div>
                )}
              </div>
            ) : data.product_category !== 'FD' && data.product_category !== 'BOND' && data.product_category !== 'INS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-[var(--card-bg)] rounded-card p-4">
                <div className="text-helper text-[var(--text-muted)]">Product Type</div>
                <div className="text-body font-semibold text-[var(--text-primary)]">{getProductTypeLabel(data.product_category)}</div>
              </div>
              
              {data.transaction_type && (
                <div className="bg-[var(--card-bg)] rounded-card p-4">
                  <div className="text-helper text-[var(--text-muted)]">Transaction Type</div>
                  <div className="text-body font-semibold text-[var(--text-primary)]">{data.transaction_type}</div>
                </div>
              )}
              
              <div className="bg-[var(--card-bg)] rounded-card p-4">
                <div className="text-helper text-[var(--text-muted)]">Transaction</div>
                <div className="text-body font-semibold text-[var(--text-primary)]">{data.txn_type || 'Fresh'}</div>
              </div>
              
              {/* Only show mode for MF products */}
              {data.product_category === 'MF' && (
                <div className="bg-[var(--card-bg)] rounded-card p-4">
                  <div className="text-helper text-[var(--text-muted)]">Mode</div>
                  <div className="text-body font-semibold text-[var(--text-primary)]">{data.mode || 'Lump Sum'}</div>
                </div>
              )}
              
              {data.investment_amount && (
                <div className="bg-[var(--card-bg)] rounded-card p-4">
                  <div className="text-helper text-[var(--text-muted)]">Amount</div>
                  <div className="text-body font-semibold text-[var(--success)]">{fmtAmt(data.investment_amount)}</div>
                </div>
              )}
              
              {data.folio_policy_no && (
                <div className="bg-[var(--card-bg)] rounded-card p-4">
                  <div className="text-helper text-[var(--text-muted)]">Folio/Policy No</div>
                  <div className="text-body font-semibold text-[var(--text-primary)]">{data.folio_policy_no}</div>
                </div>
              )}
            </div>
            )}
            
            {/* Insurance Details Section */}
            {data.product_category === 'INS' && (
              <div className="mt-4 p-4 bg-[var(--dashboard-primary)]/10 rounded-lg border border-[var(--dashboard-primary)]/30">
                <h4 className="text-body font-semibold text-[var(--text-primary)] mb-3 flex items-center">
                  <span className="w-2 h-2 bg-[var(--dashboard-primary)] rounded-full mr-2"></span>
                  Insurance Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.issuerCompany && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Issuer Company</div>
                      <div className="font-semibold text-[var(--text-primary)]">{data.issuerCompany}</div>
                    </div>
                  )}
                  {data.issuerCategory && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Category</div>
                      <div className="font-semibold text-[var(--text-primary)]">{data.issuerCategory}</div>
                    </div>
                  )}
                  {data.schemeName && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Product Name</div>
                      <div className="font-semibold text-[var(--text-primary)]">{data.schemeName}</div>
                    </div>
                  )}
                  {data.investment_amount && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Premium Amount</div>
                      <div className="font-semibold text-[var(--success)]">{fmtAmt(data.investment_amount)}</div>
                    </div>
                  )}
                  {data.folioPolicyNo && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Policy Number</div>
                      <div className="font-semibold text-[var(--text-primary)]">{data.folioPolicyNo}</div>
                    </div>
                  )}
                  {data.folio_policy_no && !data.folioPolicyNo && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Policy Number</div>
                      <div className="font-semibold text-[var(--text-primary)]">{data.folio_policy_no}</div>
                    </div>
                  )}
                  {data.insurance_date_of_issue && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Date of Issue</div>
                      <div className="font-semibold text-[var(--text-primary)]">{fmtDate(data.insurance_date_of_issue)}</div>
                    </div>
                  )}
                  {data.insurance_renewal_date && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Renewal Date</div>
                      <div className="font-semibold text-[var(--text-primary)]">{fmtDate(data.insurance_renewal_date)}</div>
                    </div>
                  )}
                  {data.insurance_sum_assured && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Sum Assured</div>
                      <div className="font-semibold text-[var(--success)]">{fmtAmt(data.insurance_sum_assured)}</div>
                    </div>
                  )}
                  {data.insurance_term && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Term</div>
                      <div className="font-semibold text-[var(--text-primary)]">{data.insurance_term} years</div>
                    </div>
                  )}
                  {(data.insurance_premium_payment_term != null || data.insurance_premium_pay_term) && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Premium payment term (PPT)</div>
                      <div className="font-semibold text-[var(--text-primary)]">
                        {typeof data.insurance_premium_payment_term === 'string'
                          ? data.insurance_premium_payment_term
                          : (data.insurance_premium_payment_term ?? data.insurance_premium_pay_term) + ' years'}
                      </div>
                    </div>
                  )}
                  {data.insurance_payment_schedule && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Payment Schedule</div>
                      <div className="font-semibold text-[var(--text-primary)]">{data.insurance_payment_schedule}</div>
                    </div>
                  )}
                  {data.insurance_money_back !== undefined && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Money Back</div>
                      <div className="font-semibold text-[var(--text-primary)]">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          data.insurance_money_back 
                            ? 'bg-[var(--success-muted)] text-[var(--success)]' 
                            : 'bg-[var(--dashboard-border)]/50 text-[var(--dashboard-text)]'
                        }`}>
                          {data.insurance_money_back ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  )}
                  {data.insurance_selected_riders_details && Array.isArray(data.insurance_selected_riders_details) && data.insurance_selected_riders_details.length > 0 && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4 md:col-span-2">
                      <div className="text-helper text-[var(--text-muted)] mb-2">Selected Riders</div>
                      <div className="space-y-2">
                        {data.insurance_selected_riders_details.map((rider, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-[var(--dashboard-bg)] rounded-lg">
                            <span className="text-sm font-medium text-[var(--dashboard-text)]">
                              {rider.name || rider.rider_name || `Rider ID: ${rider.id || rider.rider_id}`}
                            </span>
                            <span className="text-caption text-[var(--success)] font-semibold">
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
                    <div className="bg-[var(--card-bg)] rounded-card p-4 md:col-span-2">
                      <div className="text-helper text-[var(--text-muted)] mb-2">Selected Riders</div>
                      <div className="flex flex-wrap gap-2">
                        {data.insurance_selected_riders.map((riderId, index) => (
                          <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--dashboard-primary)]/15 text-[var(--dashboard-primary)]">
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
                  <div className="mt-4 p-4 bg-[var(--dashboard-primary)]/10 rounded-lg border border-[var(--dashboard-primary)]/30">
                    <h4 className="text-body font-semibold text-[var(--text-primary)] mb-3 flex items-center">
                      <span className="w-2 h-2 bg-[var(--dashboard-primary)] rounded-full mr-2"></span>
                      Mutual Fund Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.amc_name && (
                        <div className="bg-[var(--card-bg)] rounded-card p-4">
                          <div className="text-helper text-[var(--text-muted)]">AMC</div>
                          <div className="font-semibold text-[var(--text-primary)]">{data.amc_name}</div>
                        </div>
                      )}
                      {data.scheme_name && (
                        <div className="bg-[var(--card-bg)] rounded-card p-4">
                          <div className="text-helper text-[var(--text-muted)]">Scheme</div>
                          <div className="font-semibold text-[var(--text-primary)]">{data.scheme_name} {data.scheme_is_nfo && <span className="text-xs bg-yellow-100 dark:text-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded ml-2">NFO</span>}</div>
                        </div>
                      )}
                      {data.mf_amc_category && data.mf_amc_category !== 'MF' && (
                        <div className="bg-[var(--card-bg)] rounded-card p-4">
                          <div className="text-helper text-[var(--text-muted)]">AMC Category</div>
                          <div className="font-semibold text-[var(--text-primary)]">
                            {data.mf_amc_category}
                            {data.mf_amc_category_min_investment != null && (
                              <span className="text-helper text-[var(--text-muted)] ml-2">– Min Investment: {formatMinInvestment(Number(data.mf_amc_category_min_investment))}</span>
                            )}
                          </div>
                        </div>
                      )}
                      {data.scheme_category && (
                        <div className="bg-[var(--card-bg)] rounded-card p-4">
                          <div className="text-helper text-[var(--text-muted)]">Category</div>
                          <div className="font-semibold text-[var(--text-primary)]">{data.scheme_category} - {data.scheme_sub_category}</div>
                        </div>
                      )}
                      {(data.scheme_plan || data.scheme_option || data.scheme_type) && (
                        <div className="bg-[var(--card-bg)] rounded-card p-4">
                          <div className="text-helper text-[var(--text-muted)]">Plan, Option & Type</div>
                          <div className="font-semibold text-[var(--text-primary)]">
                            {data.scheme_plan && <span>{data.scheme_plan}</span>}
                            {data.scheme_option && (
                              <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                data.scheme_option === 'GROWTH' ? 'bg-[var(--success-muted)] text-[var(--success)]' :
                                data.scheme_option === 'IDCW_PAYOUT' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                                'bg-[var(--dashboard-primary)]/15 text-[var(--dashboard-primary)]'
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
                        <div className="bg-[var(--card-bg)] rounded-card p-4">
                          <div className="text-helper text-[var(--text-muted)]">Folio Number</div>
                          <div className="font-semibold text-[var(--text-primary)]">{data.folio_number}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            
            {data.product_category === 'MF' && !data.transaction_type && data.fd_issuer_name && (
                <div className="mt-4 p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg border border-purple-300 dark:border-purple-800">
                  <h4 className="text-body font-semibold text-[var(--text-primary)] mb-3 flex items-center">
                    <span className="w-2 h-2 bg-purple-600 rounded-full mr-2"></span>
                    Fixed Deposit Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.fd_issuer_name && (
                      <div className="bg-[var(--card-bg)] rounded-card p-4">
                        <div className="text-helper text-[var(--text-muted)]">Issuer</div>
                        <div className="font-semibold text-[var(--text-primary)]">{data.fd_issuer_name} ({data.fd_issuer_type})</div>
                      </div>
                    )}
                    {data.fd_scheme_name && (
                      <div className="bg-[var(--card-bg)] rounded-card p-4">
                        <div className="text-helper text-[var(--text-muted)]">Scheme</div>
                        <div className="font-semibold text-[var(--text-primary)]">{data.fd_scheme_name}</div>
                        {data.fd_is_cumulative && <span className="text-caption bg-[var(--success-muted)] text-[var(--success)] px-2 py-1 rounded-pill ml-2">Cumulative</span>}
                      </div>
                    )}
                    {data.fd_deposit_amount && (
                      <div className="bg-[var(--card-bg)] rounded-card p-4">
                        <div className="text-helper text-[var(--text-muted)]">Deposit Amount</div>
                        <div className="font-semibold text-[var(--success)]">{fmtAmt(data.fd_deposit_amount)}</div>
                      </div>
                    )}
                    {data.fd_tenure_months && (
                      <div className="bg-[var(--card-bg)] rounded-card p-4">
                        <div className="text-helper text-[var(--text-muted)]">Tenure</div>
                        <div className="font-semibold text-[var(--text-primary)]">{data.fd_tenure_months} months ({Math.floor(data.fd_tenure_months/12)} years)</div>
                      </div>
                    )}
                    {data.fd_payout_frequency && (
                      <div className="bg-[var(--card-bg)] rounded-card p-4">
                        <div className="text-helper text-[var(--text-muted)]">Payout Frequency</div>
                        <div className="font-semibold text-[var(--text-primary)]">{data.fd_payout_frequency}</div>
                      </div>
                    )}
                    {data.fd_total_rate_pa && (
                      <div className="bg-[var(--card-bg)] rounded-card p-4">
                        <div className="text-helper text-[var(--text-muted)]">Interest Rate</div>
                        <div className="font-semibold text-[var(--success)]">{data.fd_total_rate_pa.toFixed(2)}% p.a.</div>
                      </div>
                    )}
                    {data.fd_maturity_amount && (
                      <div className="bg-[var(--card-bg)] rounded-card p-4">
                        <div className="text-helper text-[var(--text-muted)]">Maturity Amount</div>
                        <div className="font-semibold text-[var(--success)]">{fmtAmt(data.fd_maturity_amount)}</div>
                      </div>
                    )}
                    {data.fd_maturity_date && (
                      <div className="bg-[var(--card-bg)] rounded-card p-4">
                        <div className="text-helper text-[var(--text-muted)]">Maturity Date</div>
                        <div className="font-semibold text-[var(--text-primary)]">{fmtDate(data.fd_maturity_date)}</div>
                      </div>
                    )}
                    {data.fd_application_number && (
                      <div className="bg-[var(--card-bg)] rounded-card p-4">
                        <div className="text-helper text-[var(--text-muted)]">Application/FD Number</div>
                        <div className="font-semibold text-[var(--text-primary)]">{data.fd_application_number}</div>
                      </div>
                    )}
                    {data.fd_tds_applicable && (
                      <div className="bg-[var(--card-bg)] rounded-card p-4">
                        <div className="text-helper text-[var(--text-muted)]">TDS</div>
                        <div className="font-semibold text-[var(--text-primary)]">{data.fd_form_15g_15h ? 'Form 15G/15H Submitted' : 'Applicable'}</div>
                      </div>
                    )}
                  </div>
                </div>
            )}
            
            {/* NCD/Bond Details Section */}
            {data.product_category === 'BOND' && (
              <div className="mt-4 p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg border border-purple-300 dark:border-purple-800">
                <h4 className="text-body font-semibold text-[var(--text-primary)] mb-3 flex items-center">
                  <span className="w-2 h-2 bg-purple-600 rounded-full mr-2"></span>
                  NCD/Bond Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.bond_issuer_name && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Issuer</div>
                      <div className="font-semibold text-[var(--text-primary)]">{data.bond_issuer_name} ({data.bond_issuer_type})</div>
                    </div>
                  )}
                  {data.bond_scheme_name && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Scheme Name</div>
                      <div className="font-semibold text-[var(--text-primary)]">{data.bond_scheme_name}</div>
                      {(data.bond_category || data.bond_sub_category) && (
                        <div className="text-caption text-[var(--text-muted)] mt-1">
                          {data.bond_category && <span>{data.bond_category}</span>}
                          {data.bond_category && data.bond_sub_category && <span className="mx-1">•</span>}
                          {data.bond_sub_category && <span>{data.bond_sub_category}</span>}
                        </div>
                      )}
                    </div>
                  )}
                  {data.bond_isin && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">ISIN</div>
                      <div className="font-semibold text-[var(--text-primary)]">{data.bond_isin}</div>
                    </div>
                  )}
                  {data.bond_coupon_rate && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Coupon Rate</div>
                      <div className="font-semibold text-[var(--success)]">{data.bond_coupon_rate}% p.a.</div>
                    </div>
                  )}
                  {data.bond_face_value && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Face Value</div>
                      <div className="font-semibold text-[var(--text-primary)]">₹{data.bond_face_value}</div>
                    </div>
                  )}
                  {data.bond_issue_date && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Issue Date</div>
                      <div className="font-semibold text-[var(--text-primary)]">{fmtDate(data.bond_issue_date)}</div>
                    </div>
                  )}
                  {data.bond_maturity_date && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Maturity Date</div>
                      <div className="font-semibold text-[var(--text-primary)]">{fmtDate(data.bond_maturity_date)}</div>
                    </div>
                  )}
                  {data.bond_transaction_type && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Transaction Type</div>
                      <div className="font-semibold text-[var(--text-primary)]">{data.bond_transaction_type}</div>
                    </div>
                  )}
                  {data.bond_number_of_units && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Number of Units</div>
                      <div className="font-semibold text-[var(--text-primary)]">{data.bond_number_of_units}</div>
                    </div>
                  )}
                  {data.bond_investment_amount && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Investment Amount</div>
                      <div className="font-semibold text-[var(--success)]">{fmtAmt(data.bond_investment_amount)}</div>
                    </div>
                  )}
                  {data.bond_transaction_date && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Transaction Date</div>
                      <div className="font-semibold text-[var(--text-primary)]">{fmtDate(data.bond_transaction_date)}</div>
                    </div>
                  )}
                  {data.bond_application_number && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Application Number</div>
                      <div className="font-semibold text-[var(--text-primary)]">{data.bond_application_number}</div>
                    </div>
                  )}
                  {data.bond_form_15g_15h !== undefined && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">TDS</div>
                      <div className="font-semibold text-[var(--text-primary)]">{data.bond_form_15g_15h ? 'Form 15G/15H Submitted' : 'Applicable'}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Transaction Details (MF only - SIP, SWP, STP, Switch) */}
            {data.product_category === 'MF' && data.transaction_type && (
              <div className="mt-4 p-4 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-300 dark:border-green-800">
                <h4 className="text-body font-semibold text-[var(--text-primary)] mb-3 flex items-center">
                  <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                  Transaction Details: {data.transaction_type}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.sip_frequency && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">SIP Frequency</div>
                      <div className="font-semibold text-[var(--text-primary)]">{data.sip_frequency}</div>
                    </div>
                  )}
                  {data.sip_start_date && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Start Date</div>
                      <div className="font-semibold text-[var(--text-primary)]">{fmtDate(data.sip_start_date)}</div>
                    </div>
                  )}
                  {data.sip_end_date && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">End Date</div>
                      <div className="font-semibold text-[var(--text-primary)]">{fmtDate(data.sip_end_date)}</div>
                    </div>
                  )}
                  {data.sip_is_perpetual && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Type</div>
                      <div className="font-semibold text-[var(--text-primary)]">Perpetual (40 years)</div>
                    </div>
                  )}
                  {data.swp_frequency && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">SWP Frequency</div>
                      <div className="font-semibold text-[var(--text-primary)]">{data.swp_frequency}</div>
                    </div>
                  )}
                  {data.swp_start_date && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Start Date</div>
                      <div className="font-semibold text-[var(--text-primary)]">{fmtDate(data.swp_start_date)}</div>
                    </div>
                  )}
                  {data.swp_amount && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Withdrawal Amount</div>
                      <div className="font-semibold text-[var(--success)]">{fmtAmt(data.swp_amount)}</div>
                    </div>
                  )}
                  {data.stp_target_scheme_name && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Transfer to Scheme</div>
                      <div className="font-semibold text-[var(--text-primary)]">{data.stp_target_scheme_name}</div>
                    </div>
                  )}
                  {data.stp_frequency && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">STP Frequency</div>
                      <div className="font-semibold text-[var(--text-primary)]">{data.stp_frequency}</div>
                    </div>
                  )}
                  {data.stp_start_date && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Start Date</div>
                      <div className="font-semibold text-[var(--text-primary)]">{fmtDate(data.stp_start_date)}</div>
                    </div>
                  )}
                  {data.stp_amount && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Transfer Amount</div>
                      <div className="font-semibold text-[var(--success)]">{fmtAmt(data.stp_amount)}</div>
                    </div>
                  )}
                  {data.switch_to_scheme_name && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Switch to Scheme</div>
                      <div className="font-semibold text-[var(--text-primary)]">{data.switch_to_scheme_name}</div>
                    </div>
                  )}
                  {data.switch_type && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Switch Type</div>
                      <div className="font-semibold text-[var(--text-primary)]">{data.switch_type}</div>
                    </div>
                  )}
                  {data.switch_value && (
                    <div className="bg-[var(--card-bg)] rounded-card p-4">
                      <div className="text-helper text-[var(--text-muted)]">Switch Value</div>
                      <div className="font-semibold text-[var(--success)]">{data.switch_type === 'Amount' ? fmtAmt(data.switch_value) : `${data.switch_value} units`}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Transaction Type */}
          <div className="bg-[var(--dashboard-bg)] rounded-xl p-4">
            <h3 className="text-body font-semibold text-[var(--text-primary)] mb-3 flex items-center">
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
                    : 'border-[var(--dashboard-border)] hover:border-[var(--success)]/50'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">💻</div>
                  <div className="font-semibold text-[var(--text-primary)]">Online</div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setTransactionType('Offline')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  transactionType === 'Offline'
                    ? 'border-[var(--dashboard-primary)] bg-[var(--dashboard-primary)]/10'
                    : 'border-[var(--dashboard-border)] hover:border-[var(--dashboard-primary)]/50'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">🏦</div>
                  <div className="font-semibold text-[var(--text-primary)]">Offline</div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setTransactionType('Others')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  transactionType === 'Others'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-[var(--dashboard-border)] hover:border-purple-400'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">📝</div>
                  <div className="font-semibold text-[var(--text-primary)]">Others</div>
                </div>
              </button>
            </div>

            {/* Online Transaction Details */}
            {transactionType === 'Online' && (
              <div className="bg-[var(--card-bg)] rounded-card p-4">
                <label className="block text-sm font-medium text-[var(--dashboard-text)] mb-2">
                  Transaction Number *
                </label>
                <input
                  type="text"
                  value={onlineTransactionNumber}
                  onChange={(e) => setOnlineTransactionNumber(e.target.value)}
                  placeholder="Enter transaction number"
                  className="w-full px-3 py-2 border border-[var(--dashboard-border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Offline Transaction Details */}
            {transactionType === 'Offline' && (
              <div className="bg-[var(--card-bg)] rounded-card p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--dashboard-text)] mb-2">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      value={offlineDetails.bankName}
                      onChange={(e) => setOfflineDetails({...offlineDetails, bankName: e.target.value})}
                      placeholder="Enter bank name"
                      className="w-full px-3 py-2 border border-[var(--dashboard-border)] rounded-lg focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[var(--dashboard-text)] mb-2">
                      Cheque Number *
                    </label>
                    <input
                      type="text"
                      value={offlineDetails.chequeNumber}
                      onChange={(e) => setOfflineDetails({...offlineDetails, chequeNumber: e.target.value})}
                      placeholder="Enter cheque number"
                      className="w-full px-3 py-2 border border-[var(--dashboard-border)] rounded-lg focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[var(--dashboard-text)] mb-2">
                      Cheque Date *
                    </label>
                    <DatePickerInput
                      value={offlineDetails.chequeDate}
                      onChange={(v) => setOfflineDetails({ ...offlineDetails, chequeDate: v })}
                      inputClassName="w-full px-3 py-2 border border-[var(--dashboard-border)] rounded-lg focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-transparent"
                      ariaLabel="Cheque date"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[var(--dashboard-text)] mb-2">
                      Branch *
                    </label>
                    <input
                      type="text"
                      value={offlineDetails.branch}
                      onChange={(e) => setOfflineDetails({...offlineDetails, branch: e.target.value})}
                      placeholder="Enter branch"
                      className="w-full px-3 py-2 border border-[var(--dashboard-border)] rounded-lg focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Others Transaction Details */}
            {transactionType === 'Others' && (
              <div className="bg-[var(--card-bg)] rounded-card p-4">
                <label className="block text-sm font-medium text-[var(--dashboard-text)] mb-2">
                  Transaction Type * (e.g., RTGS, NEFT, etc.)
                </label>
                <input
                  type="text"
                  value={othersTransactionType}
                  onChange={(e) => setOthersTransactionType(e.target.value)}
                  placeholder="Enter transaction type (e.g., RTGS, NEFT, IMPS, etc.)"
                  className="w-full px-3 py-2 border border-[var(--dashboard-border)] rounded-lg focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-transparent"
                />
                <p className="text-xs text-[var(--dashboard-muted)] mt-2">
                  Specify the transaction type or payment method used
                </p>
              </div>
            )}
          </div>


          {/* Supporting Document(s) */}
          <div className="bg-[var(--card-bg)] rounded-card border border-[var(--stroke)] p-4">
            <h3 className="text-card-title text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              Supporting document(s)
              <span className="text-helper text-[var(--error)] font-normal">(required)</span>
            </h3>
            {docs.length === 0 ? (
              <div className="border-2 border-dashed border-[var(--stroke)] rounded-card p-6 text-center hover:border-[var(--accent)]/50 transition-colors">
                <FiUpload className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-body text-[var(--text-secondary)] mb-2">
                  Upload photo proof or supporting document
                </p>
                <p className="text-helper text-[var(--text-muted)] mb-4">
                  JPEG, PNG, GIF, PDF — max 5MB each
                </p>
                <label className="inline-flex items-center gap-2 rounded-pill px-4 py-2.5 border border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)] font-semibold text-body hover:bg-[var(--accent)]/10 focus-within:ring-2 focus-within:ring-[var(--ring)] focus-within:ring-offset-2 cursor-pointer transition-colors">
                  <FiUpload className="w-4 h-4" />
                  Choose file
                  <input type="file" accept="image/*,.pdf" multiple onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                {docs.map((file, index) => (
                  <div key={index} className="flex items-center justify-between gap-3 p-3 rounded-card border border-[var(--stroke)] bg-[var(--card-bg-opaque)]">
                    <div className="flex items-center min-w-0 flex-1 gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-card bg-[var(--card-hover)] flex-shrink-0">
                        <FiFile className="w-5 h-5 text-[var(--text-muted)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-body font-medium text-[var(--text-primary)] truncate" title={file.name}>{file.name}</p>
                        <p className="text-helper text-[var(--text-muted)]">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-[var(--error)] hover:bg-[var(--error-muted)]"
                      onClick={() => removeDocument(index)}
                    >
                      <FiTrash2 className="w-4 h-4" /> Remove
                    </Button>
                  </div>
                ))}
                <label className="inline-flex items-center gap-2 rounded-pill px-4 py-2 border border-dashed border-[var(--stroke)] text-[var(--text-secondary)] font-medium text-body hover:bg-[var(--card-hover)] hover:border-[var(--accent)]/50 cursor-pointer transition-colors">
                  <FiPlus className="w-4 h-4" />
                  Add another
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
        <div className="p-4 rounded-card border border-[var(--success)]/40 bg-[var(--success-muted)] text-[var(--success)]">
          <div className="flex items-center">
            <FiCheck className="w-5 h-5 mr-2" />
            <span className="font-medium">Success:</span>
            <span className="ml-1">{saveSuccess}</span>
          </div>
        </div>
      )}
      
      {saveError && (
        <div className="p-4 rounded-card border border-[var(--error)]/40 bg-[var(--error-muted)] text-[var(--error)]">
          <div className="flex items-center">
            <FiAlertCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">Error:</span>
            <span className="ml-1">{saveError}</span>
          </div>
        </div>
      )}
      
      <div className="flex flex-wrap gap-3 justify-center">
        <button type="button" className="receipt-step-ghost-btn px-4 py-2.5 text-sm font-medium" onClick={onBack} disabled={isSaving}>
          Back
        </button>
        <button
          type="button"
          onClick={handleSavePreset}
          disabled={isSaving || !onSavePreset}
          className="px-4 py-2.5 text-sm font-medium rounded-xl border border-[var(--warn)]/50 text-[var(--warn)] hover:bg-[var(--warn-muted)]"
        >
          Save preset
        </button>
        <button type="button" className="receipt-step-primary-btn px-4 py-2.5 text-sm flex items-center gap-2" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <FiRefreshCw className="w-4 h-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save receipt'
          )}
        </button>
      </div>
    </div>
  )
}

export default StepFinal

