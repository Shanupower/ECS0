import React from 'react';
import Logo from './Logo.jsx'
import { getCategoryDisplayName } from '../utils/categoryMapping'
import { normalizeReceiptFields } from '../utils/receiptNormalizer'

const fmtDate = (value) => {
  if (!value) return '';
  const raw = String(value).trim();
  let date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    date = new Date(y, m - 1, d);
  } else {
    date = new Date(raw);
  }
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};
const fmtAmt = (a) => {
  if (a === null || a === undefined || a === '') return '';
  const n = isNaN(Number(a)) ? a : Number(a);
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n); }
  catch { return String(a); }
};

export default function PrintReceipt({ data = {} }) {
  // Normalize receipt data for backward compatibility
  const normalized = normalizeReceiptFields(data)
  
  // Map normalized (snake_case) fields to camelCase for PrintReceipt component
  const receipt = {
    // Receipt identification
    receiptNo: normalized.receipt_no,
    date: normalized.date,
    branch: normalized.branch ?? data.employee?.branch ?? data.branch ?? '',
    
    // Employee (normalizer already handles nested employee and flat keys)
    employeeName: normalized.employee_name ?? data.employee?.name ?? '',
    empCode: normalized.emp_code ?? data.employee?.code ?? '',
    
    // Investor (normalizer already handles nested employee/investor and flat keys)
    investorId: normalized.investor_id ?? data.investor?.id ?? '',
    investorName: normalized.investor_name ?? data.investor?.name ?? '',
    investorAddress: normalized.investor_address ?? '',
    pinCode: normalized.pin_code ?? data.investor?.address?.pin_code ?? '',
    pan: normalized.pan ?? data.investor?.pan ?? '',
    email: normalized.email ?? data.investor?.email ?? '',
    mobile: normalized.mobile ?? data.investor?.mobile ?? '',
    
    // Product and transaction
    product_category: normalized.product_category,
    txnCategory: normalized.txnCategory ? [normalized.txnCategory] : [],
    txnType: normalized.txn_type,
    mode: normalized.mode,
    
    // Investment details
    sip_stp_swp_period: normalized.period_installments,
    noOfInstallments: normalized.installments_count,
    from: normalized.from_text,
    to: normalized.to_text,
    unitsOrAmount: normalized.units_or_amount,
    investmentAmount: normalized.investment_amount,
    
    // Scheme/Product
    schemeName: normalized.scheme_name,
    schemeOption: normalized.scheme_option,
    folioPolicyNo: normalized.folio_policy_no,
    
    // FD/Bonds fields
    fdType: normalized.fd_type,
    clientType: normalized.client_type,
    depositPeriodYM: normalized.deposit_period_ym,
    roi: normalized.roi_percent,
    interestPayable: normalized.interest_payable,
    interestFrequency: normalized.interest_frequency,
    instrumentType: normalized.instrument_type,
    instrumentNo: normalized.instrument_no,
    instrumentDate: normalized.instrument_date,
    bankName: normalized.bank_name,
    bankBranch: normalized.bank_branch,
    entryMode: normalized.entry_mode,
    channel: normalized.channel,
    referenceNo: normalized.reference_no,
    notes: normalized.notes,
    txnDate: normalized.txn_date,
    fdr_demat_policy: normalized.fdr_demat_policy,
    renewalDueDate: normalized.renewal_due_date,
    maturityAmount: normalized.maturity_amount,
    renewalAmount: normalized.renewal_amount,
    
    // SIP fields
    sip_frequency: normalized.sip_frequency,
    sip_start_date: normalized.sip_start_date,
    sip_end_date: normalized.sip_end_date,
    sip_is_perpetual: normalized.sip_is_perpetual,
    
    // STP fields
    stp_target_scheme_code: normalized.stp_target_scheme_code,
    stp_target_scheme_name: normalized.stp_target_scheme_name,
    stp_frequency: normalized.stp_frequency,
    stp_start_date: normalized.stp_start_date,
    stp_amount: normalized.stp_amount,
    stp_original_amount: normalized.stp_original_amount,
    
    // Switch Over fields (MF)
    switch_from_scheme_name: normalized.switch_from_scheme_name,
    switch_to_scheme_name: normalized.switch_to_scheme_name,
    
    // SWP fields
    swp_frequency: normalized.swp_frequency,
    swp_start_date: normalized.swp_start_date,
    swp_amount: normalized.swp_amount,
    
    // FD-specific fields
    fd_issuer_key: normalized.fd_issuer_key,
    fd_issuer_name: normalized.fd_issuer_name,
    fd_issuer_type: normalized.fd_issuer_type,
    fd_scheme_id: normalized.fd_scheme_id,
    fd_scheme_name: normalized.fd_scheme_name,
    fd_is_cumulative: normalized.fd_is_cumulative,
    fd_deposit_amount: normalized.fd_deposit_amount,
    fd_tenure_months: normalized.fd_tenure_months,
    fd_payout_frequency: normalized.fd_payout_frequency,
    fd_booking_date: normalized.fd_booking_date,
    fd_locked_interest_rate_pa: normalized.fd_locked_interest_rate_pa,
    fd_effective_yield_pa: normalized.fd_effective_yield_pa,
    fd_maturity_amount: normalized.fd_maturity_amount,
    fd_maturity_date: normalized.fd_maturity_date,
    fd_periodic_payout: normalized.fd_periodic_payout,
    fd_total_interest: normalized.fd_total_interest,
    fd_base_rate_pa: normalized.fd_base_rate_pa,
    fd_senior_citizen_bonus: normalized.fd_senior_citizen_bonus,
    fd_women_bonus: normalized.fd_women_bonus,
    fd_renewal_bonus: normalized.fd_renewal_bonus,
    fd_tds_applicable: normalized.fd_tds_applicable,
    fd_form_15g_15h: normalized.fd_form_15g_15h,
    fd_application_number: normalized.fd_application_number,
    fd_transaction_type: normalized.fd_transaction_type,
    fd_renewal_investment_type: normalized.fd_renewal_investment_type,
    fd_renewal_additional_amount: normalized.fd_renewal_additional_amount,

    // Bond/NCD
    bond_issuer_key: normalized.bond_issuer_key,
    bond_issuer_name: normalized.bond_issuer_name,
    bond_scheme_name: normalized.bond_scheme_name,
    bond_isin: normalized.bond_isin,
    bond_coupon_rate: normalized.bond_coupon_rate,
    bond_face_value: normalized.bond_face_value,
    bond_issue_date: normalized.bond_issue_date,
    bond_maturity_date: normalized.bond_maturity_date,
    bond_transaction_type: normalized.bond_transaction_type,
    bond_number_of_units: normalized.bond_number_of_units,
    bond_application_number: normalized.bond_application_number,

    // Insurance
    insurance_issuer_key: normalized.insurance_issuer_key,
    insurance_product_name: normalized.insurance_product_name,
    insurance_policy_number: normalized.insurance_policy_number,
    insurance_sum_assured: normalized.insurance_sum_assured,
    insurance_premium_frequency: normalized.insurance_premium_frequency,
    insurance_date_of_issue: normalized.insurance_date_of_issue,
    insurance_maturity_date: normalized.insurance_maturity_date,
    insurance_policy_term_years: normalized.insurance_policy_term_years,
    insurance_premium_payment_term: normalized.insurance_premium_payment_term,
    insurance_category: normalized.insurance_category,
    insurance_sub_category: normalized.insurance_sub_category,
  }

  const normalizeTxnTypeToDisplayMode = (raw) => {
    const v = String(raw || '').trim()
    if (!v) return ''
    const upper = v.toUpperCase()
    if (upper === 'SWITCHOVER' || upper === 'SWITCH_OVER') return 'Switch Over'
    if (v === 'Switch Over') return 'Switch Over'
    if (v === 'Lumpsum' || v === 'LumpSum' || v === 'Lump Sum') return 'Lump Sum'
    return v // SIP / SWP / STP
  }

  const mfModeDisplay = receipt.product_category === 'MF'
    ? (normalizeTxnTypeToDisplayMode(receipt.txnType) || receipt.mode || '')
    : ''
  const line = (label, value) => (
    <div className="rec-row">
      <div className="rec-label">{label}</div>
      <div className="rec-value">{value || <span className="muted">—</span>}</div>
    </div>
  );

  return (
    <div className="receipt">
      <div className="rec-header">
       <div className="rec-brand">
  <Logo size={42} alt="ECS Financial" />
  <div>
    <div className="font-bold text-lg text-red-600 dark:text-red-400">ECS Financial</div>
    <div className="muted" style={{ fontSize: 12 }}>AMFI Registered Mutual Fund Distributor</div>
  </div>
</div>
        <div className="rec-meta">
          {line('Receipt No', receipt.receiptNo)}
          {line('Date', fmtDate(receipt.date))}
          {line('Branch', receipt.branch)}
        </div>
      </div>

      <div className="rec-grid">
        <div className="card">
          <h3>Employee</h3>
          {line('Name', receipt.employeeName)}
          {line('Code', receipt.empCode)}
        </div>

        <div className="card">
          <h3>Investor</h3>
          {line('Investor ID', receipt.investorId)}
          {line('Name', receipt.investorName)}
          {line('Address', (receipt.investorAddress || '').split('\n').map((x,i)=><span key={i}>{x}<br/></span>))}
          <div className="two">
            {line('PIN', receipt.pinCode)}
            {line('PAN', receipt.pan)}
          </div>
          {receipt.mobile && line('Mobile', receipt.mobile)}
          {line('Email', receipt.email)}
        </div>
      </div>

      <div className="card">
        <h3>Investment Details</h3>
        <div className="two">
          {line('Product Category', getCategoryDisplayName(receipt.product_category) || (Array.isArray(receipt.txnCategory) && receipt.txnCategory.length ? receipt.txnCategory.join(', ') : ''))}
          {line('Transaction', receipt.txnType)}
        </div>
        {receipt.product_category === 'MF' && (
          <>
            <div className="two">
              {line('Period / Installments', [receipt.sip_stp_swp_period, receipt.noOfInstallments ? `(${receipt.noOfInstallments})` : ''].filter(Boolean).join(' '))}
            </div>
            <div className="two">
              {line('From', receipt.from)}
              {line('To', receipt.to)}
            </div>
            <div className="two">
              {line('Units / Amount', receipt.unitsOrAmount)}
              {line('Investment Amount', fmtAmt(receipt.investmentAmount))}
            </div>
          </>
        )}
        {receipt.product_category !== 'MF' && line('Investment Amount', fmtAmt(receipt.investmentAmount))}
      </div>

      <div className="rec-grid">
        <div className="card">
          <h3>Scheme / Issuer</h3>
          {line('Scheme / Issuer', receipt.schemeName)}
          {line('Option', receipt.schemeOption)}
          {line('Appln / Folio / Policy No', receipt.folioPolicyNo)}
        </div>

        {(receipt.product_category === 'BOND' || receipt.product_category === 'NCD') && (
          <div className="card">
            <h3>Bond / NCD Details</h3>
            {line('Issuer', receipt.bond_issuer_name)}
            {line('Scheme', receipt.bond_scheme_name)}
            {line('ISIN', receipt.bond_isin)}
            <div className="two">
              {line('Coupon rate (%)', receipt.bond_coupon_rate)}
              {line('Face value', receipt.bond_face_value ? fmtAmt(receipt.bond_face_value) : null)}
            </div>
            <div className="two">
              {line('Issue date', fmtDate(receipt.bond_issue_date))}
              {line('Maturity date', fmtDate(receipt.bond_maturity_date))}
            </div>
            {line('Transaction type', receipt.bond_transaction_type)}
            {line('Number of units', receipt.bond_number_of_units)}
            {line('Application number', receipt.bond_application_number)}
          </div>
        )}

        {receipt.product_category === 'INS' && (
          <div className="card">
            <h3>Insurance Details</h3>
            {line('Product', receipt.insurance_product_name)}
            {line('Policy number', receipt.insurance_policy_number)}
            {line('Sum assured', receipt.insurance_sum_assured ? fmtAmt(receipt.insurance_sum_assured) : null)}
            <div className="two">
              {line('Premium frequency', receipt.insurance_premium_frequency)}
              {line('Policy term (years)', receipt.insurance_policy_term_years)}
            </div>
            {receipt.insurance_premium_payment_term && line('Premium payment term', receipt.insurance_premium_payment_term)}
            <div className="two">
              {line('Date of issue', fmtDate(receipt.insurance_date_of_issue))}
              {line('Maturity date', fmtDate(receipt.insurance_maturity_date))}
            </div>
            {(receipt.insurance_category || receipt.insurance_sub_category) && (
              <div className="two">
                {line('Category', receipt.insurance_category)}
                {line('Sub-category', receipt.insurance_sub_category)}
              </div>
            )}
          </div>
        )}

        {receipt.product_category === 'FD' && (
          <div className="card">
            <h3>FD Details</h3>
            {line('Type', receipt.fdType)}
            {(receipt.fd_transaction_type || receipt.txn_type) && line('Transaction Type', receipt.fd_transaction_type || receipt.txn_type || 'Fresh')}
            {receipt.fd_transaction_type === 'Renewal' && receipt.fd_renewal_investment_type && (
              <>
                {line('Renewal Investment',
                  receipt.fd_renewal_investment_type === 'same' ? 'Same Amount' :
                  receipt.fd_renewal_investment_type === 'increased' ? 'Increased Amount' :
                  receipt.fd_renewal_investment_type === 'decreased' ? 'Decreased Amount' :
                  receipt.fd_renewal_investment_type
                )}
                {receipt.fd_renewal_additional_amount && line(
                  receipt.fd_renewal_investment_type === 'increased' ? 'Additional Amount' : 'Withdrawal Amount',
                  fmtAmt(receipt.fd_renewal_additional_amount)
                )}
              </>
            )}
            <div className="two">
              {line('Client Type', receipt.clientType)}
              {line('Deposit Period (Y/M)', receipt.depositPeriodYM)}
            </div>
            <div className="two">
              {line('ROI (%)', receipt.roi)}
              {line('Interest Payable', receipt.interestPayable)}
            </div>
            {line('Frequency', receipt.interestFrequency)}
          </div>
        )}
      </div>

      {/* SIP/STP/SWP Specific Details */}
      {(mfModeDisplay === 'SIP' || mfModeDisplay === 'STP' || mfModeDisplay === 'SWP') && (
        <div className="card">
          <h3>{mfModeDisplay} Details</h3>
          {mfModeDisplay === 'SIP' && (
            <>
              {line('Frequency', receipt.sip_frequency)}
              {line('Start Date', fmtDate(receipt.sip_start_date))}
              {line('End Date', receipt.sip_is_perpetual ? 'Perpetual (40 years)' : fmtDate(receipt.sip_end_date))}
            </>
          )}
          {mfModeDisplay === 'STP' && (
            <>
              {line('Source Scheme', receipt.schemeName)}
              {line('Target Scheme', receipt.stp_target_scheme_name)}
              {line('Total Original Scheme Amount', fmtAmt(receipt.stp_original_amount))}
              {line('Frequency', receipt.stp_frequency)}
              {line('Start Date', fmtDate(receipt.stp_start_date))}
              {line('Transfer Amount', fmtAmt(receipt.stp_amount))}
            </>
          )}
          {mfModeDisplay === 'SWP' && (
            <>
              {line('Frequency', receipt.swp_frequency)}
              {line('Start Date', fmtDate(receipt.swp_start_date))}
              {line('Withdrawal Amount', fmtAmt(receipt.swp_amount))}
            </>
          )}
        </div>
      )}

      {mfModeDisplay === 'Switch Over' && (
        <div className="card">
          <h3>Switch Over Details</h3>
          {line('Source Scheme', receipt.switch_from_scheme_name || receipt.schemeName)}
          {line('Target Scheme', receipt.switch_to_scheme_name || receipt.schemeName)}
        </div>
      )}

      <div className="rec-grid">
        <div className="card">
          <h3>Payment / Transaction details</h3>
          {line('Payment type', receipt.entryMode || (receipt.referenceNo || receipt.channel) ? 'Online' : (receipt.instrumentType || receipt.instrumentNo || receipt.bankName) ? 'Offline' : (receipt.notes || receipt.channel) ? 'Others' : null)}
          {(receipt.entryMode === 'Online' || (!receipt.entryMode && (receipt.referenceNo || receipt.channel))) && (receipt.referenceNo || receipt.channel) && line('Reference / Transaction number', receipt.referenceNo || receipt.channel)}
          {(receipt.entryMode === 'Others' || (!receipt.entryMode && (receipt.notes || receipt.channel) && !receipt.referenceNo && !receipt.instrumentNo)) && (receipt.notes || receipt.channel) && line('Details', receipt.notes || receipt.channel)}
          {(receipt.instrumentType || receipt.instrumentNo || receipt.bankName) && (
            <>
              {line('Instrument type', receipt.instrumentType)}
              <div className="two">
                {line('Number', receipt.instrumentNo)}
                {line('Date', fmtDate(receipt.instrumentDate))}
              </div>
              {line('Bank', receipt.bankName)}
              {line('Branch', receipt.bankBranch)}
            </>
          )}
          {(receipt.txnDate && (receipt.entryMode || receipt.referenceNo || receipt.instrumentNo || receipt.notes)) && line('Transaction date', fmtDate(receipt.txnDate))}
        </div>

        <div className="card">
          <h3>Account / Maturity</h3>
          {line('FDR / Demat / Policy', receipt.fdr_demat_policy)}
          <div className="two">
            {line('Renewal/Maturity Due', fmtDate(receipt.renewalDueDate))}
            {receipt.product_category !== 'FD' && line('Maturity Amount', fmtAmt(receipt.maturityAmount))}
          </div>
          {line('Renewal Amount', fmtAmt(receipt.renewalAmount))}
        </div>
      </div>


      <div className="rec-note muted">
       Thank you for choosing us.We acknowledge the receipt of your payment and truly appreciate your trust.Be assured of our best services at all times.
      </div>
    </div>
  );
}
