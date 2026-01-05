/**
 * Receipt Field Normalizer
 * 
 * This utility normalizes receipt data to use consistent field names (snake_case).
 * It handles backward compatibility by mapping old field names (camelCase) to new ones.
 * 
 * Usage:
 *   const normalizedReceipt = normalizeReceiptFields(receipt)
 *   // Now you can safely use normalizedReceipt.scheme_name instead of checking both scheme_name and schemeName
 */

/**
 * Normalizes a receipt object to use consistent snake_case field names
 * Supports both new structured format (nested objects) and old flat format
 * Maps old camelCase fields to new snake_case fields for backward compatibility
 * 
 * @param {Object} receipt - Receipt object (may contain old or new field names, structured or flat)
 * @returns {Object} Normalized receipt with consistent field names (flat structure for compatibility)
 */
export function normalizeReceiptFields(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return receipt
  }

  // Create normalized object starting with the original
  const normalized = { ...receipt }

  // Helper to get value from structured (nested) or flat format
  const getValue = (structuredPath, ...flatPaths) => {
    // Try nested structured format first (new format)
    if (structuredPath && structuredPath.includes('.')) {
      const pathParts = structuredPath.split('.')
      let value = receipt
      for (const part of pathParts) {
        if (value && typeof value === 'object' && value[part] !== undefined) {
          value = value[part]
        } else {
          value = null
          break
        }
      }
      if (value !== null && value !== undefined) return value
    } else if (structuredPath && receipt[structuredPath] !== undefined) {
      // Try direct structured path
      return receipt[structuredPath]
    }
    // Try flat format (old format)
    for (const flatPath of flatPaths) {
      if (receipt[flatPath] !== undefined && receipt[flatPath] !== null) {
        return receipt[flatPath]
      }
    }
    return null
  }

  // Receipt identification
  normalized.receipt_no = getValue('receipt_no', 'receiptNo', 'receipt_id')
  normalized.date = receipt.date || null

  // Employee information (from structured.employee or flat)
  normalized.employee_name = getValue('employee.name', 'employee_name', 'employeeName')
  normalized.emp_code = getValue('employee.code', 'emp_code', 'empCode')
  normalized.branch = getValue('employee.branch', 'branch')

  // Investor information (from structured.investor or flat)
  normalized.investor_id = getValue('investor.id', 'investor_id', 'investorId')
  normalized.investor_name = getValue('investor.name', 'investor_name', 'investorName')
  // Build address from structured format or use flat
  const investorAddress = receipt.investor?.address
  if (investorAddress && typeof investorAddress === 'object') {
    const addressParts = [
      investorAddress.line1,
      investorAddress.line2,
      investorAddress.line3
    ].filter(Boolean)
    normalized.investor_address = addressParts.join('\n') || null
    normalized.pin_code = investorAddress.pin_code || null
  } else {
    normalized.investor_address = getValue('investor_address', 'investorAddress')
    normalized.pin_code = getValue('investor.address.pin_code', 'pin_code', 'pinCode')
  }
  normalized.pan = getValue('investor.pan', 'pan')
  normalized.email = getValue('investor.email', 'email')

  // Product category (from structured.product or flat)
  normalized.product_category = getValue('product.category', 'product_category', 'productCategory', 'productType')

  // Scheme/Product information (from structured.product or product_details or flat)
  normalized.scheme_name = getValue(
    'product.name',
    'product_details.mf.scheme.name',
    'product_details.fd.scheme.name',
    'scheme_name',
    'schemeName',
    'fd_scheme_name'
  )
  normalized.scheme_code = getValue(
    'product_details.mf.scheme.code',
    'scheme_code',
    'schemeCode'
  )
  normalized.scheme_option = getValue('product.option', 'scheme_option', 'schemeOption')
  normalized.scheme_category = getValue(
    'product_details.mf.scheme.category',
    'scheme_category',
    'schemeCategory'
  )
  normalized.scheme_sub_category = getValue(
    'product_details.mf.scheme.sub_category',
    'scheme_sub_category',
    'schemeSubCategory'
  )
  normalized.scheme_plan = getValue(
    'product_details.mf.scheme.plan',
    'scheme_plan',
    'schemePlan'
  )
  normalized.scheme_type = getValue(
    'product_details.mf.scheme.type',
    'scheme_type',
    'schemeType'
  )
  normalized.scheme_is_nfo = getValue(
    'product_details.mf.scheme.is_nfo',
    'scheme_is_nfo',
    'schemeIsNfo'
  ) !== undefined ? (getValue('product_details.mf.scheme.is_nfo', 'scheme_is_nfo', 'schemeIsNfo') || false) : null

  // AMC information (MF) (from structured.product_details.mf.amc or flat)
  normalized.amc_code = getValue('product_details.mf.amc.code', 'amc_code', 'amcCode')
  normalized.amc_name = getValue('product_details.mf.amc.name', 'amc_name', 'amcName')

  // Investment details (from structured.transaction or flat)
  normalized.investment_amount = getValue(
    'transaction.amount',
    'product_details.fd.deposit.amount',
    'investment_amount',
    'investmentAmount',
    'amount',
    'fd_deposit_amount'
  )
  normalized.mode = getValue('transaction.mode', 'mode', 'mode_type', 'investment_mode')
  normalized.txn_type = getValue(
    'transaction.type',
    'product_details.fd.application.transaction_type',
    'txn_type',
    'txnType',
    'transaction_type',
    'transactionType',
    'fd_transaction_type'
  )
  normalized.folio_policy_no = getValue(
    'product.folio_number',
    'product_details.fd.application.number',
    'folio_policy_no',
    'folioPolicyNo',
    'fd_application_number'
  )

  // Folio information (MF)
  normalized.has_existing_folio = getValue('product.has_existing_folio', 'has_existing_folio', 'hasExistingFolio')
  normalized.folio_number = getValue('product.folio_number', 'folio_number', 'folioNumber')

  // SIP fields (from structured.transaction.sip or flat)
  normalized.sip_frequency = getValue('transaction.sip.frequency', 'sip_frequency', 'sipFrequency')
  normalized.sip_start_date = getValue('transaction.sip.start_date', 'sip_start_date', 'sipStartDate')
  normalized.sip_end_date = getValue('transaction.sip.end_date', 'sip_end_date', 'sipEndDate')
  normalized.sip_is_perpetual = getValue('transaction.sip.is_perpetual', 'sip_is_perpetual', 'sipIsPerpetual') !== undefined 
    ? (getValue('transaction.sip.is_perpetual', 'sip_is_perpetual', 'sipIsPerpetual') || false) 
    : null

  // SWP fields (from structured.transaction.swp or flat)
  normalized.swp_frequency = getValue('transaction.swp.frequency', 'swp_frequency', 'swpFrequency')
  normalized.swp_start_date = getValue('transaction.swp.start_date', 'swp_start_date', 'swpStartDate')
  normalized.swp_amount = getValue('transaction.swp.amount', 'swp_amount', 'swpAmount')

  // STP fields (from structured.transaction.stp or flat)
  normalized.stp_target_scheme_code = getValue('transaction.stp.to_scheme_code', 'stp_target_scheme_code', 'stpTargetSchemeCode')
  normalized.stp_target_scheme_name = getValue('transaction.stp.to_scheme_name', 'stp_target_scheme_name', 'stpTargetSchemeName')
  normalized.stp_frequency = getValue('transaction.stp.frequency', 'stp_frequency', 'stpFrequency')
  normalized.stp_start_date = getValue('transaction.stp.start_date', 'stp_start_date', 'stpStartDate')
  normalized.stp_amount = getValue('transaction.stp.amount', 'stp_amount', 'stpAmount')
  normalized.stp_original_amount = getValue('transaction.stp.original_amount', 'stp_original_amount', 'stpOriginalAmount')

  // Switch Over fields (from structured.transaction.switch_over or flat)
  normalized.switch_from_scheme_code = getValue('transaction.switch_over.from_scheme_code', 'switch_from_scheme_code', 'switchFromSchemeCode')
  normalized.switch_from_scheme_name = getValue('transaction.switch_over.from_scheme_name', 'switch_from_scheme_name', 'switchFromSchemeName')
  normalized.switch_to_scheme_code = getValue('transaction.switch_over.to_scheme_code', 'switch_to_scheme_code', 'switchToSchemeCode')
  normalized.switch_to_scheme_name = getValue('transaction.switch_over.to_scheme_name', 'switch_to_scheme_name', 'switchToSchemeName')
  normalized.switch_type = getValue('transaction.switch_over.type', 'switch_type', 'switchType')
  normalized.switch_value = getValue('transaction.switch_over.value', 'switch_value', 'switchValue')

  // FD Issuer information (from structured.product_details.fd.issuer or flat)
  normalized.fd_issuer_key = getValue('product_details.fd.issuer.key', 'fd_issuer_key', 'fdIssuerKey')
  normalized.fd_issuer_name = getValue(
    'product_details.fd.issuer.name',
    'product_details.insurance.issuer.name',
    'product_details.bond.issuer.name',
    'fd_issuer_name',
    'fdIssuerName',
    'issuer_company',
    'issuerCompany'
  )
  normalized.fd_issuer_type = getValue('product_details.fd.issuer.type', 'fd_issuer_type', 'fdIssuerType')
  normalized.issuer_company = getValue(
    'product_details.fd.issuer.name',
    'product_details.insurance.issuer.name',
    'product_details.bond.issuer.name',
    'issuer_company',
    'issuerCompany',
    'fd_issuer_name',
    'fdIssuerName'
  )
  normalized.issuer_category = getValue(
    'product_details.fd.issuer.type',
    'product_details.insurance.issuer.type',
    'product_details.bond.issuer.type',
    'issuer_category',
    'issuerCategory'
  )

  // FD Scheme information (from structured.product_details.fd.scheme or flat)
  normalized.fd_scheme_id = getValue('product_details.fd.scheme.id', 'fd_scheme_id', 'fdSchemeId')
  normalized.fd_scheme_name = getValue('product_details.fd.scheme.name', 'fd_scheme_name', 'fdSchemeName')
  normalized.fd_is_cumulative = getValue('product_details.fd.scheme.is_cumulative', 'fd_is_cumulative', 'fdIsCumulative') !== undefined
    ? (getValue('product_details.fd.scheme.is_cumulative', 'fd_is_cumulative', 'fdIsCumulative') || false)
    : null

  // FD Transaction details (from structured.product_details.fd.application or flat)
  normalized.fd_transaction_type = getValue('product_details.fd.application.transaction_type', 'fd_transaction_type', 'fdTransactionType')
  normalized.fd_renewal_investment_type = getValue(
    'product_details.fd.application.renewal.investment_type',
    'fd_renewal_investment_type',
    'fdRenewalInvestmentType'
  )
  normalized.fd_renewal_additional_amount = getValue(
    'product_details.fd.application.renewal.additional_amount',
    'fd_renewal_additional_amount',
    'fdRenewalAdditionalAmount'
  )

  // FD Deposit details (from structured.product_details.fd.deposit or flat)
  normalized.fd_deposit_amount = getValue('product_details.fd.deposit.amount', 'fd_deposit_amount', 'fdDepositAmount')
  normalized.fd_tenure_months = getValue('product_details.fd.deposit.tenure_months', 'fd_tenure_months', 'fdTenureMonths')
  normalized.deposit_period_ym = receipt.deposit_period_ym || receipt.depositPeriodYM || null
  normalized.fd_booking_date = getValue('product_details.fd.deposit.booking_date', 'fd_booking_date', 'fdBookingDate')
  normalized.fd_deposit_date = getValue('product_details.fd.deposit.deposit_date', 'fd_deposit_date', 'fdDepositDate')

  // FD Rate and interest details (from structured.product_details.fd.rates or flat)
  normalized.fd_payout_frequency = getValue('product_details.fd.deposit.payout_frequency', 'fd_payout_frequency', 'fdPayoutFrequency')
  normalized.interest_frequency = getValue(
    'product_details.insurance.policy.premium_frequency',
    'product_details.fd.deposit.payout_frequency',
    'interest_frequency',
    'interestFrequency',
    'fd_payout_frequency',
    'fdPayoutFrequency'
  )
  normalized.fd_base_rate_pa = getValue('product_details.fd.rates.base_rate_pa', 'fd_base_rate_pa', 'fdBaseRatePa')
  normalized.fd_locked_interest_rate_pa = getValue('product_details.fd.rates.locked_interest_rate_pa', 'fd_locked_interest_rate_pa', 'fdLockedInterestRatePa')
  normalized.fd_effective_yield_pa = getValue('product_details.fd.rates.effective_yield_pa', 'fd_effective_yield_pa', 'fdEffectiveYieldPa')
  normalized.fd_senior_citizen_bonus = getValue('product_details.fd.rates.senior_citizen_bonus', 'fd_senior_citizen_bonus', 'fdSeniorCitizenBonus')
  normalized.fd_women_bonus = getValue('product_details.fd.rates.women_bonus', 'fd_women_bonus', 'fdWomenBonus')
  normalized.fd_renewal_bonus = getValue('product_details.fd.rates.renewal_bonus', 'fd_renewal_bonus', 'fdRenewalBonus')
  normalized.fd_total_rate_pa = getValue('product_details.fd.rates.total_rate_pa', 'fd_total_rate_pa', 'fdTotalRatePa')
  normalized.roi_percent = getValue(
    'product_details.fd.rates.total_rate_pa',
    'product_details.bond.instrument.coupon_rate',
    'roi_percent',
    'roiPercent',
    'fd_total_rate_pa',
    'fdTotalRatePa'
  )

  // FD Maturity and payout details (from structured.product_details.fd.maturity or flat)
  normalized.fd_maturity_amount = getValue('product_details.fd.maturity.amount', 'fd_maturity_amount', 'fdMaturityAmount')
  normalized.maturity_amount = getValue(
    'product_details.fd.maturity.amount',
    'maturity_amount',
    'maturityAmount',
    'fd_maturity_amount',
    'fdMaturityAmount'
  )
  normalized.fd_maturity_date = getValue('product_details.fd.maturity.date', 'fd_maturity_date', 'fdMaturityDate')
  normalized.fd_periodic_payout = getValue('product_details.fd.maturity.periodic_payout', 'fd_periodic_payout', 'fdPeriodicPayout')
  normalized.fd_total_interest = getValue('product_details.fd.maturity.total_interest', 'fd_total_interest', 'fdTotalInterest')

  // FD Application details (from structured.product_details.fd.application or flat)
  normalized.fd_application_number = getValue('product_details.fd.application.number', 'fd_application_number', 'fdApplicationNumber')

  // FD Tax details (from structured.product_details.fd.tax or flat)
  normalized.fd_tds_applicable = getValue('product_details.fd.tax.tds_applicable', 'fd_tds_applicable', 'fdTdsApplicable') !== undefined
    ? (getValue('product_details.fd.tax.tds_applicable', 'fd_tds_applicable', 'fdTdsApplicable') || false)
    : null
  normalized.fd_form_15g_15h = getValue('product_details.fd.tax.form_15g_15h', 'fd_form_15g_15h', 'fdForm15g15h') !== undefined
    ? (getValue('product_details.fd.tax.form_15g_15h', 'fd_form_15g_15h', 'fdForm15g15h') || false)
    : null

  // Transaction details (online/offline) (from structured.payment or flat)
  normalized.entry_mode = getValue(
    'payment.entry_mode',
    'transaction_details.entry_mode',
    'entry_mode',
    'entryMode',
    'transactionType'
  )
  normalized.channel = getValue(
    'payment.channel',
    'transaction_details.channel',
    'channel',
    'transaction_channel',
    'othersTransactionType'
  )
  normalized.reference_no = getValue(
    'payment.reference_no',
    'transaction_details.reference_no',
    'reference_no',
    'referenceNo',
    'transaction_reference_no',
    'transactionNumber'
  )
  normalized.txn_date = getValue(
    'payment.transaction_date',
    'transaction_details.txn_date',
    'txn_date',
    'txnDate'
  )
  normalized.bank_name = getValue(
    'payment.instrument.bank.name',
    'transaction_details.bank_name',
    'bank_name',
    'bankName'
  )
  normalized.account_last4 = getValue(
    'payment.account_last4',
    'transaction_details.account_last4',
    'account_last4',
    'accountLast4'
  )
  normalized.notes = getValue(
    'payment.notes',
    'transaction_details.notes',
    'notes',
    'transaction_notes'
  )
  
  // Payment instrument details (from structured.payment.instrument or flat)
  normalized.instrument_type = getValue('payment.instrument.type', 'instrument_type', 'instrumentType')
  normalized.instrument_no = getValue('payment.instrument.number', 'instrument_no', 'instrumentNo')
  normalized.instrument_date = getValue('payment.instrument.date', 'instrument_date', 'instrumentDate')
  normalized.bank_branch = getValue('payment.instrument.bank.branch', 'bank_branch', 'bankBranch')

  // Status and metadata
  normalized.status = receipt.status || receipt.transaction_status || 'Pending'
  normalized.is_deleted = receipt.is_deleted !== undefined ? receipt.is_deleted : (receipt.isDeleted !== undefined ? receipt.isDeleted : false)
  normalized.deleted_at = receipt.deleted_at || receipt.deletedAt || null
  normalized.created_at = receipt.created_at || receipt.createdAt || null

  // Preserve any other fields that might exist
  // This ensures we don't lose data from future fields or nested objects
  Object.keys(receipt).forEach(key => {
    if (!normalized.hasOwnProperty(key)) {
      normalized[key] = receipt[key]
    }
  })

  return normalized
}

/**
 * Normalizes an array of receipts
 * @param {Array} receipts - Array of receipt objects
 * @returns {Array} Array of normalized receipts
 */
export function normalizeReceiptsArray(receipts) {
  if (!Array.isArray(receipts)) {
    return []
  }
  return receipts.map(receipt => normalizeReceiptFields(receipt))
}

/**
 * Helper function to get a field value with fallback to old field names
 * This is useful when you only need a single field
 * 
 * @param {Object} receipt - Receipt object
 * @param {string} fieldName - Primary field name (snake_case)
 * @param {Array<string>} fallbackNames - Array of fallback field names (old camelCase names)
 * @returns {*} Field value or null
 */
export function getReceiptField(receipt, fieldName, fallbackNames = []) {
  if (!receipt || typeof receipt !== 'object') {
    return null
  }

  // Try primary field name first
  if (receipt[fieldName] !== undefined && receipt[fieldName] !== null) {
    return receipt[fieldName]
  }

  // Try fallback names
  for (const fallbackName of fallbackNames) {
    if (receipt[fallbackName] !== undefined && receipt[fallbackName] !== null) {
      return receipt[fallbackName]
    }
  }

  return null
}

