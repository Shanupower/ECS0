import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiPrinter, FiDownload, FiFile, FiImage, FiEye, FiShield, FiChevronDown } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { useAppConfig } from '../context/AppConfigContext'
import { api } from '../api'
import { getCategoryDisplayName, getReceiptProductCategoryLabel } from '../utils/categoryMapping'
import { normalizeReceiptFields } from '../utils/receiptNormalizer'
import RelatedTasks from './tasks/RelatedTasks'
import { useToast } from '../components/ui'
import {
  ReceiptActionBar,
  TeamPickerModal,
  RejectModal,
  HistoryTimeline,
  AdminOverrideModal,
  SubmitForApprovalModal,
  CompleteApprovalModal,
} from '../components/receipt-approval'

export default function ReceiptViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const cfg = useAppConfig()
  const toast = useToast()
  const [receipt, setReceipt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mediaFiles, setMediaFiles] = useState([])
  const [loadingMedia, setLoadingMedia] = useState(false)

  // Approval workflow state
  const approvalFlagOn = !!cfg?.feature_flags?.receipts_approval_v2
  const [history, setHistory] = useState(null)
  const [teams, setTeams] = useState([])
  const [approvalBusy, setApprovalBusy] = useState(false)
  const [showRouteModal, setShowRouteModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showLegacyAdmin, setShowLegacyAdmin] = useState(false)
  const formatDateDisplay = (value) => {
    if (!value) return '—'
    const raw = String(value).trim()
    let date
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [y, m, d] = raw.split('-').map(Number)
      date = new Date(y, m - 1, d)
    } else {
      date = new Date(raw)
    }
    if (Number.isNaN(date.getTime())) return '—'
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

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
      
      // Normalize receipt fields for backward compatibility
      const normalizedReceipt = normalizeReceiptFields(receiptData)
      setReceipt(normalizedReceipt)
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

  // -------------------------------------------------------------------------
  // Approval workflow: load history + teams, actions
  // -------------------------------------------------------------------------

  const loadHistory = async () => {
    if (!token || !id || !approvalFlagOn) return
    try {
      const h = await api.getReceiptApprovalHistory(token, id)
      setHistory(h)
    } catch (err) {
      // 404 or flag off server-side — silently ignore so legacy receipts still show
      console.warn('Approval history load failed:', err?.message || err)
      setHistory(null)
    }
  }

  const loadTeams = async () => {
    if (!token || !approvalFlagOn) return
    try {
      const list = await api.listTeams(token)
      setTeams(Array.isArray(list) ? list : [])
    } catch { setTeams([]) }
  }

  useEffect(() => { loadHistory(); loadTeams() /* eslint-disable-next-line */ }, [token, id, approvalFlagOn])

  const currentTeamFull = useMemo(() => {
    const tid = history?.current_team?.id || receipt?.current_team_id
    if (!tid) return null
    return teams.find((t) => String(t.id || t._key) === String(tid)) || history?.current_team || null
  }, [history, receipt, teams])

  const myUserId = user?.id ?? user?._key ?? user?.sub ?? null
  const isCreator = !!receipt && !!user && (
    (myUserId != null && String(receipt.user_id) === String(myUserId)) ||
    (receipt.emp_code && user.emp_code && String(receipt.emp_code) === String(user.emp_code))
  )
  const isAdminRole = user?.role === 'admin'
  const canActOnCurrentTeam = !!currentTeamFull && Array.isArray(currentTeamFull.member_ids) && myUserId != null && (
    currentTeamFull.member_ids.some((m) => String(m) === String(myUserId))
  )

  const runAction = async (fn, successMsg) => {
    setApprovalBusy(true)
    try {
      await fn()
      if (successMsg) toast.success(successMsg)
      await Promise.all([loadReceipt(), loadHistory()])
    } catch (err) {
      toast.error(err.message || 'Action failed')
    } finally { setApprovalBusy(false) }
  }

  // Upload optional evidence files first, tagged with the current cycle/team
  // and the stage we're transitioning through. The returned file IDs are
  // persisted on the history entry the engine writes for this action.
  const uploadEvidence = async (files, uploadedDuring) => {
    if (!files || !files.length) return []
    const currentTid = history?.current_team?.id || receipt?.current_team_id || null
    const currentTname = currentTeamFull?.name || history?.current_team?.name || null
    return api.uploadApprovalEvidence(token, id, files, {
      cycleId: history?.approval_cycle_id || receipt?.approval_cycle_id || null,
      teamId: currentTid,
      teamName: currentTname,
      uploadedDuring
    })
  }

  const handleSubmit = async (comment, files) => {
    const ids = await uploadEvidence(files, 'submit')
    await runAction(() => api.submitReceipt(token, id, ids), 'Submitted for approval')
    setShowSubmitModal(false)
  }
  const handleComplete = async (comment, files) => {
    const ids = await uploadEvidence(files, 'complete')
    await runAction(() => api.completeReceipt(token, id, comment, ids), 'Approved & completed')
    setShowCompleteModal(false)
  }
  const handleRoute = async (nextTeamId, comment, files) => {
    const ids = await uploadEvidence(files, 'route')
    await runAction(
      () => api.routeReceipt(token, id, nextTeamId, comment, ids),
      'Approved & routed'
    )
    setShowRouteModal(false)
  }
  const handleReject = async (comment, files) => {
    const ids = await uploadEvidence(files, 'reject')
    await runAction(
      () => api.rejectReceipt(token, id, comment, ids),
      'Sent back to creator'
    )
    setShowRejectModal(false)
  }
  const handleOverride = async (payload, reason, files) => {
    const ids = await uploadEvidence(files, 'override')
    return runAction_legacyOverride(payload, reason, ids)
  }
  const runAction_legacyOverride = (payload, reason, ids) => runAction(
    () => api.adminOverrideReceipt(token, id, { ...payload, attachment_ids: ids || [] }, reason),
    'Override applied'
  ).then(() => setShowOverrideModal(false))

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

  // Transform normalized receipt data to camelCase for PrintReceipt component
  // Receipt is already normalized (snake_case), so we just need to map to camelCase
  const transformedReceipt = {
    // Receipt identification
    receiptNo: receipt.receipt_no,
    date: receipt.date,
    
    // Employee (prefer normalized; fallback to nested employee object)
    employeeName: receipt.employee_name ?? receipt.employee?.name ?? '',
    empCode: receipt.emp_code ?? receipt.employee?.code ?? '',
    branch: receipt.branch ?? receipt.employee?.branch ?? '',
    
    // Investor (prefer normalized; fallback to nested investor object)
    investorId: receipt.investor_id ?? receipt.investor?.id ?? '',
    investorName: receipt.investor_name ?? receipt.investor?.name ?? '',
    investorAddress: receipt.investor_address ?? (typeof receipt.investor?.address === 'string' ? receipt.investor.address : null) ?? '',
    pinCode: receipt.pin_code ?? receipt.investor?.address?.pin_code ?? '',
    pan: receipt.pan ?? receipt.investor?.pan ?? '',
    email: receipt.email ?? receipt.investor?.email ?? '',
    mobile: receipt.mobile ?? receipt.investor?.mobile ?? '',
    
    // Product and transaction
    product_category: receipt.product_category,
    txnCategory: receipt.txnCategory ? [receipt.txnCategory] : [],
    txnType: receipt.txn_type,
    mode: receipt.mode,
    
    // Investment details (transaction)
    sip_stp_swp_period: receipt.period_installments,
    noOfInstallments: receipt.installments_count,
    from: receipt.from_text,
    to: receipt.to_text,
    unitsOrAmount: receipt.units_or_amount,
    investmentAmount: receipt.investment_amount,
    period_installments: receipt.period_installments,
    installments_count: receipt.installments_count,
    from_text: receipt.from_text,
    to_text: receipt.to_text,
    units_or_amount: receipt.units_or_amount,
    
    // Scheme/Product
    schemeName: receipt.scheme_name,
    schemeOption: receipt.scheme_option,
    folioPolicyNo: receipt.folio_policy_no,
    issuer_company: receipt.issuer_company,
    
    // FD/Bonds fields
    fdType: receipt.fd_type,
    clientType: receipt.client_type,
    depositPeriodYM: receipt.deposit_period_ym,
    roi: receipt.roi_percent,
    interestPayable: receipt.interest_payable,
    interestFrequency: receipt.interest_frequency,
    instrumentType: receipt.instrument_type,
    instrumentNo: receipt.instrument_no,
    instrumentDate: receipt.instrument_date,
    bankName: receipt.bank_name,
    bankBranch: receipt.bank_branch,
    // Payment / transaction details (Online, Offline, Others)
    entryMode: receipt.entry_mode,
    channel: receipt.channel,
    referenceNo: receipt.reference_no,
    txnDate: receipt.txn_date,
    notes: receipt.notes,
    fdr_demat_policy: receipt.fdr_demat_policy,
    renewalDueDate: receipt.renewal_due_date,
    maturityAmount: receipt.maturity_amount,
    renewalAmount: receipt.renewal_amount,
    
    // SIP fields
    sip_frequency: receipt.sip_frequency,
    sip_start_date: receipt.sip_start_date,
    sip_end_date: receipt.sip_end_date,
    sip_is_perpetual: receipt.sip_is_perpetual,
    
    // STP fields
    stp_target_scheme_code: receipt.stp_target_scheme_code,
    stp_target_scheme_name: receipt.stp_target_scheme_name,
    stp_frequency: receipt.stp_frequency,
    stp_start_date: receipt.stp_start_date,
    stp_amount: receipt.stp_amount,
    stp_original_amount: receipt.stp_original_amount,
    
    // SWP fields
    swp_frequency: receipt.swp_frequency,
    swp_start_date: receipt.swp_start_date,
    swp_amount: receipt.swp_amount,
    
    // Switch Over fields
    switch_from_scheme_code: receipt.switch_from_scheme_code,
    switch_from_scheme_name: receipt.switch_from_scheme_name,
    switch_to_scheme_code: receipt.switch_to_scheme_code,
    switch_to_scheme_name: receipt.switch_to_scheme_name,
    switch_type: receipt.switch_type,
    switch_value: receipt.switch_value,
    
    // FD-specific fields
    fd_issuer_key: receipt.fd_issuer_key,
    fd_issuer_name: receipt.fd_issuer_name,
    fd_issuer_type: receipt.fd_issuer_type,
    fd_scheme_id: receipt.fd_scheme_id,
    fd_scheme_name: receipt.fd_scheme_name,
    fd_is_cumulative: receipt.fd_is_cumulative,
    fd_deposit_amount: receipt.fd_deposit_amount,
    fd_tenure_months: receipt.fd_tenure_months,
    fd_payout_frequency: receipt.fd_payout_frequency,
    fd_booking_date: receipt.fd_booking_date,
    fd_locked_interest_rate_pa: receipt.fd_locked_interest_rate_pa,
    fd_effective_yield_pa: receipt.fd_effective_yield_pa,
    fd_maturity_amount: receipt.fd_maturity_amount,
    fd_maturity_date: receipt.fd_maturity_date,
    fd_periodic_payout: receipt.fd_periodic_payout,
    fd_total_interest: receipt.fd_total_interest,
    fd_base_rate_pa: receipt.fd_base_rate_pa,
    fd_senior_citizen_bonus: receipt.fd_senior_citizen_bonus,
    fd_women_bonus: receipt.fd_women_bonus,
    fd_renewal_bonus: receipt.fd_renewal_bonus,
    fd_tds_applicable: receipt.fd_tds_applicable,
    fd_form_15g_15h: receipt.fd_form_15g_15h,
    fd_application_number: receipt.fd_application_number,
    fd_transaction_type: receipt.fd_transaction_type,
    fd_renewal_investment_type: receipt.fd_renewal_investment_type,
    fd_renewal_additional_amount: receipt.fd_renewal_additional_amount,

    // Bond/NCD
    bond_issuer_key: receipt.bond_issuer_key,
    bond_issuer_name: receipt.bond_issuer_name,
    bond_issuer_type: receipt.bond_issuer_type,
    bond_scheme_id: receipt.bond_scheme_id,
    bond_scheme_name: receipt.bond_scheme_name,
    bond_isin: receipt.bond_isin,
    bond_coupon_rate: receipt.bond_coupon_rate,
    bond_face_value: receipt.bond_face_value,
    bond_issue_date: receipt.bond_issue_date,
    bond_maturity_date: receipt.bond_maturity_date,
    bond_transaction_type: receipt.bond_transaction_type,
    bond_number_of_units: receipt.bond_number_of_units,
    bond_application_number: receipt.bond_application_number,
    bond_form_15g_15h: receipt.bond_form_15g_15h,
    renewal_due_date: receipt.renewal_due_date,

    // Insurance
    insurance_issuer_key: receipt.insurance_issuer_key,
    insurance_product_id: receipt.insurance_product_id,
    insurance_product_name: receipt.insurance_product_name,
    insurance_category: receipt.insurance_category,
    insurance_sub_category: receipt.insurance_sub_category,
    insurance_policy_number: receipt.insurance_policy_number,
    insurance_sum_assured: receipt.insurance_sum_assured,
    insurance_policy_term_years: receipt.insurance_policy_term_years,
    insurance_premium_frequency: receipt.insurance_premium_frequency,
    insurance_premium_payment_term: receipt.insurance_premium_payment_term,
    insurance_date_of_issue: receipt.insurance_date_of_issue,
    insurance_maturity_date: receipt.insurance_maturity_date,
  }

  // For MF Switch Over: show "FROM → TO" scheme; otherwise scheme name as-is
  const getDisplaySchemeName = (r) => {
    if (!r) return ''
    if (r.product_category !== 'MF') return r.schemeName || r.scheme_name || ''
    const txnType = (r.txn_type || '').toLowerCase()
    const isSwitchOver = txnType.includes('switch') || !!r.switch_to_scheme_name
    if (!isSwitchOver) return r.schemeName || r.scheme_name || ''
    const fromName = r.switch_from_scheme_name || r.scheme_name || r.schemeName
    const toName = r.switch_to_scheme_name || r.scheme_name || r.schemeName
    if (fromName && toName && fromName !== toName) return `${fromName} → ${toName}`
    return toName || fromName || r.schemeName || r.scheme_name || ''
  }
  const displaySchemeName = getDisplaySchemeName(transformedReceipt)

  const normalizeTxnTypeToDisplayMode = (raw) => {
    const v = String(raw || '').trim()
    if (!v) return ''
    const upper = v.toUpperCase()
    if (upper === 'SWITCHOVER' || upper === 'SWITCH_OVER') return 'Switch Over'
    if (v === 'Switch Over') return 'Switch Over'
    if (v === 'Lumpsum' || v === 'LumpSum' || v === 'Lump Sum') return 'Lump Sum'
    return v // SIP / SWP / STP
  }

  // Prefer txnType for MF mode display; fallback to legacy receipt.mode
  const mfModeDisplay = transformedReceipt.product_category === 'MF'
    ? (normalizeTxnTypeToDisplayMode(transformedReceipt.txnType) || transformedReceipt.mode || '')
    : ''

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
                  Created on {formatDateDisplay(transformedReceipt.date)}
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

      {/* Approval workflow bar + history (feature-flag-gated) */}
      {approvalFlagOn && receipt && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-4 no-print">
          <ReceiptActionBar
            receipt={receipt}
            currentTeam={currentTeamFull}
            currentUser={user}
            isCreator={isCreator}
            canActOnCurrentTeam={canActOnCurrentTeam || isAdminRole}
            loading={approvalBusy}
            onSubmit={() => setShowSubmitModal(true)}
            onRoute={() => setShowRouteModal(true)}
            onComplete={() => setShowCompleteModal(true)}
            onReject={() => setShowRejectModal(true)}
          />

          {isAdminRole && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowLegacyAdmin((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <FiChevronDown className={`transition-transform ${showLegacyAdmin ? 'rotate-180' : ''}`} />
                Admin override
              </button>
            </div>
          )}

          {isAdminRole && showLegacyAdmin && (
            <div className="rounded-lg border border-[var(--warn)]/40 bg-[var(--warn-muted)] p-3 text-sm">
              <div className="flex items-start gap-2">
                <FiShield className="mt-0.5 text-[var(--warn)]" />
                <div className="flex-1">
                  <div className="font-medium text-[var(--text-primary)]">Bypass the workflow</div>
                  <div className="text-[var(--text-secondary)]">
                    Force-complete, force-reject, or route this receipt. Each action is audited with your reason and marked <b>forced</b> in history.
                  </div>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setShowOverrideModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--warn)] text-white text-xs font-medium hover:opacity-90"
                    >
                      <FiShield /> Open admin override
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {history && <HistoryTimeline history={history} token={token} receiptId={id} />}
        </div>
      )}

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
                <div className="text-sm text-red-100 mt-1">{formatDateDisplay(transformedReceipt.date)}</div>
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
                  {(transformedReceipt.investorAddress || transformedReceipt.pinCode) && (
                    <>
                      {transformedReceipt.investorAddress && (
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-600 dark:text-gray-400 shrink-0">Address:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100 text-right text-sm whitespace-pre-line">{transformedReceipt.investorAddress}</span>
                        </div>
                      )}
                      {transformedReceipt.pinCode && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">PIN:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{transformedReceipt.pinCode}</span>
                        </div>
                      )}
                    </>
                  )}
                  {transformedReceipt.pan && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">PAN:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{transformedReceipt.pan}</span>
                    </div>
                  )}
                  {transformedReceipt.mobile && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Mobile:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{transformedReceipt.mobile}</span>
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
              
              {/* Investment Details grid – MF only; FD/BOND/INS use their dedicated sections below */}
              {transformedReceipt.product_category === 'MF' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {transformedReceipt.product_category && (
                    <div className="bg-white dark:bg-dark-700 rounded-lg p-4 border border-blue-100 dark:border-dark-600">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Product Type</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{getReceiptProductCategoryLabel(receipt)}</div>
                    </div>
                  )}
                  
                  {transformedReceipt.txnType && transformedReceipt.product_category !== 'FD' && (
                    <div className="bg-white dark:bg-dark-700 rounded-lg p-4 border border-blue-100 dark:border-dark-600">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Transaction</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.txnType}</div>
                    </div>
                  )}
                  
                  {/* Mode tile removed; MF investment type is still shown via `txnType`. */}
                  
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

                  {transformedReceipt.product_category === 'MF' && transformedReceipt.switch_to_scheme_name ? (
                    <>
                      {transformedReceipt.switch_from_scheme_name && (
                        <div className="bg-white dark:bg-dark-700 rounded-lg p-4 border border-blue-100 dark:border-dark-600">
                          <div className="text-sm text-gray-600 dark:text-gray-400">Source Scheme</div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.switch_from_scheme_name}</div>
                          {transformedReceipt.scheme_option && (
                            <div className="mt-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                transformedReceipt.scheme_option === 'GROWTH' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                transformedReceipt.scheme_option === 'IDCW_PAYOUT' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                                'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'
                              }`}>
                                {transformedReceipt.scheme_option === 'GROWTH' ? 'Growth' : 
                                 transformedReceipt.scheme_option === 'IDCW_PAYOUT' ? 'IDCW – Payout' : 
                                 transformedReceipt.scheme_option === 'IDCW_REINVEST' ? 'IDCW – Reinvestment' : 
                                 transformedReceipt.scheme_option}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {transformedReceipt.switch_to_scheme_name && (
                        <div className="bg-white dark:bg-dark-700 rounded-lg p-4 border border-blue-100 dark:border-dark-600">
                          <div className="text-sm text-gray-600 dark:text-gray-400">Target Scheme</div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.switch_to_scheme_name}</div>
                        </div>
                      )}
                    </>
                  ) : transformedReceipt.product_category === 'MF' && transformedReceipt.txnType === 'STP' ? (
                    <>
                      {transformedReceipt.schemeName && (
                        <div className="bg-white dark:bg-dark-700 rounded-lg p-4 border border-blue-100 dark:border-dark-600">
                          <div className="text-sm text-gray-600 dark:text-gray-400">Source Scheme</div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.schemeName}</div>
                          {transformedReceipt.scheme_option && (
                            <div className="mt-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                transformedReceipt.scheme_option === 'GROWTH' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                transformedReceipt.scheme_option === 'IDCW_PAYOUT' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                                'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'
                              }`}>
                                {transformedReceipt.scheme_option === 'GROWTH' ? 'Growth' : 
                                 transformedReceipt.scheme_option === 'IDCW_PAYOUT' ? 'IDCW – Payout' : 
                                 transformedReceipt.scheme_option === 'IDCW_REINVEST' ? 'IDCW – Reinvestment' : 
                                 transformedReceipt.scheme_option}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {transformedReceipt.stp_target_scheme_name && (
                        <div className="bg-white dark:bg-dark-700 rounded-lg p-4 border border-blue-100 dark:border-dark-600">
                          <div className="text-sm text-gray-600 dark:text-gray-400">Target Scheme</div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.stp_target_scheme_name}</div>
                        </div>
                      )}
                    </>
                  ) : ((displaySchemeName || transformedReceipt.schemeName) && (
                    <div className="bg-white dark:bg-dark-700 rounded-lg p-4 border border-blue-100 dark:border-dark-600">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Scheme Name</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{displaySchemeName || transformedReceipt.schemeName}</div>
                      {transformedReceipt.scheme_option && (
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            transformedReceipt.scheme_option === 'GROWTH' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                            transformedReceipt.scheme_option === 'IDCW_PAYOUT' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                            'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'
                          }`}>
                            {transformedReceipt.scheme_option === 'GROWTH' ? 'Growth' : 
                             transformedReceipt.scheme_option === 'IDCW_PAYOUT' ? 'IDCW – Payout' : 
                             transformedReceipt.scheme_option === 'IDCW_REINVEST' ? 'IDCW – Reinvestment' : 
                             transformedReceipt.scheme_option}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* FD / Government Schemes Details */}
              {transformedReceipt.fd_issuer_name && (transformedReceipt.product_category === 'FD' || transformedReceipt.product_category === 'GOVT_FD') && (
                <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    {transformedReceipt.product_category === 'GOVT_FD' ? 'Government Schemes' : 'Fixed Deposit Details'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {transformedReceipt.fd_issuer_name && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Issuer</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.fd_issuer_name} {transformedReceipt.fd_issuer_type && `(${transformedReceipt.fd_issuer_type})`}</div>
                      </div>
                    )}
                    {transformedReceipt.fd_scheme_name && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Scheme</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.fd_scheme_name}</div>
                      </div>
                    )}
                    {transformedReceipt.fd_deposit_amount && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Deposit Amount</div>
                        <div className="font-semibold text-green-600 dark:text-green-400">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(transformedReceipt.fd_deposit_amount)}
                        </div>
                      </div>
                    )}
                    {transformedReceipt.fd_tenure_months && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Tenure</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.fd_tenure_months} months</div>
                      </div>
                    )}
                    {transformedReceipt.fd_payout_frequency && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Payout Frequency</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.fd_payout_frequency}</div>
                      </div>
                    )}
                    {transformedReceipt.fd_locked_interest_rate_pa && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Interest Rate</div>
                        <div className="font-semibold text-green-600 dark:text-green-400">{transformedReceipt.fd_locked_interest_rate_pa?.toFixed(2)}% p.a.</div>
                      </div>
                    )}
                    {transformedReceipt.fd_maturity_date && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Maturity Date</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{formatDateDisplay(transformedReceipt.fd_maturity_date)}</div>
                      </div>
                    )}
                    {transformedReceipt.fd_application_number && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {transformedReceipt.product_category === 'GOVT_FD' ? 'Application/Scheme Number' : 'Application/FD Number'}
                        </div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.fd_application_number}</div>
                      </div>
                    )}
                    {(transformedReceipt.fd_transaction_type || transformedReceipt.txn_type) && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Transaction Type</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {transformedReceipt.fd_transaction_type || transformedReceipt.txn_type || 'Fresh'}
                        </div>
                      </div>
                    )}
                    {transformedReceipt.fd_transaction_type === 'Renewal' && transformedReceipt.fd_renewal_investment_type && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Renewal Investment</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {transformedReceipt.fd_renewal_investment_type === 'same' ? 'Same Amount' :
                           transformedReceipt.fd_renewal_investment_type === 'increased' ? 'Increased Amount' :
                           transformedReceipt.fd_renewal_investment_type === 'decreased' ? 'Decreased Amount' :
                           transformedReceipt.fd_renewal_investment_type}
                        </div>
                        {transformedReceipt.fd_renewal_additional_amount && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {transformedReceipt.fd_renewal_investment_type === 'increased' ? 'Additional: ' : 'Withdrawal: '}
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(transformedReceipt.fd_renewal_additional_amount)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bond/NCD Details */}
              {(transformedReceipt.product_category === 'BOND' || transformedReceipt.product_category === 'NCD') && (transformedReceipt.bond_issuer_name || transformedReceipt.bond_scheme_name) && (
                <div className="mt-4 p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-teal-500 rounded-full mr-2"></span>
                    Bond / NCD Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {transformedReceipt.bond_issuer_name && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Issuer</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.bond_issuer_name} {transformedReceipt.bond_issuer_type && `(${transformedReceipt.bond_issuer_type})`}</div>
                      </div>
                    )}
                    {transformedReceipt.bond_scheme_name && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Scheme</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.bond_scheme_name}</div>
                      </div>
                    )}
                    {transformedReceipt.investmentAmount && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Amount</div>
                        <div className="font-semibold text-green-600 dark:text-green-400">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(transformedReceipt.investmentAmount)}
                        </div>
                      </div>
                    )}
                    {transformedReceipt.bond_coupon_rate && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Coupon rate</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.bond_coupon_rate}% p.a.</div>
                      </div>
                    )}
                    {transformedReceipt.bond_face_value && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Face value</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(transformedReceipt.bond_face_value)}
                        </div>
                      </div>
                    )}
                    {transformedReceipt.bond_issue_date && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Issue date</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{formatDateDisplay(transformedReceipt.bond_issue_date)}</div>
                      </div>
                    )}
                    {(transformedReceipt.bond_maturity_date || transformedReceipt.renewal_due_date) && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Maturity / Renewal due</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{formatDateDisplay(transformedReceipt.bond_maturity_date || transformedReceipt.renewal_due_date)}</div>
                      </div>
                    )}
                    {transformedReceipt.bond_application_number && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Application number</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.bond_application_number}</div>
                      </div>
                    )}
                    {(transformedReceipt.bond_transaction_type || transformedReceipt.txnType) && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Transaction type</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.bond_transaction_type || transformedReceipt.txnType || '—'}</div>
                      </div>
                    )}
                    {transformedReceipt.bond_isin && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">ISIN</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.bond_isin}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Insurance Details */}
              {transformedReceipt.product_category === 'INS' && (transformedReceipt.insurance_issuer_key || transformedReceipt.insurance_product_name || transformedReceipt.issuer_company) && (
                <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                    Insurance Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(transformedReceipt.issuer_company || transformedReceipt.fd_issuer_name) && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Issuer</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.issuer_company || transformedReceipt.fd_issuer_name}</div>
                      </div>
                    )}
                    {(transformedReceipt.insurance_product_name || transformedReceipt.schemeName) && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Product</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.insurance_product_name || transformedReceipt.schemeName}</div>
                      </div>
                    )}
                    {transformedReceipt.investmentAmount && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Premium amount</div>
                        <div className="font-semibold text-green-600 dark:text-green-400">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(transformedReceipt.investmentAmount)}
                        </div>
                      </div>
                    )}
                    {(transformedReceipt.insurance_policy_number || transformedReceipt.folioPolicyNo) && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Policy number</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.insurance_policy_number || transformedReceipt.folioPolicyNo}</div>
                      </div>
                    )}
                    {transformedReceipt.insurance_sum_assured && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Sum assured</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(transformedReceipt.insurance_sum_assured)}
                        </div>
                      </div>
                    )}
                    {transformedReceipt.insurance_policy_term_years && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Policy term</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.insurance_policy_term_years} years</div>
                      </div>
                    )}
                    {transformedReceipt.insurance_premium_frequency && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Premium frequency</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.insurance_premium_frequency}</div>
                      </div>
                    )}
                    {transformedReceipt.insurance_date_of_issue && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Date of issue</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{formatDateDisplay(transformedReceipt.insurance_date_of_issue)}</div>
                      </div>
                    )}
                    {transformedReceipt.insurance_maturity_date && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Maturity date</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{formatDateDisplay(transformedReceipt.insurance_maturity_date)}</div>
                      </div>
                    )}
                    {(transformedReceipt.fd_transaction_type || transformedReceipt.txnType) && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Transaction type</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.fd_transaction_type || transformedReceipt.txnType || 'Fresh'}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{formatDateDisplay(transformedReceipt.sip_start_date)}</div>
                      </div>
                    )}
                    {transformedReceipt.sip_end_date && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">End Date</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{formatDateDisplay(transformedReceipt.sip_end_date)}</div>
                      </div>
                    )}
                    {transformedReceipt.sip_is_perpetual && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Type</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">Perpetual (40 years)</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payment / Transaction details (Online, Offline, Others) – show when any payment data exists */}
              {(transformedReceipt.entryMode || transformedReceipt.channel || transformedReceipt.referenceNo || transformedReceipt.bankName || transformedReceipt.bankBranch || transformedReceipt.notes || transformedReceipt.instrumentType || transformedReceipt.instrumentNo || transformedReceipt.txnDate) && (
                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                    Payment / Transaction details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(transformedReceipt.entryMode || transformedReceipt.channel || transformedReceipt.bankName) && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Payment type</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {transformedReceipt.entryMode || (transformedReceipt.bankName ? 'Offline' : (transformedReceipt.notes || transformedReceipt.channel ? 'Others' : 'Online')) || '—'}
                        </div>
                      </div>
                    )}
                    {(transformedReceipt.entryMode === 'Online' || (!transformedReceipt.entryMode && transformedReceipt.referenceNo)) && (transformedReceipt.referenceNo || transformedReceipt.channel) && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Reference / Transaction number</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.referenceNo || transformedReceipt.channel}</div>
                      </div>
                    )}
                    {(transformedReceipt.entryMode === 'Offline' || transformedReceipt.bankName) && (
                      <>
                        {transformedReceipt.bankName && (
                          <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400">Bank</div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.bankName}</div>
                          </div>
                        )}
                        {transformedReceipt.bankBranch && (
                          <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400">Branch</div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.bankBranch}</div>
                          </div>
                        )}
                        {(transformedReceipt.instrumentNo || transformedReceipt.referenceNo) && (
                          <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400">Cheque / Instrument number</div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.instrumentNo || transformedReceipt.referenceNo}</div>
                          </div>
                        )}
                        {(transformedReceipt.instrumentDate || transformedReceipt.txnDate) && (
                          <div className="bg-white dark:bg-dark-700 rounded-lg p-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400">Date</div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                              {formatDateDisplay(transformedReceipt.instrumentDate || transformedReceipt.txnDate)}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {(transformedReceipt.entryMode === 'Others' || (transformedReceipt.notes && !transformedReceipt.bankName)) && (transformedReceipt.notes || transformedReceipt.channel) && (
                      <div className="bg-white dark:bg-dark-700 rounded-lg p-4 md:col-span-2">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Details</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{transformedReceipt.notes || transformedReceipt.channel}</div>
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
                        {file.category === 'approval_evidence' && (
                          <span
                            className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30"
                            title={`Uploaded during ${file.uploaded_during || 'approval'}${file.team_name ? ' · ' + file.team_name : ''}`}
                          >
                            <FiShield className="w-3 h-3" />
                            Approval evidence{file.team_name ? ` · ${file.team_name}` : ''}
                          </span>
                        )}
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

        {/* Related tasks for this receipt */}
        {id && (
          <div className="mt-6">
            <RelatedTasks entityType="receipt" entityId={id} title="Receipt tasks" />
          </div>
        )}
      </div>

      {/* Approval workflow modals */}
      {approvalFlagOn && (
        <>
          <TeamPickerModal
            open={showRouteModal}
            teams={teams}
            currentTeamId={history?.current_team?.id || receipt?.current_team_id || null}
            excludedTeamIds={history?.approved_by_team_ids || []}
            onClose={() => setShowRouteModal(false)}
            onSubmit={handleRoute}
          />
          <RejectModal
            open={showRejectModal}
            onClose={() => setShowRejectModal(false)}
            onSubmit={handleReject}
          />
          <AdminOverrideModal
            open={showOverrideModal}
            teams={teams}
            currentStatus={receipt?.status || ''}
            currentTeamId={history?.current_team?.id || receipt?.current_team_id || null}
            onClose={() => setShowOverrideModal(false)}
            onSubmit={handleOverride}
          />
          <SubmitForApprovalModal
            open={showSubmitModal}
            isResubmit={receipt?.status === 'Needs Changes'}
            onClose={() => setShowSubmitModal(false)}
            onSubmit={handleSubmit}
          />
          <CompleteApprovalModal
            open={showCompleteModal}
            currentTeamName={currentTeamFull?.name || history?.current_team?.name || ''}
            finalLabel={cfg?.receipt_final_status_label || 'Completed'}
            onClose={() => setShowCompleteModal(false)}
            onSubmit={handleComplete}
          />
        </>
      )}
    </div>
  )
}
