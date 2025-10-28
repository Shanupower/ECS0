import React, { useState, useEffect } from 'react'
import { api } from '../../api'

export default function StepMFScheme({ onBack, onNext, token }) {
  const [amcs, setAmcs] = useState([])
  const [schemes, setSchemes] = useState([])
  const [selectedAmc, setSelectedAmc] = useState(null)
  const [selectedScheme, setSelectedScheme] = useState(null)
  const [hasExistingFolio, setHasExistingFolio] = useState(null)
  const [folioNumber, setFolioNumber] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAMCs()
  }, [token])

  useEffect(() => {
    if (selectedAmc?.amc_code) {
      loadSchemes(selectedAmc.amc_code)
    }
  }, [selectedAmc])

  const loadAMCs = async () => {
    if (!token) return
    setLoading(true)
    try {
      const result = await api.listAMCs(token)
      setAmcs(Array.isArray(result) ? result : [])
    } catch (error) {
      console.error('Failed to load AMCs:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSchemes = async (amc_code) => {
    if (!token || !amc_code) return
    setLoading(true)
    try {
      const result = await api.getSchemesByAMC(token, amc_code)
      setSchemes(Array.isArray(result) ? result : [])
    } catch (error) {
      console.error('Failed to load schemes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    if (!selectedScheme || hasExistingFolio === null) return
    
    onNext({
      selectedAmc,
      selectedScheme,
      hasExistingFolio,
      folioNumber: hasExistingFolio ? folioNumber : null
    })
  }

  return (
    <div>
      <h3 className="mt-0 text-lg font-semibold text-gray-900 dark:text-gray-100">Step 4 — Select Mutual Fund Details</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Choose the AMC and Scheme, then indicate if you have an existing folio</p>
      
      <div className="space-y-6">
        {/* AMC Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select AMC (Asset Management Company) <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedAmc?.amc_code || ''}
            onChange={(e) => {
              const amc = amcs.find(a => a.amc_code === e.target.value)
              setSelectedAmc(amc || null)
              setSelectedScheme(null)
            }}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="">Select AMC...</option>
            {amcs.map(amc => (
              <option key={amc.amc_code} value={amc.amc_code}>{amc.amc_name}</option>
            ))}
          </select>
        </div>

        {/* Scheme Selection */}
        {selectedAmc && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Scheme <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedScheme?.scheme_code || ''}
              onChange={(e) => {
                const scheme = schemes.find(s => s.scheme_code === e.target.value)
                setSelectedScheme(scheme || null)
              }}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={!selectedAmc || loading}
            >
              <option value="">Select Scheme...</option>
              {schemes.map(scheme => (
                <option key={scheme.scheme_code} value={scheme.scheme_code}>
                  {scheme.scheme_name}
                  {scheme.is_nfo && ' [NFO]'}
                </option>
              ))}
            </select>
            {selectedScheme && (
              <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                {selectedScheme.is_nfo && (
                  <div className="mb-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700">
                      🆕 NFO - New Fund Offer
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Category:</span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">{selectedScheme.category}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Sub-Category:</span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">{selectedScheme.sub_category}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Plan:</span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">{selectedScheme.plan}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Type:</span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">{selectedScheme.type}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Folio Number Question */}
        {selectedScheme && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Do you have an existing folio number? <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4 mb-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="hasExistingFolio"
                  value="yes"
                  checked={hasExistingFolio === true}
                  onChange={() => setHasExistingFolio(true)}
                  className="mr-2 w-4 h-4 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Yes, I have an existing folio</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="hasExistingFolio"
                  value="no"
                  checked={hasExistingFolio === false}
                  onChange={() => setHasExistingFolio(false)}
                  className="mr-2 w-4 h-4 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">No, new folio</span>
              </label>
            </div>
            
            {hasExistingFolio && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Folio Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={folioNumber}
                  onChange={(e) => setFolioNumber(e.target.value)}
                  placeholder="Enter your folio number"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
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
          disabled={!selectedScheme || hasExistingFolio === null || (hasExistingFolio && !folioNumber)}
          className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 font-bold bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

