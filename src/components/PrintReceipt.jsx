import React from 'react';
import Logo from './Logo.jsx'
import { getCategoryDisplayName } from '../utils/categoryMapping'
import { normalizeReceiptFields } from '../utils/receiptNormalizer'

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '');
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
    branch: normalized.branch,
    
    // Employee
    employeeName: normalized.employee_name,
    empCode: normalized.emp_code,
    
    // Investor
    investorId: normalized.investor_id,
    investorName: normalized.investor_name,
    investorAddress: normalized.investor_address,
    pinCode: normalized.pin_code,
    pan: normalized.pan,
    email: normalized.email,
    
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
  }
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
          {line('Email', receipt.email)}
        </div>
      </div>

      <div className="card">
        <h3>Investment Details</h3>
        <div className="two">
          {line('Product Category', getCategoryDisplayName(receipt.product_category) || (Array.isArray(receipt.txnCategory) && receipt.txnCategory.length ? receipt.txnCategory.join(', ') : ''))}
          {line('Transaction', receipt.txnType)}
        </div>
        <div className="two">
          {line('Mode', receipt.mode)}
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
      </div>

      <div className="rec-grid">
        <div className="card">
          <h3>Scheme / Issuer</h3>
          {line('Scheme / Issuer', receipt.schemeName)}
          {line('Option', receipt.schemeOption)}
          {line('Appln / Folio / Policy No', receipt.folioPolicyNo)}
        </div>

        <div className="card">
          <h3>FD / Bonds / NCD</h3>
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
      </div>

      {/* SIP/STP/SWP Specific Details */}
      {(receipt.mode === 'SIP' || receipt.mode === 'STP' || receipt.mode === 'SWP') && (
        <div className="card">
          <h3>{receipt.mode} Details</h3>
          {receipt.mode === 'SIP' && (
            <>
              {line('Frequency', receipt.sip_frequency)}
              {line('Start Date', fmtDate(receipt.sip_start_date))}
              {line('End Date', receipt.sip_is_perpetual ? 'Perpetual (40 years)' : fmtDate(receipt.sip_end_date))}
            </>
          )}
          {receipt.mode === 'STP' && (
            <>
              {line('Target Scheme', receipt.stp_target_scheme_name)}
              {line('Total Original Scheme Amount', fmtAmt(receipt.stp_original_amount))}
              {line('Frequency', receipt.stp_frequency)}
              {line('Start Date', fmtDate(receipt.stp_start_date))}
              {line('Transfer Amount', fmtAmt(receipt.stp_amount))}
            </>
          )}
          {receipt.mode === 'SWP' && (
            <>
              {line('Frequency', receipt.swp_frequency)}
              {line('Start Date', fmtDate(receipt.swp_start_date))}
              {line('Withdrawal Amount', fmtAmt(receipt.swp_amount))}
            </>
          )}
        </div>
      )}

      <div className="rec-grid">
        <div className="card">
          <h3>Payment Instrument</h3>
          {line('Type', receipt.instrumentType)}
          <div className="two">
            {line('Number', receipt.instrumentNo)}
            {line('Date', fmtDate(receipt.instrumentDate))}
          </div>
          {line('Bank', receipt.bankName)}
          {line('Branch', receipt.bankBranch)}
        </div>

        <div className="card">
          <h3>Account / Maturity</h3>
          {line('FDR / Demat / Policy', receipt.fdr_demat_policy)}
          <div className="two">
            {line('Renewal/Maturity Due', fmtDate(receipt.renewalDueDate))}
            {line('Maturity Amount', fmtAmt(receipt.maturityAmount))}
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
