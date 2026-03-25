import React, { useEffect, useState } from 'react'
import SearchableSelect from '../SearchableSelect.jsx'
import { api } from '../../api'
import DatePickerInput from '../ui/DatePickerInput.jsx'

/** General or Health: same simple form (Date of Issue, Policy Period years, auto Renewal Date, Policy No, Premium) */
const isSimpleInsuranceForm = (product) => {
  const cat = (product?.category || '').toLowerCase()
  return cat === 'general' || cat === 'health'
}

/** Calendar day immediately before a date (YYYY-MM-DD) */
function dayBeforeDateOfIssue(dateStr) {
  if (!dateStr) return ''
  const d = new Date(`${dateStr}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function addYearsToDate(dateStr, years) {
  if (!dateStr) return ''
  const y = Number(years)
  if (!Number.isFinite(y)) return ''
  const d = new Date(`${dateStr}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  d.setFullYear(d.getFullYear() + y)
  return d.toISOString().slice(0, 10)
}

function computeRenewalDate(dateOfIssueStr, policyYears) {
  if (!dateOfIssueStr || !policyYears) return ''
  const plusYears = addYearsToDate(dateOfIssueStr, policyYears)
  if (!plusYears) return ''
  return dayBeforeDateOfIssue(plusYears)
}

const TXN_TYPES = [
  { value: 'Fresh', label: 'Fresh' },
  { value: 'Renewal', label: 'Renewal' }
]

export default function StepInsuranceDetails({ onBack, onNext, token, issuer, product }) {
  const [txnType, setTxnType] = useState('Fresh')
  const [oldRenewalPolicyNo, setOldRenewalPolicyNo] = useState('')
  const [premiumAmount, setPremiumAmount] = useState('')
  const [policyNo, setPolicyNo] = useState('')
  const [policyPeriod, setPolicyPeriod] = useState('')
  const [dateOfIssue, setDateOfIssue] = useState('')
  const [renewalDate, setRenewalDate] = useState('')
  const [sumAssured, setSumAssured] = useState('')
  const [term, setTerm] = useState('')
  const [premiumPayTerm, setPremiumPayTerm] = useState('')
  const [premiumPaymentTermType, setPremiumPaymentTermType] = useState('') // '' | 'Single Premium' | 'Limited Pay' | '5' | '10' | '12' | '15' | '20' | '25' | '30' | 'Other'
  const [premiumPayTermOther, setPremiumPayTermOther] = useState('') // when type === 'Other'
  const [paymentSchedule, setPaymentSchedule] = useState('')

  const [ridersLoading, setRidersLoading] = useState(false)
  const [riders, setRiders] = useState([])
  const [selectedRiders, setSelectedRiders] = useState([])
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    const issuerKey = issuer?._key
    const productId = product?.product_id
    if (!token || !issuerKey || !productId) {
      setRiders([])
      setSelectedRiders([])
      return
    }

    setRidersLoading(true)
    api.getInsuranceRiders(token, issuerKey, productId)
      .then(data => {
        const activeRiders = Array.isArray(data) ? data.filter(r => r.is_active !== false) : []
        setRiders(activeRiders)
      })
      .catch(error => {
        console.error('Failed to load insurance riders:', error)
        setRiders([])
      })
      .finally(() => setRidersLoading(false))
  }, [token, issuer, product])

  const simpleForm = isSimpleInsuranceForm(product)

  // Renewal date on file = (Date of issue + policy period years) - 1 day
  useEffect(() => {
    if (!dateOfIssue) {
      setRenewalDate('')
      return
    }

    if (simpleForm && policyPeriod) {
      setRenewalDate(computeRenewalDate(dateOfIssue, policyPeriod))
    } else {
      // Fallback: if policy period isn't available, keep the older simpler rule.
      setRenewalDate(dayBeforeDateOfIssue(dateOfIssue))
    }
  }, [dateOfIssue, policyPeriod, simpleForm])

  const handleNext = () => {
    setValidationError('')
    if (txnType === 'Renewal' && !(oldRenewalPolicyNo || '').trim()) {
      setValidationError('Please enter the old renewal policy number')
      return
    }
    if (!premiumAmount || parseFloat(premiumAmount) <= 0) {
      setValidationError('Please enter a valid premium amount')
      return
    }

    const issuerName = issuer?.short_name || issuer?.legal_name || ''
    const productName = product?.product_name || ''
    const insuranceAmount = parseFloat(premiumAmount)

    // Resolve Premium Payment Term for payload (used by backend for PPT-based CC/SI)
    const pptValue = premiumPaymentTermType === 'Other'
      ? (premiumPayTermOther ? parseFloat(premiumPayTermOther) : null)
      : (premiumPaymentTermType === 'Single Premium' || premiumPaymentTermType === 'Limited Pay'
          ? premiumPaymentTermType
          : (premiumPaymentTermType ? parseFloat(premiumPaymentTermType) : (premiumPayTerm ? parseFloat(premiumPayTerm) : null)))
    const insurancePremiumPaymentTerm = pptValue != null && pptValue !== '' ? pptValue : (premiumPayTerm ? parseFloat(premiumPayTerm) : null)

    // CC/SI: use ppt_slabs when product has them (Life PPT-based); else Fresh/Renewal or flat product cc/si
    const isLife = (product?.category || '').toLowerCase() === 'life'
    const pptSlabs = product?.ppt_slabs && Array.isArray(product.ppt_slabs) ? product.ppt_slabs : []
    let ccPercent = parseFloat(product?.cc ?? 0)
    let siPercent = parseFloat(product?.si ?? 0)
    if (isLife && pptSlabs.length > 0 && (insurancePremiumPaymentTerm !== null && insurancePremiumPaymentTerm !== undefined || insurancePremiumPaymentTerm === 'Single Premium' || insurancePremiumPaymentTerm === 'Limited Pay')) {
      const singleOrZero = insurancePremiumPaymentTerm === 'Single Premium' || insurancePremiumPaymentTerm === 0 || insurancePremiumPaymentTerm === ''
      const limitedPay = insurancePremiumPaymentTerm === 'Limited Pay'
      const pptYears = typeof insurancePremiumPaymentTerm === 'number' && !Number.isNaN(insurancePremiumPaymentTerm) ? insurancePremiumPaymentTerm : null
      let slab = null
      if (singleOrZero) slab = pptSlabs.find(s => s.ppt_type === 'Single Premium')
      else if (limitedPay) slab = pptSlabs.find(s => s.ppt_type === 'Limited Pay')
      else if (pptYears != null) {
        slab = pptSlabs.find(s => {
          if (s.ppt_type !== 'PPT') return false
          const min = s.ppt_years_min != null ? Number(s.ppt_years_min) : null
          const max = s.ppt_years_max != null ? Number(s.ppt_years_max) : null
          if (min != null && pptYears < min) return false
          if (max != null && pptYears > max) return false
          return true
        })
      }
      if (slab) {
        ccPercent = parseFloat(slab.cc ?? product?.cc ?? 0)
        siPercent = parseFloat(slab.si ?? product?.si ?? 0)
      }
    } else if (isLife && (product?.cc_fresh != null || product?.cc_renewal != null)) {
      ccPercent = txnType === 'Renewal' ? parseFloat(product?.cc_renewal ?? product?.cc ?? 0) : parseFloat(product?.cc_fresh ?? product?.cc ?? 0)
      siPercent = txnType === 'Renewal' ? parseFloat(product?.si_renewal ?? product?.si ?? 0) : parseFloat(product?.si_fresh ?? product?.si ?? 0)
    }
    const ccAmount = Math.round((ccPercent / 100) * insuranceAmount * 100) / 100
    const siAmount = Math.round((siPercent / 100) * insuranceAmount * 100) / 100

    const selectedRiderDetails = selectedRiders.length > 0
      ? riders
          .filter(rider => selectedRiders.includes(rider.rider_id))
          .map(rider => ({
            id: rider.rider_id,
            name: rider.rider_name,
            premium_percentage: rider.rider_premium_percentage || null,
            premium_fixed: rider.rider_premium_fixed || null
          }))
      : []

    const normalized = {
      product_category: 'INS',
      issuerCompany: issuerName,
      issuerCategory: product?.category || 'Insurance',
      schemeName: productName,
      investmentAmount: insuranceAmount,
      investment_amount: insuranceAmount,
      folioPolicyNo: policyNo,
      insurance_issuer_key: issuer?._key || null,
      insurance_product_id: product?.product_id || null,
      insurance_product_name: productName,
      insurance_category: product?.category || null,
      insurance_sub_category: product?.sub_category || null,
      insurance_selected_riders: selectedRiders.length > 0 ? selectedRiders : null,
      insurance_selected_riders_details: selectedRiderDetails.length > 0 ? selectedRiderDetails : null,
      insurance_date_of_issue: dateOfIssue || null,
      insurance_renewal_date: renewalDate || null,
      insurance_policy_period: simpleForm && policyPeriod ? parseFloat(policyPeriod) || null : (policyPeriod || null),
      insurance_sum_assured: sumAssured ? parseFloat(sumAssured) : null,
      insurance_term: term ? parseFloat(term) : null,
      insurance_premium_pay_term: typeof insurancePremiumPaymentTerm === 'number' ? insurancePremiumPaymentTerm : (premiumPayTerm ? parseFloat(premiumPayTerm) : null),
      insurance_premium_payment_term: insurancePremiumPaymentTerm,
      insurance_payment_schedule: paymentSchedule || null,
      insurance_money_back: product?.money_back || false,
      insurance_old_policy_no: txnType === 'Renewal' ? (oldRenewalPolicyNo || '').trim() || null : null,
      txnType: txnType,
      cc: ccAmount,
      si: siAmount,
      schemeOption: paymentSchedule || 'Annual',
      instrumentType: 'Policy',
      instrumentNo: policyNo || `INS-${Date.now()}`
    }

    onNext(normalized)
  }

  return (
    <div>
      <h3 className="mt-0 text-lg font-semibold text-gray-900 dark:text-gray-100">Step 6 — Insurance Details</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        Issuer: <strong className="text-gray-900 dark:text-white">{issuer?.short_name || issuer?.legal_name}</strong>
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Product: <strong className="text-gray-900 dark:text-white">{product?.product_name || '—'}</strong>
      </p>

      {validationError && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-300">
          {validationError}
        </div>
      )}
      <div className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 p-4">
        {/* Fresh / Renewal — shown for all insurance */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Transaction type</label>
          <div className="flex flex-wrap gap-3">
            {TXN_TYPES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setTxnType(value)
                  if (value === 'Fresh') setOldRenewalPolicyNo('')
                }}
                className={`px-4 py-3 rounded-xl border-2 transition-all font-medium text-sm ${
                  txnType === value
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-200'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {txnType === 'Renewal' && (
          <div className="row mb-6" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Old Renewal Policy Number</label>
              <input
                value={oldRenewalPolicyNo}
                onChange={e => setOldRenewalPolicyNo(e.target.value)}
                placeholder="Enter previous policy number"
                className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
        {simpleForm ? (
          /* General/Health: Date of Issue, Policy Period (years), Renewal Date auto-filled, Policy No, Premium */
          <>
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div className="col" style={{ flex: '1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Date of Issue</label>
                <DatePickerInput
                  value={dateOfIssue}
                  onChange={(v) => setDateOfIssue(v)}
                  inputClassName="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="col" style={{ flex: '1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Policy Period (Years)</label>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={policyPeriod}
                  onChange={e => setPolicyPeriod(e.target.value)}
                  placeholder="No. of years"
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div className="col" style={{ flex: '1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Renewal Date</label>
                <DatePickerInput
                  value={renewalDate}
                  readOnly
                  inputClassName="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  ariaLabel="Renewal date"
                />
              </div>
              <div className="col" style={{ flex: '1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Policy No</label>
                <input
                  value={policyNo}
                  onChange={e => setPolicyNo(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div className="col" style={{ flex: '1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Premium Amount</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={premiumAmount}
                  onChange={e => setPremiumAmount(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div className="col" style={{ flex: '1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Date of Issue</label>
                <DatePickerInput
                  value={dateOfIssue}
                  onChange={(v) => setDateOfIssue(v)}
                  inputClassName="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="col" style={{ flex: '1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Renewal Date</label>
                <DatePickerInput
                  value={renewalDate}
                  readOnly
                  inputClassName="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  ariaLabel="Renewal date"
                />
              </div>
              <div className="col" style={{ flex: '1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Policy No</label>
                <input
                  value={policyNo}
                  onChange={e => setPolicyNo(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div className="col" style={{ flex: '1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Premium Amount</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={premiumAmount}
                  onChange={e => setPremiumAmount(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="col" style={{ flex: '1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Sum Assured</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={sumAssured}
                  onChange={e => setSumAssured(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="col" style={{ flex: '1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Term (Years)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={term}
                  onChange={e => setTerm(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div className="col" style={{ flex: '1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Premium Payment Term (PPT)</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Used for CC/SI calculation when product has PPT slabs</p>
                <select
                  value={premiumPaymentTermType}
                  onChange={e => {
                    const v = e.target.value
                    setPremiumPaymentTermType(v)
                    if (v && v !== 'Other') setPremiumPayTerm(v === 'Single Premium' || v === 'Limited Pay' ? '' : v)
                  }}
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select PPT...</option>
                  <option value="Single Premium">Single Premium</option>
                  <option value="Limited Pay">Limited Pay</option>
                  <option value="5">5 years</option>
                  <option value="10">10 years</option>
                  <option value="12">12 years</option>
                  <option value="15">15 years</option>
                  <option value="20">20 years</option>
                  <option value="25">25 years</option>
                  <option value="30">30 years</option>
                  <option value="Other">Other (enter years)</option>
                </select>
                {premiumPaymentTermType === 'Other' && (
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={premiumPayTermOther || premiumPayTerm}
                    onChange={e => { setPremiumPayTermOther(e.target.value); setPremiumPayTerm(e.target.value) }}
                    placeholder="Years"
                    className="mt-2 w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
              </div>
              <div className="col" style={{ flex: '1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Payment Schedule</label>
                <SearchableSelect
                  options={[
                    { label: 'Annual', value: 'Annual' },
                    { label: 'Half-Yearly', value: 'Half-Yearly' },
                    { label: 'Quarterly', value: 'Quarterly' },
                    { label: 'Monthly', value: 'Monthly' },
                    { label: 'Single', value: 'Single' }
                  ]}
                  value={paymentSchedule}
                  onChange={setPaymentSchedule}
                  placeholder="Select payment schedule"
                />
              </div>
            </div>

            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
              <div className="col" style={{ flex: '1 1 100%' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-2 block">Riders (Optional)</label>
                {ridersLoading ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">Loading riders...</div>
                ) : riders.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">No riders available for this product</div>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                    <div className="space-y-3">
                      {riders.map((rider) => (
                        <label key={rider.rider_id} className="flex items-start cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={selectedRiders.includes(rider.rider_id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRiders([...selectedRiders, rider.rider_id])
                              } else {
                                setSelectedRiders(selectedRiders.filter(id => id !== rider.rider_id))
                              }
                            }}
                            className="mt-1 mr-3 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{rider.rider_name}</div>
                            {rider.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{rider.description}</div>
                            )}
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {rider.rider_type && <span>Type: {rider.rider_type}</span>}
                              {rider.rider_premium_percentage && <span className="ml-2">Premium: {rider.rider_premium_percentage}%</span>}
                              {rider.rider_premium_fixed && <span className="ml-2">Premium: ₹{rider.rider_premium_fixed.toLocaleString()}</span>}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onBack} className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 bg-white/85 dark:bg-gray-800/85 font-bold text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 transition-colors text-sm sm:text-base">
          Back
        </button>
        <button
          onClick={handleNext}
          className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 font-bold bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:shadow-md transition-shadow text-sm sm:text-base"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
