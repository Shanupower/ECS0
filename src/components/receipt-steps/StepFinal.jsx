import React, { useState } from 'react'
import { FiUpload, FiFile, FiTrash2, FiCheck, FiAlertCircle, FiRefreshCw } from 'react-icons/fi'

function StepFinal({ data, onBack, onSave, isSaving, saveError, saveSuccess, supportingDocument, setSupportingDocument }) {
  const [transactionType, setTransactionType] = useState('')
  const [offlineDetails, setOfflineDetails] = useState({
    bankName: '',
    chequeNumber: '',
    chequeDate: '',
    branch: ''
  })
  const [onlineTransactionNumber, setOnlineTransactionNumber] = useState('')

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      
      // Check file type (images and PDFs)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload an image (JPEG, PNG, GIF) or PDF file')
        return
      }
      
      setSupportingDocument(file)
    }
  }

  const removeDocument = () => {
    setSupportingDocument(null)
  }

  const handleSave = () => {
    // Validate transaction type
    if (!transactionType) {
      alert('Please select transaction type (Online/Offline)')
      return
    }
    
    // Validate transaction details
    if (transactionType === 'Offline') {
      if (!offlineDetails.bankName || !offlineDetails.chequeNumber || !offlineDetails.chequeDate || !offlineDetails.branch) {
        alert('Please fill all offline transaction details (Bank Name, Cheque Number, Cheque Date, Branch)')
        return
      }
    } else if (transactionType === 'Online') {
      if (!onlineTransactionNumber || onlineTransactionNumber.trim() === '') {
        alert('Please enter transaction number')
        return
      }
    }
    
    // Validate product-specific details
    if (data.productType === 'FD') {
      // Validate FD fields from data
      if (!data.fd_issuer_name || !data.fd_scheme_name || !data.fd_deposit_amount || 
          !data.fd_tenure_months || !data.fd_payout_frequency || !data.fd_application_number) {
        alert('Please fill all Fixed Deposit details')
        return
      }
      if (parseFloat(data.fd_deposit_amount) <= 0) {
        alert('Deposit amount must be a positive number')
        return
      }
      if (!data.fd_locked_interest_rate_pa || parseFloat(data.fd_locked_interest_rate_pa) <= 0) {
        alert('Interest rate must be calculated')
        return
      }
    } else if (data.productType === 'MF') {
      // Validate Mutual Fund required fields from data
      // Check both snake_case (new MF flow) and camelCase (legacy)
      if (!data.scheme_name && !data.schemeName) {
        alert('Scheme name is required for Mutual Funds')
        return
      }
      // Check both camelCase and snake_case for investment amount
      const investmentAmt = data.investmentAmount || data.investment_amount
      if (!investmentAmt || parseFloat(investmentAmt) <= 0) {
        alert('Investment amount must be a positive number')
        return
      }
    } else if (data.productType === 'INS') {
      // Validate Insurance required fields from data
      if (!data.issuerCompany) {
        alert('Insurance company is required')
        return
      }
      const premiumAmt = data.investmentAmount || data.investment_amount
      if (!premiumAmt || parseFloat(premiumAmt) <= 0) {
        alert('Premium amount must be a positive number')
        return
      }
    } else if (data.productType === 'BOND') {
      // Validate Bonds required fields from data
      if (!data.issuerCompany) {
        alert('Issuer company is required for Bonds')
        return
      }
      const bondAmt = data.investmentAmount || data.investment_amount
      if (!bondAmt || parseFloat(bondAmt) <= 0) {
        alert('Investment amount must be a positive number')
        return
      }
    }
    
    // Validate supporting document
    if (!supportingDocument) {
      alert('Please upload a supporting document (screenshot or PDF)')
      return
    }
    
    // Merge additional data
    const finalData = {
      ...data,
      transactionType,
      ...(transactionType === 'Offline' ? offlineDetails : {}),
      ...(transactionType === 'Online' ? { transactionNumber: onlineTransactionNumber } : {})
    }
    
    onSave(finalData)
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
      default: return type;
    }
  }

  return (
    <div className="space-y-6">
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
              <div className="text-lg font-bold">{data.receiptNo}</div>
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
                  <span className="font-medium text-gray-900 dark:text-gray-100">{data.employeeName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Code:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{data.empCode || '—'}</span>
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
                  <span className="font-medium text-gray-900 dark:text-gray-100">{data.investorId || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Name:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{data.investorName || '—'}</span>
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
            {data.productType === 'FD' ? (
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
            {data.productType !== 'FD' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">Product Type</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{getProductTypeLabel(data.productType)}</div>
              </div>
              
              {data.investmentType && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Investment Type</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.investmentType}</div>
                </div>
              )}
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">Transaction</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.txnType || 'Fresh'}</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">Mode</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.mode || 'Lump Sum'}</div>
              </div>
              
              {data.investmentAmount && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Amount</div>
                  <div className="text-lg font-semibold text-green-600 dark:text-green-400">{fmtAmt(data.investmentAmount)}</div>
                </div>
              )}
              
              {data.folioPolicyNo && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Folio/Policy No</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.folioPolicyNo}</div>
                </div>
              )}
            </div>
            )}

            {/* Product-specific details */}
            {data.productType === 'MF' && data.amc_name && (
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
            
            {data.productType === 'MF' && !data.transaction_type && data.fd_issuer_name && (
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
            
            {/* Transaction Details (non-FD only) */}
            {data.productType !== 'FD' && data.transaction_type && (
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
          </div>


          {/* Supporting Document */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
              <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
              Supporting Document *
            </h3>
        
        {!supportingDocument ? (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
            <FiUpload className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Upload photo proof or supporting document
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
              Supported formats: JPEG, PNG, GIF, PDF (Max 5MB)
            </p>
                <label className="inline-flex items-center px-4 py-2 border border-blue-300 dark:border-blue-600 text-sm font-semibold rounded-lg text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
              <FiUpload className="w-4 h-4 mr-2" />
              Choose File
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        ) : (
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
            <div className="flex items-center">
              <FiFile className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {supportingDocument.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(supportingDocument.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={removeDocument}
              className="inline-flex items-center px-3 py-1.5 border border-red-300 dark:border-red-600 text-xs font-semibold rounded-lg text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/40 hover:bg-red-100 dark:hover:bg-red-900/60 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-all duration-200"
            >
              <FiTrash2 className="w-3 h-3 mr-1" />
              Remove
            </button>
          </div>
        )}
      </div>
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

