import React, { useState, useEffect, useMemo } from 'react'
import { api } from '../../api'
import SearchableSelect from '../SearchableSelect.jsx'
import DatePickerInput from '../ui/DatePickerInput.jsx'

export default function StepTransactionDetails({ onBack, onNext, investmentType, selectedScheme, selectedAmc, token }) {
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isPerpetual, setIsPerpetual] = useState(false)
  const [schemes, setSchemes] = useState([])
  const [targetScheme, setTargetScheme] = useState('')
  const [loading, setLoading] = useState(false)

  const blockWheelChangeNumber = (e) => {
    e.currentTarget.blur()
  }
  const [stpOriginalAmount, setStpOriginalAmount] = useState('')
  const todayYyyyMmDd = useMemo(() => new Date().toISOString().split('T')[0], [])

  const getStartDateMax = () => {
    // Requirement: allow future Start Dates ONLY for MF SIP.
    if (investmentType === 'SIP') return undefined
    return todayYyyyMmDd
  }

  useEffect(() => {
    if ((investmentType === 'STP' || investmentType === 'Switch Over') && token && selectedAmc) {
      loadSchemes()
    }
  }, [investmentType, token, selectedAmc])

  const loadSchemes = async () => {
    if (!token || !selectedAmc?.amc_code) return
    setLoading(true)
    try {
      const result = await api.getSchemesByAMC(token, selectedAmc.amc_code)
      const filtered = Array.isArray(result) ? result.filter(s => s.scheme_code !== selectedScheme.scheme_code) : []
      setSchemes(filtered)
    } catch (error) {
      console.error('Failed to load schemes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    const transactionData = { 
      investment_amount: amount,
      investmentAmount: amount // Also add camelCase for validation compatibility
    }

    // Set mode based on investment type
    if (investmentType === 'SIP') {
      transactionData.sip_frequency = frequency
      transactionData.sip_start_date = startDate
      transactionData.sip_end_date = isPerpetual ? null : endDate
      transactionData.sip_is_perpetual = isPerpetual
    } else if (investmentType === 'SWP') {
      transactionData.swp_frequency = frequency
      transactionData.swp_start_date = startDate
      transactionData.swp_amount = amount
    } else if (investmentType === 'STP') {
      const target = schemes.find(s => s.scheme_code === targetScheme)
      transactionData.stp_target_scheme_code = target?.scheme_code
      transactionData.stp_target_scheme_name = target?.scheme_name
      transactionData.stp_frequency = frequency
      transactionData.stp_start_date = startDate
      transactionData.stp_amount = amount
      transactionData.stp_original_amount = stpOriginalAmount
    } else if (investmentType === 'Switch Over') {
      transactionData.txn_type = 'Switch Over' // Explicitly set transaction type
      const target = schemes.find(s => s.scheme_code === targetScheme)
      transactionData.switch_from_scheme_code = selectedScheme.scheme_code
      transactionData.switch_from_scheme_name = selectedScheme.scheme_name
      transactionData.switch_to_scheme_code = target?.scheme_code
      transactionData.switch_to_scheme_name = target?.scheme_name
      transactionData.switch_type = 'Amount'
      transactionData.switch_value = amount
    }

    onNext(transactionData)
  }

  const canProceed = () => {
    if (!amount) return false
    if (investmentType === 'SIP' && (!amount || !frequency || !startDate || (!isPerpetual && !endDate))) return false
    if (investmentType === 'SWP' && (!frequency || !startDate)) return false
    if (investmentType === 'STP' && (!targetScheme || !frequency || !startDate || !stpOriginalAmount)) return false
    if (investmentType === 'Switch Over' && (!targetScheme)) return false
    return true
  }

  return (
    <div>
      <h3 className="mt-0 text-lg font-semibold text-gray-900 dark:text-gray-100">Step 6 — Transaction Details</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Fill in the details for your {investmentType} transaction</p>
      
      {investmentType === 'Lumpsum' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Investment Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onWheel={blockWheelChangeNumber}
              placeholder="Enter amount"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
      )}

      {investmentType === 'SIP' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              SIP Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onWheel={blockWheelChangeNumber}
              placeholder="Enter SIP amount"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frequency <span className="text-red-500">*</span>
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select frequency</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Annual">Annual</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <DatePickerInput
              value={startDate}
              onChange={(v) => setStartDate(v)}
              max={getStartDateMax()}
              inputClassName="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                checked={isPerpetual}
                onChange={(e) => setIsPerpetual(e.target.checked)}
                className="w-4 h-4 text-red-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Perpetual (40 years)</span>
            </label>
            {!isPerpetual && (
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date <span className="text-red-500">*</span>
                </label>
                  <DatePickerInput
                    value={endDate}
                    onChange={(v) => setEndDate(v)}
                    max={startDate ? (() => {
                      const maxDate = new Date(startDate)
                      maxDate.setFullYear(maxDate.getFullYear() + 30)
                      return maxDate.toISOString().split('T')[0]
                    })() : undefined}
                    inputClassName="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
              </div>
            )}
          </div>
        </div>
      )}

      {investmentType === 'SWP' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frequency <span className="text-red-500">*</span>
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select frequency</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Annual">Annual</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <DatePickerInput
              value={startDate}
              onChange={(v) => setStartDate(v)}
              max={getStartDateMax()}
              inputClassName="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Withdrawal Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onWheel={blockWheelChangeNumber}
              placeholder="Enter withdrawal amount"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      )}

      {investmentType === 'STP' && (
        <div className="space-y-6">
           <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Total Original Scheme Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={stpOriginalAmount}
              onChange={(e) => setStpOriginalAmount(e.target.value)}
              onWheel={blockWheelChangeNumber}
              placeholder="Enter total original scheme amount"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Total amount invested in the original scheme</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Transfer to Scheme <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={useMemo(() => schemes.map(scheme => ({
                label: `${scheme.display_name || scheme.scheme_name}${scheme.option ? ` (${scheme.option === 'GROWTH' ? 'Growth' : scheme.option === 'IDCW_PAYOUT' ? 'IDCW-Payout' : scheme.option === 'IDCW_REINVEST' ? 'IDCW-Reinvestment' : scheme.option})` : ''}`,
                value: scheme.scheme_code,
                scheme: scheme
              })), [schemes])}
              value={targetScheme}
              onChange={(schemeCode) => setTargetScheme(schemeCode)}
              placeholder="Search for a scheme..."
              disabled={loading || !schemes.length}
              maxHeight={300}
            />
            {targetScheme && (() => {
              const selected = schemes.find(s => s.scheme_code === targetScheme)
              return selected ? (
                <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Scheme:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">{selected.scheme_name}</span>
                    </div>
                    {selected.option && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Option:</span>
                        <span className="ml-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            selected.option === 'GROWTH' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                            selected.option === 'IDCW_PAYOUT' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                            'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'
                          }`}>
                            {selected.option === 'GROWTH' ? 'Growth' : 
                             selected.option === 'IDCW_PAYOUT' ? 'IDCW – Payout' : 
                             selected.option === 'IDCW_REINVEST' ? 'IDCW – Reinvestment' : 
                             selected.option}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null
            })()}
          </div>
         
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frequency <span className="text-red-500">*</span>
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select frequency</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <DatePickerInput
              value={startDate}
              onChange={(v) => setStartDate(v)}
              max={getStartDateMax()}
              inputClassName="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Transfer Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onWheel={blockWheelChangeNumber}
              placeholder="Enter periodic transfer amount"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Amount to be transferred periodically</p>
          </div>
        </div>
      )}

      {investmentType === 'Switch Over' && (
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">From Scheme:</div>
            <div className="text-sm text-gray-900 dark:text-gray-100 font-bold">{selectedScheme.scheme_name}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{selectedAmc.amc_name}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Switch to Scheme <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={useMemo(() => schemes.map(scheme => ({
                label: `${scheme.display_name || scheme.scheme_name}${scheme.option ? ` (${scheme.option === 'GROWTH' ? 'Growth' : scheme.option === 'IDCW_PAYOUT' ? 'IDCW-Payout' : scheme.option === 'IDCW_REINVEST' ? 'IDCW-Reinvestment' : scheme.option})` : ''}`,
                value: scheme.scheme_code,
                scheme: scheme
              })), [schemes])}
              value={targetScheme}
              onChange={(schemeCode) => setTargetScheme(schemeCode)}
              placeholder="Search for a scheme..."
              disabled={loading || !schemes.length}
              maxHeight={300}
            />
            {targetScheme && (() => {
              const selected = schemes.find(s => s.scheme_code === targetScheme)
              return selected ? (
                <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Scheme:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">{selected.scheme_name}</span>
                    </div>
                    {selected.option && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Option:</span>
                        <span className="ml-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            selected.option === 'GROWTH' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                            selected.option === 'IDCW_PAYOUT' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                            'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'
                          }`}>
                            {selected.option === 'GROWTH' ? 'Growth' : 
                             selected.option === 'IDCW_PAYOUT' ? 'IDCW – Payout' : 
                             selected.option === 'IDCW_REINVEST' ? 'IDCW – Reinvestment' : 
                             selected.option}
                          </span>
                        </span>
                      </div>
                    )}
                    {selected.type && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Type:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">{selected.type}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null
            })()}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Switch amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onWheel={blockWheelChangeNumber}
              placeholder="Enter amount in rupees"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      )}

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

