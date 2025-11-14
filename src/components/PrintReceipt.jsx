import React from 'react';
import Logo from './Logo.jsx'
import { getCategoryDisplayName } from '../utils/categoryMapping'
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '');
const fmtAmt = (a) => {
  if (a === null || a === undefined || a === '') return '';
  const n = isNaN(Number(a)) ? a : Number(a);
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n); }
  catch { return String(a); }
};

export default function PrintReceipt({ data = {} }) {
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
          {line('Receipt No', data.receiptNo)}
          {line('Date', fmtDate(data.date))}
          {line('Branch', data.branch)}
        </div>
      </div>

      <div className="rec-grid">
        <div className="card">
          <h3>Employee</h3>
          {line('Name', data.employeeName)}
          {line('Code', data.empCode)}
        </div>

        <div className="card">
          <h3>Investor</h3>
          {line('Investor ID', data.investorId)}
          {line('Name', data.investorName)}
          {line('Address', (data.investorAddress || '').split('\n').map((x,i)=><span key={i}>{x}<br/></span>))}
          <div className="two">
            {line('PIN', data.pinCode)}
            {line('PAN', data.pan)}
          </div>
          {line('Email', data.email)}
        </div>
      </div>

      <div className="card">
        <h3>Investment Details</h3>
        <div className="two">
          {line('Product Category', getCategoryDisplayName(data.product_category) || (Array.isArray(data.txnCategory) && data.txnCategory.length ? data.txnCategory.join(', ') : ''))}
          {line('Transaction', data.txnType)}
        </div>
        <div className="two">
          {line('Mode', data.mode)}
          {line('Period / Installments', [data.sip_stp_swp_period, data.noOfInstallments ? `(${data.noOfInstallments})` : ''].filter(Boolean).join(' '))}
        </div>
        <div className="two">
          {line('From', data.from)}
          {line('To', data.to)}
        </div>
        <div className="two">
          {line('Units / Amount', data.unitsOrAmount)}
          {line('Investment Amount', fmtAmt(data.investmentAmount))}
        </div>
      </div>

      <div className="rec-grid">
        <div className="card">
          <h3>Scheme / Issuer</h3>
          {line('Scheme / Issuer', data.schemeName)}
          {line('Option', data.schemeOption)}
          {line('Appln / Folio / Policy No', data.folioPolicyNo)}
        </div>

        <div className="card">
          <h3>FD / Bonds / NCD</h3>
          {line('Type', data.fdType)}
          <div className="two">
            {line('Client Type', data.clientType)}
            {line('Deposit Period (Y/M)', data.depositPeriodYM)}
          </div>
          <div className="two">
            {line('ROI (%)', data.roi)}
            {line('Interest Payable', data.interestPayable)}
          </div>
          {line('Frequency', data.interestFrequency)}
        </div>
      </div>

      {/* SIP/STP/SWP Specific Details */}
      {(data.mode === 'SIP' || data.mode === 'STP' || data.mode === 'SWP') && (
        <div className="card">
          <h3>{data.mode} Details</h3>
          {data.mode === 'SIP' && (
            <>
              {line('Frequency', data.sip_frequency)}
              {line('Start Date', fmtDate(data.sip_start_date))}
              {line('End Date', data.sip_is_perpetual ? 'Perpetual (40 years)' : fmtDate(data.sip_end_date))}
            </>
          )}
          {data.mode === 'STP' && (
            <>
              {line('Target Scheme', data.stp_target_scheme_name)}
              {line('Total Original Scheme Amount', fmtAmt(data.stp_original_amount))}
              {line('Frequency', data.stp_frequency)}
              {line('Start Date', fmtDate(data.stp_start_date))}
              {line('Transfer Amount', fmtAmt(data.stp_amount))}
            </>
          )}
          {data.mode === 'SWP' && (
            <>
              {line('Frequency', data.swp_frequency)}
              {line('Start Date', fmtDate(data.swp_start_date))}
              {line('Withdrawal Amount', fmtAmt(data.swp_amount))}
            </>
          )}
        </div>
      )}

      <div className="rec-grid">
        <div className="card">
          <h3>Payment Instrument</h3>
          {line('Type', data.instrumentType)}
          <div className="two">
            {line('Number', data.instrumentNo)}
            {line('Date', fmtDate(data.instrumentDate))}
          </div>
          {line('Bank', data.bankName)}
          {line('Branch', data.bankBranch)}
        </div>

        <div className="card">
          <h3>Account / Maturity</h3>
          {line('FDR / Demat / Policy', data.fdr_demat_policy)}
          <div className="two">
            {line('Renewal/Maturity Due', fmtDate(data.renewalDueDate))}
            {line('Maturity Amount', fmtAmt(data.maturityAmount))}
          </div>
          {line('Renewal Amount', fmtAmt(data.renewalAmount))}
        </div>
      </div>


      <div className="rec-note muted">
       Thank you for choosing us.We acknowledge the receipt of your payment and truly appreciate your trust.Be assured of our best services at all times.
      </div>
    </div>
  );
}
