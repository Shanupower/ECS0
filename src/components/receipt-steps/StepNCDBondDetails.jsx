import React, { useState, useEffect } from 'react'
import DatePickerInput from '../ui/DatePickerInput.jsx'

export default function StepNCDBondDetails({ onBack, onNext, token, issuer, scheme, initialData }) {
  const todayYyyyMmDd = new Date().toISOString().split('T')[0]
  const [transactionType, setTransactionType] = useState(initialData?.transactionType || 'Purchase')
  const [numberOfUnits, setNumberOfUnits] = useState(initialData?.numberOfUnits || '')
  const [investmentAmount, setInvestmentAmount] = useState(initialData?.investmentAmount || '')
  const [transactionDate, setTransactionDate] = useState(initialData?.transactionDate || todayYyyyMmDd)
  const [applicationNumber, setApplicationNumber] = useState(initialData?.applicationNumber || '')
  const [form15g15h, setForm15g15h] = useState(initialData?.form15g15h || false)

  // Determine if it's NCD or Bond based on issuer type
  const isNCD = issuer?.type === 'NCD' || issuer?.type?.toUpperCase() === 'NCD'
  const unitLabel = isNCD ? 'NCDs' : 'Bonds'

  // Bidirectional sync: units <-> amount (vice versa) when face_value is available
  const handleUnitsChange = (e) => {
    const val = e.target.value
    setNumberOfUnits(val)
    if (scheme?.face_value && val) {
      const amount = parseFloat(val) * scheme.face_value
      setInvestmentAmount(amount.toString())
    }
  }
  const handleAmountChange = (e) => {
    const val = e.target.value
    setInvestmentAmount(val)
    if (scheme?.face_value && val) {
      const units = Math.floor(parseFloat(val) / scheme.face_value)
      setNumberOfUnits(units > 0 ? units.toString() : '')
    }
  }

  const handleNext = () => {
    const issuer_key = issuer?._key || issuer?.issuer_key
    const bondData = {
      bond_issuer_key: issuer_key,
      bond_issuer_name: issuer.short_name,
      bond_issuer_type: issuer.type,
      bond_scheme_id: scheme.scheme_id,
      bond_scheme_name: scheme.scheme_name,
      bond_category: scheme.category,
      bond_sub_category: scheme.sub_category,
      bond_isin: scheme.isin,
      bond_coupon_rate: scheme.coupon_rate,
      bond_face_value: scheme.face_value,
      bond_issue_date: scheme.issue_date,
      bond_maturity_date: scheme.maturity_date,
      bond_transaction_type: transactionType,
      bond_number_of_units: numberOfUnits ? parseFloat(numberOfUnits) : null,
      bond_investment_amount: investmentAmount ? parseFloat(investmentAmount) : null,
      bond_transaction_date: transactionDate,
      bond_application_number: applicationNumber,
      bond_form_15g_15h: form15g15h
    }
    bondData._formState = { transactionType, numberOfUnits, investmentAmount, transactionDate, applicationNumber, form15g15h }
    onNext(bondData)
  }

  const canProceed = () => {
    if (!transactionType || !transactionDate || !applicationNumber) return false
    
    if (transactionType === 'Purchase') {
      // For purchase, need either units or amount
      if (!numberOfUnits && !investmentAmount) return false
      if (numberOfUnits && parseFloat(numberOfUnits) <= 0) return false
      if (investmentAmount && parseFloat(investmentAmount) <= 0) return false
      
      // Check min investment if specified
      if (scheme?.min_investment && investmentAmount && parseFloat(investmentAmount) < scheme.min_investment) {
        return false
      }
    } else if (transactionType === 'Redemption') {
      // For redemption, need units
      if (!numberOfUnits || parseFloat(numberOfUnits) <= 0) return false
    }
    
    return true
  }

  return (
    <div>
      <h3 className="mt-0 text-lg font-semibold text-gray-900 dark:text-gray-100">NCD/Bond Transaction Details</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Enter transaction details</p>

      <div className="space-y-6">
        {/* Transaction Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Transaction Type <span className="text-red-500">*</span>
          </label>
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="Purchase">Purchase</option>
            <option value="Redemption">Redemption</option>
          </select>
        </div>

        {/* Transaction Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Transaction Date <span className="text-red-500">*</span>
          </label>
          <DatePickerInput
            value={transactionDate}
            onChange={(v) => setTransactionDate(v)}
            max={todayYyyyMmDd}
            inputClassName="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            ariaLabel="Transaction date"
          />
        </div>

        {/* Application Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Application Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={applicationNumber}
            onChange={(e) => setApplicationNumber(e.target.value)}
            placeholder="Enter application number"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Number of Units */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Number of {unitLabel} {transactionType === 'Redemption' && <span className="text-red-500">*</span>}
            {transactionType === 'Purchase' && scheme?.face_value && (
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                (Face Value: ₹{scheme.face_value.toLocaleString()})
              </span>
            )}
          </label>
          <input
            type="number"
            value={numberOfUnits}
            onChange={handleUnitsChange}
            placeholder={`Enter number of ${unitLabel.toLowerCase()}`}
            min="0"
            step="1"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={transactionType === 'Redemption'}
          />
          {scheme?.face_value && numberOfUnits && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Calculated Amount: ₹{(parseFloat(numberOfUnits || 0) * scheme.face_value).toLocaleString()}
            </p>
          )}
        </div>

        {/* Investment Amount */}
        {transactionType === 'Purchase' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Investment Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={investmentAmount}
              onChange={handleAmountChange}
              placeholder="Enter investment amount"
              min={scheme?.min_investment || 0}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {scheme?.min_investment && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Min Investment: ₹{scheme.min_investment.toLocaleString()}
              </p>
            )}
            {scheme?.face_value && investmentAmount && numberOfUnits && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Calculated {unitLabel}: {Math.floor(parseFloat(investmentAmount) / scheme.face_value)}
              </p>
            )}
          </div>
        )}

        {/* Scheme Details Card */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border-2 border-blue-300 dark:border-blue-700">
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Scheme Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {(scheme?.category || scheme?.sub_category) && (
              <div className="col-span-2">
                <div className="text-xs text-gray-600 dark:text-gray-400">Category</div>
                <div className="text-base font-semibold text-gray-900 dark:text-white">
                  {scheme.category && <span>{scheme.category}</span>}
                  {scheme.category && scheme.sub_category && <span className="mx-1">•</span>}
                  {scheme.sub_category && <span>{scheme.sub_category}</span>}
                </div>
              </div>
            )}
            {scheme?.isin && (
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">ISIN</div>
                <div className="text-base font-semibold text-gray-900 dark:text-white">{scheme.isin}</div>
              </div>
            )}
            {scheme?.coupon_rate !== undefined && (
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Coupon Rate</div>
                <div className="text-base font-semibold text-blue-600 dark:text-blue-400">{scheme.coupon_rate}% p.a.</div>
              </div>
            )}
            {scheme?.face_value && (
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Face Value</div>
                <div className="text-base font-semibold text-gray-900 dark:text-white">₹{scheme.face_value.toLocaleString()}</div>
              </div>
            )}
            {scheme?.issue_date && scheme?.maturity_date && (
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Maturity Date</div>
                <div className="text-base font-semibold text-gray-900 dark:text-white">
                  {new Date(scheme.maturity_date).toLocaleDateString()}
                </div>
              </div>
            )}
            {scheme?.listing_status && (
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Listing Status</div>
                <div className="text-base font-semibold text-gray-900 dark:text-white">{scheme.listing_status}</div>
              </div>
            )}
            {scheme?.credit_rating && (
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Credit Rating</div>
                <div className="text-base font-semibold text-gray-900 dark:text-white">{scheme.credit_rating}</div>
              </div>
            )}
          </div>
        </div>

        {/* TDS / Form 15G/15H */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">TDS Information</span>
            <span className="text-xs text-gray-600 dark:text-gray-400">TDS may be applicable on interest income</span>
          </div>
          <label className="flex items-center mt-3">
            <input
              type="checkbox"
              checked={form15g15h}
              onChange={(e) => setForm15g15h(e.target.checked)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Form 15G/15H Declaration Submitted</span>
          </label>
        </div>
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

