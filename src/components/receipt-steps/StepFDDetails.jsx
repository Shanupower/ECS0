import React, { useState, useEffect } from 'react'
import { api } from '../../api'

export default function StepFDDetails({ onBack, onNext, token, issuer, scheme, isGovtScheme = false }) {
  const [principalAmount, setPrincipalAmount] = useState('')
  const [tenureMonths, setTenureMonths] = useState('')
  const [payoutFrequency, setPayoutFrequency] = useState('')
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0])
  const [seniorCitizen, setSeniorCitizen] = useState(false)
  const [women, setWomen] = useState(false)
  const [renewal, setRenewal] = useState(false)
  const [form15g15h, setForm15g15h] = useState(false)
  const [applicationNumber, setApplicationNumber] = useState('')
  const [fdTransactionType, setFdTransactionType] = useState('Fresh') // Fresh or Renewal
  const [renewalInvestmentType, setRenewalInvestmentType] = useState('same') // same, increased, decreased
  const [renewalAdditionalAmount, setRenewalAdditionalAmount] = useState('') // Additional amount for increased/decreased
  
  // Auto-computed fields
  const [lockedInterestRatePa, setLockedInterestRatePa] = useState(null)
  const [effectiveYieldPa, setEffectiveYieldPa] = useState(null)
  const [maturityDate, setMaturityDate] = useState(null)
  const [expectedMaturityValue, setExpectedMaturityValue] = useState(null)
  const [expectedPeriodicPayout, setExpectedPeriodicPayout] = useState(null)
  const [expectedTotalInterest, setExpectedTotalInterest] = useState(null)
  
  const [rateCalculation, setRateCalculation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [rateError, setRateError] = useState(null)
  const [availableTenures, setAvailableTenures] = useState([]) // Specific tenures for button display
  const [availableRateSlabs, setAvailableRateSlabs] = useState([]) // All matching rate slabs (specific + ranges)
  const [fullScheme, setFullScheme] = useState(scheme) // Store full scheme with rate_slabs

  // Fetch full scheme with rate_slabs if not already included
  useEffect(() => {
    const fetchFullScheme = async () => {
      if (!scheme?.scheme_id || !token || !issuer) return
      
      // If scheme already has rate_slabs, use it
      if (scheme.rate_slabs && Array.isArray(scheme.rate_slabs) && scheme.rate_slabs.length > 0) {
        setFullScheme(scheme)
        return
      }
      
      // Otherwise, fetch full scheme details
      try {
        const issuer_key = issuer?._key || issuer?.issuer_key
        const fetchedScheme = await api.getFDScheme(token, issuer_key, scheme.scheme_id)
        setFullScheme(fetchedScheme)
      } catch (error) {
        console.error('Failed to fetch full scheme:', error)
        setFullScheme(scheme) // Fallback to original scheme
      }
    }
    
    fetchFullScheme()
  }, [scheme?.scheme_id, token, issuer])

  // Auto-set payout frequency to "On Maturity" for cumulative schemes
  useEffect(() => {
    if (fullScheme?.is_cumulative && !payoutFrequency) {
      setPayoutFrequency('On Maturity')
    } else if (fullScheme?.is_cumulative && payoutFrequency !== 'On Maturity') {
      setPayoutFrequency('On Maturity')
    }
  }, [fullScheme?.is_cumulative])

  // Reset renewal investment fields when switching from Renewal to Fresh
  useEffect(() => {
    if (fdTransactionType === 'Fresh') {
      setRenewalInvestmentType('same')
      setRenewalAdditionalAmount('')
    }
  }, [fdTransactionType])

  // Extract available tenures from rate slabs based on payout frequency
  // Store both specific tenures (for button display) and all matching slabs (for validation)
  useEffect(() => {
    // Wait for payout frequency to be set (especially for cumulative schemes)
    if (!payoutFrequency) {
      setAvailableTenures([])
      setAvailableRateSlabs([])
      return
    }

    // Use fullScheme instead of scheme to ensure we have rate_slabs
    const schemeToUse = fullScheme || scheme

    if (schemeToUse?.rate_slabs && Array.isArray(schemeToUse.rate_slabs) && schemeToUse.rate_slabs.length > 0) {
      const tenures = new Set()
      
      // Get all active rate slabs matching the payout frequency (both specific and ranges)
      const matchingSlabs = schemeToUse.rate_slabs.filter(slab => {
        const isActive = slab.is_active !== false
        const matchesFrequency = slab.payout_frequency_type === payoutFrequency
        return isActive && matchesFrequency
      })
      
      // Store all matching slabs for validation
      setAvailableRateSlabs(matchingSlabs)
      
      // Extract specific tenure months (where min === max) for button display
      matchingSlabs.forEach(slab => {
        if (slab.tenure_min_months === slab.tenure_max_months) {
          // Specific tenure - add to button list
          tenures.add(slab.tenure_min_months)
        }
        // Range slabs (min !== max) are stored in availableRateSlabs but not shown as buttons
      })
      
      const sortedTenures = Array.from(tenures).sort((a, b) => a - b)
      setAvailableTenures(sortedTenures)
    } else {
      setAvailableTenures([])
      setAvailableRateSlabs([])
    }
  }, [fullScheme?.rate_slabs, payoutFrequency, fullScheme?.scheme_id])

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
    const schemeToUse = fullScheme || scheme
    if (!tenureMonths || !payoutFrequency || !token || !schemeToUse?.scheme_id) {
      setRateError(null)
      setRateCalculation(null)
      return
    }

    setLoading(true)
    setRateError(null) // Clear previous errors
    try {
      const issuer_key = issuer?._key || issuer?.issuer_key
      const result = await api.calculateFDRate(token, {
        issuer_key: issuer_key,
        scheme_id: schemeToUse.scheme_id,
        tenure_months: parseInt(tenureMonths),
        payout_frequency: payoutFrequency,
        senior_citizen: seniorCitizen,
        women: women,
        renewal: renewal
      })
      
      setRateCalculation(result)
      setLockedInterestRatePa(result.total_rate_pa)
      setEffectiveYieldPa(result.effective_yield_pa || result.total_rate_pa)
      setRateError(null) // Clear error on success
      
      // Calculate maturity/payout amounts
      if (principalAmount) {
        const principal = parseFloat(principalAmount)
        const rate = result.total_rate_pa / 100
        const months = parseInt(tenureMonths)
        const years = months / 12
        
        const schemeToUse = fullScheme || scheme
        if (schemeToUse.is_cumulative) {
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
      setLockedInterestRatePa(null)
      // Set user-friendly error message
      const errorMessage = error.message || error.error || error.detail || String(error)
      if (errorMessage.includes('No matching rate slab') || errorMessage.includes('rate slab')) {
        setRateError(`No rate slab found for ${tenureMonths} months with ${payoutFrequency} payout frequency. Please select a different tenure.`)
      } else {
        setRateError('Failed to calculate interest rate. Please check your inputs.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (principalAmount) calculateRate()
  }, [principalAmount])

  const handleNext = () => {
    const schemeToUse = fullScheme || scheme
    const issuer_key = issuer?._key || issuer?.issuer_key
    const fdData = {
      fd_issuer_key: issuer_key,
      fd_issuer_name: issuer.short_name,
      fd_issuer_type: issuer.type,
      fd_scheme_id: schemeToUse.scheme_id,
      fd_scheme_name: schemeToUse.scheme_name,
      fd_is_cumulative: schemeToUse.is_cumulative,
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
      fd_tds_applicable: schemeToUse.tds_applicable,
      fd_form_15g_15h: schemeToUse.show_form15g15h_option && form15g15h,
      fd_application_number: applicationNumber,
      fd_transaction_type: fdTransactionType, // Fresh or Renewal
      fd_renewal_investment_type: fdTransactionType === 'Renewal' ? renewalInvestmentType : null,
      fd_renewal_additional_amount: fdTransactionType === 'Renewal' && renewalAdditionalAmount ? parseFloat(renewalAdditionalAmount) : null
    }
    onNext(fdData)
  }

  const canProceed = () => {
    // Use fullScheme if available, otherwise fallback to scheme
    const schemeToUse = fullScheme || scheme
    
    // Basic field validation
    if (!principalAmount || !tenureMonths || !payoutFrequency || !applicationNumber) return false
    
    // Amount validation
    const minAmount = schemeToUse?.min_amount || issuer?.min_deposit_amount || 0
    if (parseFloat(principalAmount) < minAmount) return false
    if (issuer?.max_deposit_amount && parseFloat(principalAmount) > issuer.max_deposit_amount) return false
    
    // Scheme validation
    if (!schemeToUse) return false
    
    // Basic tenure range validation
    const tenure = parseInt(tenureMonths)
    if (tenure < schemeToUse.min_tenure_months) return false
    if (tenure > schemeToUse.max_tenure_months) return false
    
    // CRITICAL: Validate that a rate slab exists for this tenure (check both specific and ranges)
    if (availableRateSlabs.length > 0) {
      const hasMatchingSlab = availableRateSlabs.some(slab => {
        // Check if tenure falls within this slab's range
        return tenure >= slab.tenure_min_months && tenure <= slab.tenure_max_months
      })
      if (!hasMatchingSlab) {
        return false // No rate slab covers this tenure
      }
    }
    
    // Check if rate calculation was successful (additional validation)
    if (!rateCalculation || !rateCalculation.total_rate_pa) return false
    
    // Renewal investment validation
    if (fdTransactionType === 'Renewal') {
      if (renewalInvestmentType === 'increased' || renewalInvestmentType === 'decreased') {
        if (!renewalAdditionalAmount || parseFloat(renewalAdditionalAmount) <= 0) return false
        if (renewalInvestmentType === 'decreased' && parseFloat(renewalAdditionalAmount) > parseFloat(principalAmount)) return false
      }
    }
    
    // Don't allow proceeding if rate is still loading
    if (loading) return false
    
    return true
  }

  return (
    <div>
      <h3 className="mt-0 text-lg font-semibold text-gray-900 dark:text-gray-100">{isGovtScheme ? 'Government Scheme Booking Details' : 'FD Booking Details'}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{isGovtScheme ? 'Enter scheme details and review calculation' : 'Enter deposit details and review calculation'}</p>

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
            {isGovtScheme ? 'Scheme rate is locked as of this date' : 'Rate is locked as of this date'}
          </p>
        </div>

        {/* Application/FD or Application/Scheme Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {isGovtScheme ? 'Application/Scheme Number' : 'Application/FD Number'} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={applicationNumber}
            onChange={(e) => setApplicationNumber(e.target.value)}
            placeholder={isGovtScheme ? 'Enter application/scheme number' : 'Enter application/FD number'}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
            required
          />
        </div>

        {/* Principal / Deposit Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {isGovtScheme ? 'Deposit Amount (₹)' : 'Deposit Amount (Principal) (₹)'} <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={principalAmount}
            onChange={(e) => setPrincipalAmount(e.target.value)}
            placeholder={isGovtScheme ? 'Enter deposit amount' : 'Enter deposit amount'}
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
            {isGovtScheme ? 'Scheme Tenure (months)' : 'Tenure (months)'} <span className="text-red-500">*</span>
          </label>
          
          {/* Show available tenures as clickable buttons if they're specific (not continuous) */}
          {availableTenures.length > 0 && availableTenures.length <= 20 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {availableTenures.map(months => (
                <button
                  key={months}
                  type="button"
                  onClick={() => setTenureMonths(months.toString())}
                  className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                    parseInt(tenureMonths) === months
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {months}M
                </button>
              ))}
            </div>
          )}
          
          <input
            type="number"
            value={tenureMonths}
            onChange={(e) => setTenureMonths(e.target.value)}
            placeholder={isGovtScheme ? 'Enter scheme tenure' : 'Enter tenure'}
            min={scheme.min_tenure_months}
            max={scheme.max_tenure_months}
            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent ${
              tenureMonths && availableRateSlabs.length > 0 && !availableRateSlabs.some(slab => {
                const tenure = parseInt(tenureMonths)
                return tenure >= slab.tenure_min_months && tenure <= slab.tenure_max_months
              })
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {availableTenures.length > 0 ? (
              <>
                Available specific tenures: {availableTenures.join(', ')} months
                {availableTenures.length <= 20 && ' (click buttons above)'}
                {availableRateSlabs.some(slab => slab.tenure_min_months !== slab.tenure_max_months) && (
                  <span className="block mt-1">Range slabs also available - enter any tenure within valid ranges</span>
                )}
              </>
            ) : availableRateSlabs.length > 0 ? (
              <>
                Available ranges: {availableRateSlabs.map(slab => 
                  slab.tenure_min_months === slab.tenure_max_months 
                    ? `${slab.tenure_min_months}M`
                    : `${slab.tenure_min_months}-${slab.tenure_max_months}M`
                ).join(', ')}
              </>
            ) : (
              <>
                Range: {scheme.min_tenure_months} - {scheme.max_tenure_months} months ({Math.floor(scheme.min_tenure_months/12)} - {Math.floor(scheme.max_tenure_months/12)} years)
              </>
            )}
          </p>
          
          {/* Show error if tenure is not covered by any available slab */}
          {tenureMonths && availableRateSlabs.length > 0 && !availableRateSlabs.some(slab => {
            const tenure = parseInt(tenureMonths)
            return tenure >= slab.tenure_min_months && tenure <= slab.tenure_max_months
          }) && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              ⚠️ No rate slab available for {tenureMonths} months. Please enter a tenure within the available ranges.
            </p>
          )}
          
          {/* Show rate calculation error */}
          {rateError && (
            <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                ⚠️ {rateError}
              </p>
            </div>
          )}
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

        {/* Transaction Type (Fresh/Renewal) */}
        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Transaction Type <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center space-x-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="fdTransactionType"
                value="Fresh"
                checked={fdTransactionType === 'Fresh'}
                onChange={(e) => setFdTransactionType(e.target.value)}
                className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Fresh</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="fdTransactionType"
                value="Renewal"
                checked={fdTransactionType === 'Renewal'}
                onChange={(e) => setFdTransactionType(e.target.value)}
                className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Renewal</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {isGovtScheme ? 'Select whether this is a fresh scheme or renewal of an existing scheme (for reporting and filtering)' : 'Select whether this is a fresh FD or renewal of an existing FD (for reporting and filtering)'}
          </p>
        </div>

        {/* Renewal Investment Options - Only show when Renewal is selected */}
        {fdTransactionType === 'Renewal' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Renewal Investment Option <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="renewalInvestmentType"
                  value="same"
                  checked={renewalInvestmentType === 'same'}
                  onChange={(e) => {
                    setRenewalInvestmentType(e.target.value)
                    setRenewalAdditionalAmount('')
                  }}
                  className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Same Amount (Renew with existing principal)</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="renewalInvestmentType"
                  value="increased"
                  checked={renewalInvestmentType === 'increased'}
                  onChange={(e) => setRenewalInvestmentType(e.target.value)}
                  className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Increased Amount (Add additional investment)</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="renewalInvestmentType"
                  value="decreased"
                  checked={renewalInvestmentType === 'decreased'}
                  onChange={(e) => setRenewalInvestmentType(e.target.value)}
                  className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Decreased Amount (Withdraw partial amount)</span>
              </label>
            </div>
            
            {/* Additional Amount Input for Increased/Decreased */}
            {(renewalInvestmentType === 'increased' || renewalInvestmentType === 'decreased') && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {renewalInvestmentType === 'increased' ? 'Additional Investment Amount' : 'Withdrawal Amount'} (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={renewalAdditionalAmount}
                  onChange={(e) => setRenewalAdditionalAmount(e.target.value)}
                  placeholder={`Enter ${renewalInvestmentType === 'increased' ? 'additional' : 'withdrawal'} amount`}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                {renewalInvestmentType === 'increased' && renewalAdditionalAmount && principalAmount && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Total Renewal Amount: ₹{(parseFloat(principalAmount) + parseFloat(renewalAdditionalAmount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
                {renewalInvestmentType === 'decreased' && renewalAdditionalAmount && principalAmount && parseFloat(renewalAdditionalAmount) > parseFloat(principalAmount) && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    ⚠️ Withdrawal amount cannot exceed principal amount
                  </p>
                )}
              </div>
            )}
          </div>
        )}

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
