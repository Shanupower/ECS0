import React, { useState, useEffect } from 'react'
import { api } from '../../api'

export default function StepFDDetails({ onBack, onNext, token, issuer, scheme }) {
  const [principalAmount, setPrincipalAmount] = useState('')
  const [tenureMonths, setTenureMonths] = useState('')
  const [payoutFrequency, setPayoutFrequency] = useState('')
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0])
  const [seniorCitizen, setSeniorCitizen] = useState(false)
  const [women, setWomen] = useState(false)
  const [renewal, setRenewal] = useState(false)
  const [form15g15h, setForm15g15h] = useState(false)
  const [applicationNumber, setApplicationNumber] = useState('')
  
  // Auto-computed fields
  const [lockedInterestRatePa, setLockedInterestRatePa] = useState(null)
  const [effectiveYieldPa, setEffectiveYieldPa] = useState(null)
  const [maturityDate, setMaturityDate] = useState(null)
  const [expectedMaturityValue, setExpectedMaturityValue] = useState(null)
  const [expectedPeriodicPayout, setExpectedPeriodicPayout] = useState(null)
  const [expectedTotalInterest, setExpectedTotalInterest] = useState(null)
  
  const [rateCalculation, setRateCalculation] = useState(null)
  const [loading, setLoading] = useState(false)

  // Auto-set payout frequency to "On Maturity" for cumulative schemes
  useEffect(() => {
    if (scheme?.is_cumulative && !payoutFrequency) {
      setPayoutFrequency('On Maturity')
    } else if (scheme?.is_cumulative && payoutFrequency !== 'On Maturity') {
      setPayoutFrequency('On Maturity')
    }
  }, [scheme?.is_cumulative])

  useEffect(() => {
    calculateRate()
  }, [tenureMonths, payoutFrequency, seniorCitizen, women, renewal])

  useEffect(() => {
    if (bookingDate && tenureMonths) {
      const date = new Date(bookingDate)
      date.setMonth(date.getMonth() + parseInt(tenureMonths))
      setMaturityDate(date.toISOString().split('T')[0])
    }
  }, [bookingDate, tenureMonths])

  const calculateRate = async () => {
    if (!tenureMonths || !payoutFrequency || !token || !scheme?.scheme_id) return

    setLoading(true)
    try {
      const issuer_key = issuer?._key || issuer?.issuer_key
      const result = await api.calculateFDRate(token, {
        issuer_key: issuer_key,
        scheme_id: scheme.scheme_id,
        tenure_months: parseInt(tenureMonths),
        payout_frequency: payoutFrequency,
        senior_citizen: seniorCitizen,
        women: women,
        renewal: renewal
      })
      
      setRateCalculation(result)
      setLockedInterestRatePa(result.total_rate_pa)
      setEffectiveYieldPa(result.effective_yield_pa || result.total_rate_pa)
      
      // Calculate maturity/payout amounts
      if (principalAmount) {
        const principal = parseFloat(principalAmount)
        const rate = result.total_rate_pa / 100
        const months = parseInt(tenureMonths)
        const years = months / 12
        
        if (scheme.is_cumulative) {
          // Cumulative - interest compounded
          const maturity = principal * Math.pow(1 + rate, years)
          setExpectedMaturityValue(maturity)
          setExpectedTotalInterest(maturity - principal)
        } else {
          // Non-cumulative - periodic payout
          const interestPerPeriod = principal * rate * (months / (payoutFrequency === 'Monthly' ? 12 : payoutFrequency === 'Quarterly' ? 4 : payoutFrequency === 'Half-Yearly' ? 2 : 1))
          setExpectedPeriodicPayout(interestPerPeriod)
          setExpectedTotalInterest(principal * rate * years)
        }
      }
    } catch (error) {
      console.error('Failed to calculate rate:', error)
      setRateCalculation(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (principalAmount) calculateRate()
  }, [principalAmount])

  const handleNext = () => {
    const issuer_key = issuer?._key || issuer?.issuer_key
    const fdData = {
      fd_issuer_key: issuer_key,
      fd_issuer_name: issuer.short_name,
      fd_issuer_type: issuer.type,
      fd_scheme_id: scheme.scheme_id,
      fd_scheme_name: scheme.scheme_name,
      fd_is_cumulative: scheme.is_cumulative,
      fd_deposit_amount: parseFloat(principalAmount),
      fd_tenure_months: parseInt(tenureMonths),
      fd_payout_frequency: payoutFrequency,
      fd_booking_date: bookingDate,
      fd_locked_interest_rate_pa: lockedInterestRatePa,
      fd_effective_yield_pa: effectiveYieldPa,
      fd_maturity_amount: expectedMaturityValue,
      fd_maturity_date: maturityDate,
      fd_periodic_payout: expectedPeriodicPayout,
      fd_total_interest: expectedTotalInterest,
      fd_base_rate_pa: rateCalculation?.base_rate_pa,
      fd_senior_citizen_bonus: rateCalculation?.bonuses?.senior_citizen,
      fd_women_bonus: rateCalculation?.bonuses?.women,
      fd_renewal_bonus: rateCalculation?.bonuses?.renewal,
      fd_tds_applicable: scheme.tds_applicable,
      fd_form_15g_15h: scheme.show_form15g15h_option && form15g15h,
      fd_application_number: applicationNumber
    }
    onNext(fdData)
  }

  const canProceed = () => {
    if (!principalAmount || !tenureMonths || !payoutFrequency || !applicationNumber) return false
    const minAmount = scheme?.min_amount || issuer?.min_deposit_amount || 0
    if (parseFloat(principalAmount) < minAmount) return false
    if (issuer?.max_deposit_amount && parseFloat(principalAmount) > issuer.max_deposit_amount) return false
    if (!scheme) return false
    if (parseInt(tenureMonths) < scheme.min_tenure_months) return false
    if (parseInt(tenureMonths) > scheme.max_tenure_months) return false
    // Don't block if rate is still loading, allow proceeding anyway
    return true
  }

  return (
    <div>
      <h3 className="mt-0 text-lg font-semibold text-gray-900 dark:text-gray-100">FD Booking Details</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Enter deposit details and review calculation</p>

      <div className="space-y-6">
        {/* Booking Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Booking Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={bookingDate}
            onChange={(e) => setBookingDate(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
            Rate is locked as of this date
          </p>
        </div>

        {/* Application/FD Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Application/FD Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={applicationNumber}
            onChange={(e) => setApplicationNumber(e.target.value)}
            placeholder="Enter application/FD number"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
            required
          />
        </div>

        {/* Principal Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Deposit Amount (Principal) (₹) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={principalAmount}
            onChange={(e) => setPrincipalAmount(e.target.value)}
            placeholder="Enter deposit amount"
            min={(scheme?.min_amount || issuer?.min_deposit_amount) ?? 0}
            max={issuer?.max_deposit_amount || undefined}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Min: ₹{((scheme?.min_amount || issuer?.min_deposit_amount) ?? 0).toLocaleString()}
            {issuer?.max_deposit_amount && <> | Max: ₹{issuer.max_deposit_amount.toLocaleString()}</>}
          </p>
        </div>

        {/* Tenure */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tenure (months) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={tenureMonths}
            onChange={(e) => setTenureMonths(e.target.value)}
            placeholder="Enter tenure"
            min={scheme.min_tenure_months}
            max={scheme.max_tenure_months}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Range: {scheme.min_tenure_months} - {scheme.max_tenure_months} months ({Math.floor(scheme.min_tenure_months/12)} - {Math.floor(scheme.max_tenure_months/12)} years)
          </p>
        </div>

        {/* Payout Frequency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Payout Frequency <span className="text-red-500">*</span>
            {scheme?.is_cumulative && (
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Fixed for Cumulative)</span>
            )}
          </label>
          <select
            value={payoutFrequency}
            onChange={(e) => setPayoutFrequency(e.target.value)}
            disabled={scheme?.is_cumulative}
            className={`w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent ${
              scheme?.is_cumulative ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            <option value="">Select frequency...</option>
            {scheme?.payout_frequency_type?.map(freq => (
              <option key={freq} value={freq}>{freq}</option>
            ))}
          </select>
          {scheme?.is_cumulative && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Cumulative schemes payout only at maturity
            </p>
          )}
        </div>

        {/* Bonuses */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Bonus Eligibility</h4>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={seniorCitizen}
                onChange={(e) => setSeniorCitizen(e.target.checked)}
                className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Senior Citizen (60+ years) (+{(scheme.senior_citizen_bonus_bps / 100).toFixed(2)}%)</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={women}
                onChange={(e) => setWomen(e.target.checked)}
                className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Women Depositor (+{(scheme.women_bonus_bps / 100).toFixed(2)}%)</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={renewal}
                onChange={(e) => setRenewal(e.target.checked)}
                className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Renewal/Existing Customer (+{(scheme.renewal_bonus_bps / 100).toFixed(2)}%)</span>
            </label>
          </div>
        </div>

        {/* Calculation Card */}
        {lockedInterestRatePa && principalAmount && !loading && (
          <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border-2 border-green-300 dark:border-green-700">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Expected Returns</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Interest Rate</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{lockedInterestRatePa.toFixed(2)}% p.a.</div>
              </div>
              {scheme.lock_in_months > 0 && (
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Lock-in Period</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{scheme.lock_in_months} months</div>
                </div>
              )}
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Maturity Date</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{new Date(maturityDate).toLocaleDateString()}</div>
              </div>
              {rateCalculation?.bonuses && (
                <>
                  {rateCalculation.bonuses.senior_citizen > 0 && (
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">SC Bonus</div>
                      <div className="text-lg font-semibold text-green-600 dark:text-green-400">+{rateCalculation.bonuses.senior_citizen.toFixed(2)}%</div>
                    </div>
                  )}
                  {rateCalculation.bonuses.women > 0 && (
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Women Bonus</div>
                      <div className="text-lg font-semibold text-green-600 dark:text-green-400">+{rateCalculation.bonuses.women.toFixed(2)}%</div>
                    </div>
                  )}
                  {rateCalculation.bonuses.renewal > 0 && (
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Renewal Bonus</div>
                      <div className="text-lg font-semibold text-green-600 dark:text-green-400">+{rateCalculation.bonuses.renewal.toFixed(2)}%</div>
                    </div>
                  )}
                </>
              )}
            </div>

            {scheme.is_cumulative && expectedMaturityValue ? (
              <div className="mt-4 pt-4 border-t border-green-300 dark:border-green-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Maturity Amount</div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">₹{expectedMaturityValue.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Total Interest</div>
                    <div className="text-xl font-semibold text-green-700 dark:text-green-300">₹{expectedTotalInterest.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ) : expectedPeriodicPayout ? (
              <div className="mt-4 pt-4 border-t border-green-300 dark:border-green-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Periodic Payout</div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">₹{expectedPeriodicPayout.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">per {payoutFrequency.toLowerCase()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Total Interest</div>
                    <div className="text-xl font-semibold text-green-700 dark:text-green-300">₹{expectedTotalInterest.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {scheme.premature_allowed && (
              <div className="mt-3 text-xs text-yellow-700 dark:text-yellow-300">
                {scheme.premature_terms || 'Premature withdrawal allowed with penalties'}
              </div>
            )}
          </div>
        )}

        {/* TDS */}
        {scheme.tds_applicable && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">TDS Applicable</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">TDS will be deducted on interest as per Income Tax rules</span>
            </div>
            {scheme.show_form15g15h_option && (
              <label className="flex items-center mt-3">
                <input
                  type="checkbox"
                  checked={form15g15h}
                  onChange={(e) => setForm15g15h(e.target.checked)}
                  className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Form 15G/15H Declaration Submitted</span>
              </label>
            )}
          </div>
        )}
      </div>

      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onBack} className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 bg-white/85 dark:bg-gray-800/85 font-bold text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 transition-colors text-sm sm:text-base">
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!canProceed()}
          className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 font-bold bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
