import React, { useState, useEffect } from 'react'
import { api } from '../../api'

export default function StepFDScheme({ onBack, onNext, token, issuer, initialSchemeId = '', recentSchemes = [] }) {
  const [schemes, setSchemes] = useState([])
  const [selectedScheme, setSelectedScheme] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (issuer?._key || issuer?.issuer_key) {
      loadSchemes()
    }
  }, [issuer])

  useEffect(() => {
    if (!initialSchemeId || !schemes.length) return
    const scheme = schemes.find(s => s.scheme_id === initialSchemeId)
    if (scheme) setSelectedScheme(scheme)
  }, [initialSchemeId, schemes])

  const loadSchemes = async () => {
    const issuer_key = issuer?._key || issuer?.issuer_key
    if (!token || !issuer_key) return
    setLoading(true)
    setSelectedScheme(null)
    try {
      const result = await api.getFDSchemesByIssuer(token, issuer_key)
      const schemesArray = Array.isArray(result) ? result : []
      
      // Ensure schemes have unique identifiers - combine scheme_id with tenure range to handle duplicates
      const schemesWithUniqueId = schemesArray.map((scheme, index) => ({
        ...scheme,
        _uniqueId: `${scheme.scheme_id}_${index}_${scheme.min_tenure_months}_${scheme.max_tenure_months}_${scheme.is_cumulative ? 'cum' : 'noncum'}`
      }))
      
      setSchemes(schemesWithUniqueId)
    } catch (error) {
      console.error('Failed to load FD schemes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSchemes = searchQuery
    ? schemes.filter(scheme =>
        scheme.scheme_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scheme.scheme_id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : schemes

  const handleSchemeSelect = async (scheme) => {
    // Fetch full scheme with rate slabs if not already included
    if (!scheme.rate_slabs && token && issuer) {
      try {
        const issuer_key = issuer?._key || issuer?.issuer_key
        const fullScheme = await api.getFDScheme(token, issuer_key, scheme.scheme_id)
        // Preserve the _uniqueId from the original scheme
        setSelectedScheme({
          ...fullScheme,
          _uniqueId: scheme._uniqueId
        })
      } catch (error) {
        console.error('Failed to load scheme details:', error)
        // Fallback to basic scheme if fetch fails
        setSelectedScheme(scheme)
      }
    } else {
      // Scheme already has rate_slabs or we can't fetch, use as-is
      setSelectedScheme(scheme)
    }
  }

  const handleNext = () => {
    if (!selectedScheme) return
    onNext(selectedScheme)
  }

  // Helper function to check if a scheme is selected (using unique identifier)
  const isSchemeSelected = (scheme) => {
    if (!selectedScheme) return false
    // Use unique identifier for comparison to handle duplicate scheme_ids
    return selectedScheme._uniqueId === scheme._uniqueId
  }

  return (
    <div>
      <h3 className="mt-0 text-lg font-semibold text-gray-900 dark:text-gray-100">Step 4 — Select FD Scheme</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        From: <strong className="text-gray-900 dark:text-white">{issuer?.short_name}</strong>
      </p>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search schemes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {filteredSchemes.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No schemes found
            </div>
          ) : (
            filteredSchemes.map((scheme) => {
              const isSelected = isSchemeSelected(scheme)
              // Get available tenure months from rate slabs - ONLY for specific tenures (min === max)
              const availableTenures = scheme.rate_slabs 
                ? scheme.rate_slabs
                    .filter(slab => 
                      slab.is_active !== false && 
                      slab.tenure_min_months === slab.tenure_max_months // Only specific tenures
                    )
                    .map(slab => slab.tenure_min_months) // Since min === max, just use that value
                    .filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
                    .sort((a, b) => a - b)
                : []
              
              return (
              <button
                key={scheme._uniqueId || scheme.scheme_id}
                type="button"
                onClick={() => handleSchemeSelect(scheme)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-red-600 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white">{scheme.scheme_name}</h4>
                    {scheme.description_short && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{scheme.description_short}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    scheme.is_cumulative
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      : 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
                  }`}>
                    {scheme.is_cumulative ? 'Cumulative' : 'Non-Cumulative'}
                  </span>
                </div>

                {scheme.payout_frequency_type && scheme.payout_frequency_type.length > 0 && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    <span className="font-medium">Payout Options:</span> {scheme.payout_frequency_type.join(', ')}
                  </div>
                )}

                <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  <span className="font-medium">Tenure Range:</span> {scheme.min_tenure_months} - {scheme.max_tenure_months} months
                </div>

                {availableTenures.length > 0 && (
                  <div className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                    <span className="font-medium">Available Tenures:</span> {availableTenures.join(', ')} months
                  </div>
                )}

                {scheme.lock_in_months > 0 && (
                  <div className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                    <span className="font-medium">Lock-in:</span> {scheme.lock_in_months} months
                  </div>
                )}
              </button>
            )})
          )}
        </div>
      )}

      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onBack} className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 bg-white/85 dark:bg-gray-800/85 font-bold text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 transition-colors text-sm sm:text-base">
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!selectedScheme}
          className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 font-bold bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

