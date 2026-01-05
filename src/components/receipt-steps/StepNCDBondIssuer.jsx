import React, { useState, useEffect } from 'react'
import { api } from '../../api'

export default function StepNCDBondIssuer({ onBack, onNext, token }) {
  const [issuers, setIssuers] = useState([])
  const [selectedIssuer, setSelectedIssuer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadIssuers()
  }, [token])

  const loadIssuers = async () => {
    if (!token) return
    setLoading(true)
    try {
      const result = await api.listNCDBondIssuers(token)
      setIssuers(Array.isArray(result) ? result : [])
    } catch (error) {
      console.error('Failed to load NCD/Bond issuers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredIssuers = searchQuery
    ? issuers.filter(issuer =>
        issuer.short_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issuer.legal_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issuer.type?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : issuers

  const handleNext = () => {
    if (!selectedIssuer) return
    onNext(selectedIssuer)
  }

  return (
    <div>
      <h3 className="mt-0 text-lg font-semibold text-gray-900 dark:text-gray-100">Step 4 — Select NCD/Bond Issuer</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Choose the NCD/Bond issuer</p>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search issuers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {filteredIssuers.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No issuers found
            </div>
          ) : (
            filteredIssuers.map((issuer) => (
              <button
                key={issuer._key}
                type="button"
                onClick={() => setSelectedIssuer(issuer)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  selectedIssuer?._key === issuer._key
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white">{issuer.short_name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{issuer.legal_name}</p>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                    {issuer.type || 'NCD/Bond'}
                  </span>
                </div>
                
                {issuer.credit_rating && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    <span className="font-medium">Rating:</span> {issuer.credit_rating_agency} - {issuer.credit_rating}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}

      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onBack} className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 bg-white/85 dark:bg-gray-800/85 font-bold text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 transition-colors text-sm sm:text-base">
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!selectedIssuer}
          className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 font-bold bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

