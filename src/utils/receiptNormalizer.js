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
  // Backend stores employee: { code, name, branch }; also support legacy flat keys
  normalized.employee_name = getValue('employee.name', 'employee_name', 'employeeName') ?? receipt.employee?.name ?? null
  normalized.emp_code = getValue('employee.code', 'emp_code', 'empCode') ?? receipt.employee?.code ?? null
  normalized.branch = getValue('employee.branch', 'branch') ?? receipt.employee?.branch ?? receipt.branch ?? null

  // Investor information (from structured.investor or flat)
  normalized.investor_id = getValue('investor.id', 'investor_id', 'investorId') ?? receipt.investor?.id ?? null
  normalized.investor_name = getValue('investor.name', 'investor_name', 'investorName') ?? receipt.investor?.name ?? null
  // Build address from structured format or use flat
  const investorAddress = receipt.investor?.address
  if (investorAddress && typeof investorAddress === 'object') {
    const addressParts = [
      investorAddress.line1,
      investorAddress.line2,
      investorAddress.line3
    ].filter(Boolean)
    const cityState = [investorAddress.city, investorAddress.state].filter(Boolean).join(', ')
    if (cityState) addressParts.push(cityState)
    normalized.investor_address = addressParts.join('\n') || null
    normalized.pin_code = investorAddress.pin_code ?? receipt.pin_code ?? receipt.pinCode ?? null
  } else {
    normalized.investor_address = getValue('investor_address', 'investorAddress') ?? null
    normalized.pin_code = getValue('investor.address.pin_code', 'pin_code', 'pinCode') ?? null
  }
  normalized.pan = getValue('investor.pan', 'pan') ?? receipt.investor?.pan ?? null
  normalized.email = getValue('investor.email', 'email') ?? receipt.investor?.email ?? null
  // Client contact number (legacy receipts sometimes stored it under `phone`)
  normalized.mobile = getValue(
    'investor.mobile',
    'mobile',
    'investor_mobile',
    'phone',
    'phone_number',
    'phoneNumber',
    'client_phone',
    'clientPhone'
  ) ?? receipt.investor?.mobile ?? null

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
    'product_details.bond.transaction.amount',
    'investment_amount',
    'investmentAmount',
    'amount',
    'fd_deposit_amount'
  )
  normalized.period_installments = getValue('transaction.period_installments', 'period_installments', 'periodInstallments', 'sip_stp_swp_period')
  normalized.installments_count = getValue('transaction.installments_count', 'installments_count', 'installmentsCount', 'noOfInstallments')
  normalized.from_text = getValue('transaction.from_text', 'from_text', 'fromText', 'from')
  normalized.to_text = getValue('transaction.to_text', 'to_text', 'toText', 'to')
  normalized.units_or_amount = getValue('transaction.units_or_amount', 'units_or_amount', 'unitsOrAmount')
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

  // Switch Over — prefer root-level fields when present (PATCH / legacy flat) over nested transaction.switch_over
  normalized.switch_from_scheme_code = Object.prototype.hasOwnProperty.call(receipt, 'switch_from_scheme_code')
    ? receipt.switch_from_scheme_code
    : getValue('transaction.switch_over.from_scheme_code', 'switchFromSchemeCode')
  normalized.switch_from_scheme_name = Object.prototype.hasOwnProperty.call(receipt, 'switch_from_scheme_name')
    ? receipt.switch_from_scheme_name
    : getValue('transaction.switch_over.from_scheme_name', 'switchFromSchemeName')
  normalized.switch_to_scheme_code = Object.prototype.hasOwnProperty.call(receipt, 'switch_to_scheme_code')
    ? receipt.switch_to_scheme_code
    : getValue('transaction.switch_over.to_scheme_code', 'switchToSchemeCode')
  normalized.switch_to_scheme_name = Object.prototype.hasOwnProperty.call(receipt, 'switch_to_scheme_name')
    ? receipt.switch_to_scheme_name
    : getValue('transaction.switch_over.to_scheme_name', 'switchToSchemeName')
  normalized.switch_type = Object.prototype.hasOwnProperty.call(receipt, 'switch_type')
    ? receipt.switch_type
    : getValue('transaction.switch_over.type', 'switchType')
  normalized.switch_value = Object.prototype.hasOwnProperty.call(receipt, 'switch_value')
    ? receipt.switch_value
    : getValue('transaction.switch_over.value', 'switchValue')

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

  // FD: expected returns/maturity amount intentionally hidden
  if (normalized.product_category === 'FD') {
    normalized.fd_maturity_amount = null
    normalized.maturity_amount = null
    normalized.fd_periodic_payout = null
    normalized.fd_total_interest = null
  }

  // FD Application details (from structured.product_details.fd.application or flat)
  normalized.fd_application_number = getValue('product_details.fd.application.number', 'fd_application_number', 'fdApplicationNumber')

  // FD type / interest payable (display)
  normalized.fd_type = getValue('product_details.fd.application.transaction_type', 'product_details.insurance.policy.type', 'fd_type', 'fdType', 'insurance_policy_type')
  normalized.interest_payable = getValue('product_details.fd.deposit.payout_frequency', 'interest_payable', 'interestPayable', 'fd_payout_frequency')

  // Bond/NCD (from structured.product_details.bond or flat)
  normalized.bond_issuer_key = getValue('product_details.bond.issuer.key', 'bond_issuer_key', 'bondIssuerKey')
  normalized.bond_issuer_name = getValue('product_details.bond.issuer.name', 'bond_issuer_name', 'bondIssuerName', 'issuer_company', 'issuerCompany')
  normalized.bond_issuer_type = getValue('product_details.bond.issuer.type', 'bond_issuer_type', 'bondIssuerType')
  normalized.bond_scheme_id = getValue('product_details.bond.scheme.id', 'bond_scheme_id', 'bondSchemeId')
  normalized.bond_scheme_name = getValue('product_details.bond.scheme.name', 'bond_scheme_name', 'bondSchemeName', 'scheme_name', 'schemeName')
  normalized.bond_isin = getValue('product_details.bond.scheme.isin', 'bond_isin', 'bondIsin')
  normalized.bond_coupon_rate = getValue('product_details.bond.instrument.coupon_rate', 'bond_coupon_rate', 'bondCouponRate', 'roi_percent', 'roiPercent')
  normalized.bond_face_value = getValue('product_details.bond.instrument.face_value', 'bond_face_value', 'bondFaceValue')
  normalized.bond_issue_date = getValue('product_details.bond.instrument.issue_date', 'bond_issue_date', 'bondIssueDate')
  normalized.bond_maturity_date = getValue('product_details.bond.instrument.maturity_date', 'bond_maturity_date', 'bondMaturityDate', 'renewal_due_date', 'renewalDueDate')
  normalized.renewal_due_date = getValue('product_details.bond.instrument.maturity_date', 'renewal_due_date', 'renewalDueDate', 'bond_maturity_date', 'bondMaturityDate')
  normalized.bond_transaction_type = getValue('product_details.bond.transaction.type', 'bond_transaction_type', 'bondTransactionType', 'txn_type', 'txnType')
  normalized.bond_number_of_units = getValue('product_details.bond.transaction.number_of_units', 'bond_number_of_units', 'bondNumberOfUnits')
  normalized.bond_application_number = getValue('product_details.bond.application.number', 'bond_application_number', 'bondApplicationNumber')
  normalized.bond_form_15g_15h = getValue('product_details.bond.tax.form_15g_15h', 'bond_form_15g_15h', 'bondForm15g15h')

  // Insurance (from structured.product_details.insurance or flat)
  normalized.insurance_issuer_key = getValue('product_details.insurance.issuer.key', 'insurance_issuer_key', 'insuranceIssuerKey')
  normalized.insurance_product_id = getValue('product_details.insurance.product.id', 'insurance_product_id', 'insuranceProductId')
  normalized.insurance_product_name = getValue('product_details.insurance.product.name', 'insurance_product_name', 'insuranceProductName', 'scheme_name', 'schemeName')
  normalized.insurance_category = getValue('product_details.insurance.product.category', 'insurance_category', 'insuranceCategory')
  normalized.insurance_sub_category = getValue('product_details.insurance.product.sub_category', 'insurance_sub_category', 'insuranceSubCategory')
  normalized.insurance_policy_number = getValue('product_details.insurance.policy.number', 'insurance_policy_number', 'insurancePolicyNumber', 'folio_policy_no', 'folioPolicyNo')
  normalized.insurance_sum_assured = getValue('product_details.insurance.coverage.sum_assured', 'insurance_sum_assured', 'insuranceSumAssured')
  normalized.insurance_policy_term_years = getValue('product_details.insurance.coverage.policy_term_years', 'insurance_policy_term_years', 'insurancePolicyTermYears', 'insurance_term')
  normalized.insurance_premium_frequency = getValue('product_details.insurance.policy.premium_frequency', 'insurance_premium_frequency', 'insurancePremiumFrequency', 'interest_frequency', 'interestFrequency')
  normalized.insurance_premium_payment_term = getValue('product_details.insurance.policy.premium_payment_term', 'insurance_premium_payment_term', 'insurancePremiumPaymentTerm')
  normalized.insurance_date_of_issue = getValue('product_details.insurance.coverage.policy_start_date', 'insurance_date_of_issue', 'insuranceDateOfIssue', 'insurance_policy_start_date')
  normalized.insurance_renewal_date = getValue(
    'product_details.insurance.policy.renewal_date',
    'product_details.insurance.coverage.renewal_date',
    'insurance_renewal_date',
    'insuranceRenewalDate'
  )
  normalized.insurance_maturity_date = getValue('product_details.insurance.coverage.maturity_date', 'insurance_maturity_date', 'insuranceMaturityDate')

  // FD Tax details (from structured.product_details.fd.tax or flat)
  normalized.fd_tds_applicable = getValue('product_details.fd.tax.tds_applicable', 'fd_tds_applicable', 'fdTdsApplicable') !== undefined
    ? (getValue('product_details.fd.tax.tds_applicable', 'fd_tds_applicable', 'fdTdsApplicable') || false)
    : null
  normalized.fd_form_15g_15h = getValue('product_details.fd.tax.form_15g_15h', 'fd_form_15g_15h', 'fdForm15g15h') !== undefined
    ? (getValue('product_details.fd.tax.form_15g_15h', 'fd_form_15g_15h', 'fdForm15g15h') || false)
    : null

  // Transaction details (online/offline) (prefer latest flat fields, fall back to structured.payment)
  normalized.entry_mode = getValue(
    'entry_mode',
    'transaction_details.entry_mode',
    'payment.entry_mode',
    'entryMode',
    'transactionType'
  )
  normalized.channel = getValue(
    'transaction_channel',
    'channel',
    'transaction_details.channel',
    'payment.channel',
    'othersTransactionType'
  )
  normalized.reference_no = getValue(
    'transaction_reference_no',
    'reference_no',
    'referenceNo',
    'transaction_details.reference_no',
    'payment.reference_no',
    'transactionNumber'
  )
  normalized.txn_date = getValue(
    'txn_date',
    'txnDate',
    'transaction_details.txn_date',
    'payment.transaction_date'
  )
  normalized.bank_name = getValue(
    'bank_name',
    'bankName',
    'transaction_details.bank_name',
    'payment.instrument.bank.name'
  )
  normalized.account_last4 = getValue(
    'account_last4',
    'accountLast4',
    'transaction_details.account_last4',
    'payment.account_last4'
  )
  normalized.notes = getValue(
    'transaction_notes',
    'notes',
    'transaction_details.notes',
    'payment.notes'
  )
  
  // Payment instrument details (prefer flat fields, fall back to structured.payment.instrument)
  normalized.instrument_type = getValue('instrument_type', 'instrumentType', 'payment.instrument.type')
  normalized.instrument_no = getValue('instrument_no', 'instrumentNo', 'payment.instrument.number')
  normalized.instrument_date = getValue('instrument_date', 'instrumentDate', 'payment.instrument.date')
  normalized.bank_branch = getValue('bank_branch', 'bankBranch', 'payment.instrument.bank.branch')

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

