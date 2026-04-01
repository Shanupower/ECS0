import React, { useState, useEffect, useMemo } from 'react'
import { api } from '../../api'

const SEGMENTS = [
  { id: 'ncd', label: 'NCDs' },
  { id: '54ec', label: 'Capital Gain Bonds' },
  { id: 'saving', label: 'Saving bonds' }
]

export default function StepNCDBondIssuer({
  onBack,
  onNext,
  token,
  initialIssuerKey = '',
  initialSchemeId = '',
  recentSchemes = []
}) {
  const [segment, setSegment] = useState('ncd')
  const [entries, setEntries] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [continuing, setContinuing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!token || !initialIssuerKey || !initialSchemeId) return
    let cancelled = false
    ;(async () => {
      try {
        const scheme = await api.getNCDBondScheme(token, initialIssuerKey, initialSchemeId)
        if (cancelled || !scheme) return
        const nc = (s) =>
          String(s ?? '')
            .toLowerCase()
            .replace(/[-_\s]+/g, ' ')
            .trim()
        const cat = nc(scheme.category)
        const sub = nc(scheme.sub_category)
        let seg = 'ncd'
        if (cat.includes('tax') && cat.includes('saving')) {
          if (sub.includes('54ec') || sub.includes('capital gain')) seg = '54ec'
          else if (sub.includes('saving') && sub.includes('bond')) seg = 'saving'
        }
        setSegment(seg)
      } catch (_) {
        /* keep default segment */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, initialIssuerKey, initialSchemeId])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setSelected(null)
      try {
        const result = await api.listNCDBondReceiptSchemes(token, segment)
        if (!cancelled) setEntries(Array.isArray(result) ? result : [])
      } catch (error) {
        console.error('Failed to load NCD/Bond receipt schemes:', error)
        if (!cancelled) setEntries([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, segment])

  useEffect(() => {
    if (!initialIssuerKey || !initialSchemeId || !entries.length) return
    const row = entries.find(
      (e) =>
        e.issuer_key === initialIssuerKey &&
        e.scheme?.scheme_id === initialSchemeId
    )
    if (row) setSelected(row)
  }, [initialIssuerKey, initialSchemeId, entries])

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries
    const q = searchQuery.toLowerCase()
    return entries.filter((row) => {
      const s = row.scheme || {}
      return (
        s.scheme_name?.toLowerCase().includes(q) ||
        s.scheme_id?.toLowerCase().includes(q) ||
        s.isin?.toLowerCase().includes(q) ||
        row.issuer_short_name?.toLowerCase().includes(q)
      )
    })
  }, [entries, searchQuery])

  const handleRecentClick = async (sch) => {
    const ik = sch.issuer_key || sch.bond_issuer_key
    if (!ik || !sch.scheme_id || !token) return
    setContinuing(true)
    try {
      const issuer = await api.getNCDBondIssuer(token, ik)
      const scheme = await api.getNCDBondScheme(token, ik, sch.scheme_id)
      onNext(issuer, scheme)
    } catch (error) {
      console.error('Failed to open recent NCD/Bond scheme:', error)
    } finally {
      setContinuing(false)
    }
  }

  const handleNext = async () => {
    if (!selected || !token) return
    setContinuing(true)
    try {
      const issuer = await api.getNCDBondIssuer(token, selected.issuer_key)
      let scheme = selected.scheme
      try {
        const full = await api.getNCDBondScheme(
          token,
          selected.issuer_key,
          selected.scheme.scheme_id
        )
        scheme = full
      } catch (err) {
        console.warn('Using embedded scheme; full fetch failed:', err)
      }
      onNext(issuer, scheme)
    } catch (error) {
      console.error('Failed to load issuer/scheme for NCD/Bond step:', error)
    } finally {
      setContinuing(false)
    }
  }

  const recentWithIssuer = recentSchemes.filter((r) => r.issuer_key || r.bond_issuer_key)

  return (
    <div>
      <h3 className="mt-0 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Step 4 — Select NCD/Bond scheme
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Choose a category, then the scheme (issuer is set from your scheme)
      </p>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Category
        </label>
        <div className="flex flex-wrap gap-2">
          {SEGMENTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSegment(s.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                segment === s.id
                  ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-gray-900'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {recentWithIssuer.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Recent schemes
          </label>
          <div className="flex flex-wrap gap-2">
            {recentWithIssuer.map((sch) => (
              <button
                key={`${sch.issuer_key || sch.bond_issuer_key}-${sch.scheme_id}`}
                type="button"
                onClick={() => handleRecentClick(sch)}
                disabled={continuing}
                className="px-3 py-1.5 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:opacity-50"
              >
                {sch.scheme_name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search schemes by name, ID, ISIN, or issuer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No schemes found for this category
            </div>
          ) : (
            filteredEntries.map((row) => {
              const scheme = row.scheme
              const isSelected =
                selected?.issuer_key === row.issuer_key &&
                selected?.scheme?.scheme_id === scheme.scheme_id
              return (
                <button
                  key={`${row.issuer_key}-${scheme.scheme_id}`}
                  type="button"
                  onClick={() => setSelected(row)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-base font-bold text-gray-900 dark:text-white">
                        {scheme.scheme_name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {row.issuer_short_name}
                        {row.issuer_type ? (
                          <span className="ml-2 text-xs opacity-80">({row.issuer_type})</span>
                        ) : null}
                      </p>
                      {(scheme.category || scheme.sub_category) && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {scheme.category && (
                            <span className="font-medium">{scheme.category}</span>
                          )}
                          {scheme.category && scheme.sub_category && (
                            <span className="mx-1">•</span>
                          )}
                          {scheme.sub_category && <span>{scheme.sub_category}</span>}
                        </p>
                      )}
                      {scheme.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {scheme.description}
                        </p>
                      )}
                    </div>
                    {scheme.is_variable_rate && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                        Variable Rate
                      </span>
                    )}
                  </div>

                  {scheme.isin && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      <span className="font-medium">ISIN:</span> {scheme.isin}
                    </div>
                  )}
                  {scheme.coupon_rate !== undefined && scheme.coupon_rate !== null && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      <span className="font-medium">Coupon Rate:</span> {scheme.coupon_rate}% p.a.
                    </div>
                  )}
                  {scheme.face_value != null && scheme.face_value !== '' && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      <span className="font-medium">Face Value:</span> ₹
                      {Number(scheme.face_value).toLocaleString()}
                    </div>
                  )}
                  {scheme.tenure_months != null && scheme.tenure_months !== '' && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      <span className="font-medium">Tenure:</span> {scheme.tenure_months} months
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>
      )}

      <div
        className="actions"
        style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}
      >
        <button
          type="button"
          onClick={onBack}
          className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 bg-white/85 dark:bg-gray-800/85 font-bold text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 transition-colors text-sm sm:text-base"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!selected || continuing}
          className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 font-bold bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          {continuing ? 'Loading…' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
