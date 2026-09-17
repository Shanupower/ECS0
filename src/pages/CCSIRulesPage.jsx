import React, { useState, useEffect } from 'react'
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiRefreshCw,
  FiCheckCircle,
  FiXCircle,
  FiSearch,
  FiInfo,
  FiSliders,
  FiPlayCircle,
  FiX
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

export const MAIN_CATEGORIES = [
  { value: 'MF', shortLabel: 'MF', label: 'Mutual Funds (MF)' },
  { value: 'FD', shortLabel: 'FD', label: 'Fixed Deposit (FD)' },
  { value: 'GOVT_FD', shortLabel: 'Govt FD', label: 'Govt / Post Office Schemes' },
  { value: 'BOND', shortLabel: 'Bonds', label: 'Bonds' },
  { value: 'NCD', shortLabel: 'NCDs', label: 'NCDs' },
  { value: 'INS', shortLabel: 'Insurance', label: 'Insurance' },
  { value: 'MISC', shortLabel: 'Misc', label: 'Misc Services' }
]

export const MF_SUB_CATEGORIES = [
  { value: 'MF', shortLabel: 'MF', label: 'Standard Mutual Funds (MF)' },
  { value: 'SIF', shortLabel: 'SIF', label: 'SIF (Specialized Investment Funds)' },
  { value: 'PMS', shortLabel: 'PMS', label: 'PMS (Portfolio Management Services)' },
  { value: 'AIF', shortLabel: 'AIF', label: 'AIF (Alternative Investment Funds)' },
  { value: 'GIFT_CITY_FUNDS', shortLabel: 'GIFT CITY FUNDS', label: 'GIFT City Funds' }
]

export const CATEGORIES = MAIN_CATEGORIES

export function getCategoryDisplayBadge(category) {
  const cat = String(category || '').toUpperCase()
  switch (cat) {
    case 'MF':
      return { label: 'MF (Standard)', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' }
    case 'SIF':
      return { label: 'MF (SIF)', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20' }
    case 'PMS':
      return { label: 'MF (PMS)', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' }
    case 'AIF':
      return { label: 'MF (AIF)', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' }
    case 'GIFT_CITY_FUNDS':
      return { label: 'MF (GIFT City)', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20' }
    case 'FD':
      return { label: 'Fixed Deposit (FD)', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' }
    case 'GOVT_FD':
      return { label: 'Govt / Post Office', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20' }
    case 'BOND':
      return { label: 'Bonds', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20' }
    case 'NCD':
      return { label: 'NCDs', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20' }
    case 'INS':
      return { label: 'Insurance', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' }
    case 'MISC':
      return { label: 'Misc Services', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20' }
    case '*':
      return { label: 'All Categories (*)', color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20' }
    default:
      return { label: cat, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' }
  }
}

export function getApplicableTxnTypes(category) {
  const cat = String(category || '').toUpperCase()
  const allOption = { value: '*', label: 'All Types (*)' }

  if (cat === 'MF') {
    return [
      allOption,
      { value: 'SIP', label: 'SIP' },
      { value: 'LUMPSUM', label: 'Lumpsum' },
      { value: 'STP', label: 'STP' },
      { value: 'SWP', label: 'SWP' },
      { value: 'SWITCH_OVER', label: 'Switch Over' }
    ]
  }
  if (cat === 'SIF' || cat === 'PMS' || cat === 'AIF' || cat === 'GIFT_CITY_FUNDS') {
    return [
      allOption,
      { value: 'LUMPSUM', label: 'Lumpsum' },
      { value: 'SIP', label: 'SIP' }
    ]
  }
  if (cat === 'FD' || cat === 'GOVT_FD' || cat === 'INS') {
    return [
      allOption,
      { value: 'FRESH', label: 'Fresh' },
      { value: 'RENEWAL', label: 'Renewal' }
    ]
  }
  if (cat === 'BOND' || cat === 'NCD') {
    return [
      allOption,
      { value: 'FRESH', label: 'Fresh' },
      { value: 'RENEWAL', label: 'Renewal' },
      { value: 'SECONDARY', label: 'Secondary Market' }
    ]
  }
  if (cat === 'MISC') {
    return [
      allOption,
      { value: 'FRESH', label: 'Fresh' },
      { value: 'ONE_TIME', label: 'One-Time' }
    ]
  }
  return [
    allOption,
    { value: 'SIP', label: 'SIP' },
    { value: 'LUMPSUM', label: 'Lumpsum' },
    { value: 'FRESH', label: 'Fresh' },
    { value: 'RENEWAL', label: 'Renewal' }
  ]
}

export function CCSIRulesView() {
  const { token } = useAuth()
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('MF')
  const [selectedMfSubCategory, setSelectedMfSubCategory] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [formMainCategory, setFormMainCategory] = useState('MF')
  const [formData, setFormData] = useState({
    category: 'MF',
    txn_type: 'SIP',
    cc_type: 'percentage',
    cc_value: '100',
    si_type: 'percentage',
    si_value: '0',
    min_amount: '0',
    max_amount: '',
    effective_from: '',
    effective_to: '',
    is_active: true,
    description: ''
  })
  const [saving, setSaving] = useState(false)

  // Tester modal
  const [isTesterOpen, setIsTesterOpen] = useState(false)
  const [testMainCategory, setTestMainCategory] = useState('MF')
  const [testPayload, setTestPayload] = useState({
    category: 'MF',
    txn_type: 'SIP',
    amount: '10000',
    date: new Date().toISOString().slice(0, 10)
  })
  const [testResult, setTestResult] = useState(null)
  const [evaluating, setEvaluating] = useState(false)

  // Batch recalculate modal
  const [isRecalcOpen, setIsRecalcOpen] = useState(false)
  const [recalcCategory, setRecalcCategory] = useState('*')
  const [dryRun, setDryRun] = useState(true)
  const [recalcResult, setRecalcResult] = useState(null)
  const [recalculating, setRecalculating] = useState(false)

  const loadRules = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getCCSIRules(token, {
        category: selectedCategory,
        include_inactive: 'true'
      })
      setRules(res.rules || [])
    } catch (err) {
      setError(err.message || 'Failed to load rules')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) loadRules()
  }, [token, selectedCategory])

  const handleOpenCreateModal = () => {
    setEditingRule(null)
    const initMain = selectedCategory || 'MF'
    const initSub = initMain === 'MF'
      ? (selectedMfSubCategory !== 'ALL' ? selectedMfSubCategory : 'MF')
      : initMain
    setFormMainCategory(initMain)
    setFormData({
      category: initSub,
      txn_type: 'SIP',
      cc_type: 'percentage',
      cc_value: '100',
      si_type: 'percentage',
      si_value: '0.5',
      min_amount: '0',
      max_amount: '',
      effective_from: '',
      effective_to: '',
      is_active: true,
      description: ''
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (rule) => {
    setEditingRule(rule)
    const catUpper = String(rule.category || 'MF').toUpperCase()
    const isMfChild = ['MF', 'SIF', 'PMS', 'AIF', 'GIFT_CITY_FUNDS'].includes(catUpper)
    setFormMainCategory(isMfChild ? 'MF' : catUpper)
    setFormData({
      category: catUpper,
      txn_type: rule.txn_type || 'SIP',
      cc_type: rule.cc_type || 'percentage',
      cc_value: String(rule.cc_value ?? 0),
      si_type: rule.si_type || 'percentage',
      si_value: String(rule.si_value ?? 0),
      min_amount: String(rule.min_amount ?? 0),
      max_amount: rule.max_amount != null ? String(rule.max_amount) : '',
      effective_from: rule.effective_from || '',
      effective_to: rule.effective_to || '',
      is_active: rule.is_active !== false,
      description: rule.description || ''
    })
    setIsModalOpen(true)
  }

  const handleSaveRule = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingRule) {
        await api.updateCCSIRule(token, editingRule._key, formData)
      } else {
        await api.createCCSIRule(token, formData)
      }
      setIsModalOpen(false)
      loadRules()
    } catch (err) {
      alert(err.message || 'Failed to save rule')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRule = async (id) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return
    try {
      await api.deleteCCSIRule(token, id)
      loadRules()
    } catch (err) {
      alert(err.message || 'Failed to delete rule')
    }
  }

  const handleRunTest = async () => {
    setEvaluating(true)
    setTestResult(null)
    try {
      const res = await api.evaluateCCSIRule(token, testPayload)
      setTestResult(res)
    } catch (err) {
      alert(err.message || 'Failed to evaluate test payload')
    } finally {
      setEvaluating(false)
    }
  }

  const handleRunRecalculation = async () => {
    setRecalculating(true)
    setRecalcResult(null)
    try {
      const res = await api.recalculateReceiptsCCSI(token, {
        category: recalcCategory,
        dry_run: dryRun
      })
      setRecalcResult(res)
    } catch (err) {
      alert(err.message || 'Recalculation failed')
    } finally {
      setRecalculating(false)
    }
  }

  const filteredRules = rules
    .filter(r => {
      if (selectedCategory === 'MF' && selectedMfSubCategory !== 'ALL') {
        const rCat = (r.category || '').toUpperCase()
        if (rCat !== selectedMfSubCategory) return false
      }
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        (r.category || '').toLowerCase().includes(q) ||
        (r.txn_type || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      if (dateA !== dateB) return dateA - dateB
      return (Number(a.min_amount) || 0) - (Number(b.min_amount) || 0)
    })

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center px-4 py-2 border border-transparent text-xs sm:text-sm font-semibold rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors shadow-sm"
          >
            <FiPlus className="w-4 h-4 mr-1.5" /> Add New Rule
          </button>

          <button
            onClick={() => {
              setIsTesterOpen(true)
              setTestResult(null)
              setTestMainCategory('MF')
              setTestPayload({
                category: 'MF',
                txn_type: 'SIP',
                amount: '10000',
                date: new Date().toISOString().slice(0, 10)
              })
            }}
            className="inline-flex items-center px-3.5 py-2 text-xs sm:text-sm font-semibold text-[var(--text-secondary)] bg-[var(--card-bg-opaque)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)] border border-[var(--stroke)] rounded-lg transition-colors"
          >
            <FiSliders className="w-4 h-4 mr-1.5" /> Rule Evaluator
          </button>

          <button
            onClick={() => { setIsRecalcOpen(true); setRecalcResult(null) }}
            className="inline-flex items-center px-3.5 py-2 text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 rounded-lg transition-colors"
          >
            <FiPlayCircle className="w-4 h-4 mr-1.5 text-amber-600" /> Recalculate Receipts
          </button>
        </div>

        <button
          onClick={loadRules}
          disabled={loading}
          className="inline-flex items-center px-3.5 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-xs sm:text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)] disabled:opacity-50 transition-colors"
        >
          <FiRefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Row 2: Top-level Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1">
        {MAIN_CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => {
              setSelectedCategory(cat.value)
              if (cat.value === 'MF') setSelectedMfSubCategory('ALL')
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${selectedCategory === cat.value
                ? 'bg-[var(--accent)] text-black dark:text-white font-bold shadow-sm'
                : 'bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)] border border-[var(--stroke)]'
              }`}
          >
            {cat.shortLabel || cat.label}
          </button>
        ))}
      </div>

      {/* Sub-Category Filter Pills under Mutual Funds (MF) */}
      {selectedCategory === 'MF' && (
        <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 pt-1 bg-[var(--card-bg-opaque)] p-2 rounded-lg border border-[var(--stroke)]">
          <span className="text-xs font-semibold text-[var(--text-muted)] mr-1 whitespace-nowrap">AMC category:</span>
          <button
            onClick={() => setSelectedMfSubCategory('ALL')}
            className={`px-3 py-1 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${selectedMfSubCategory === 'ALL'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)] border border-[var(--stroke)]'
              }`}
          >
            All
          </button>
          {MF_SUB_CATEGORIES.map(sub => (
            <button
              key={sub.value}
              onClick={() => setSelectedMfSubCategory(sub.value)}
              className={`px-3 py-1 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${selectedMfSubCategory === sub.value
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)] border border-[var(--stroke)]'
                }`}
            >
              {sub.shortLabel || sub.label}
            </button>
          ))}
        </div>
      )}

      {/* Row 3: Search Bar */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FiSearch className="h-4 w-4 text-[var(--text-muted)]" />
        </div>
        <input
          type="text"
          placeholder="Search rules by category, transaction type, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-[var(--card-bg-opaque)] border border-[var(--stroke)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] outline-none transition-colors"
        />
      </div>

      {/* Rules Table */}
      <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[var(--text-muted)] flex items-center justify-center gap-2 text-sm font-medium">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
            Loading CC & SI rules...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm font-medium text-[var(--error)] bg-[var(--error-muted)]">{error}</div>
        ) : filteredRules.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-muted)] space-y-3">
            <FiInfo className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
            <p className="font-medium text-sm">No rules configured for this filter.</p>
            <button
              onClick={handleOpenCreateModal}
              className="text-xs text-[var(--accent)] font-semibold hover:underline"
            >
              + Create the first rule
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-[var(--text-secondary)]">
              <thead className="bg-[var(--card-bg-opaque)] text-xs uppercase font-semibold text-[var(--text-muted)] tracking-wider border-b border-[var(--stroke)]">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Txn / Investment Type</th>
                  <th className="px-4 py-3">CC (Collection Credit)</th>
                  <th className="px-4 py-3">SI (Service Income)</th>
                  <th className="px-4 py-3">Amount Range</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--stroke)]">
                {filteredRules.map(rule => {
                  const badge = getCategoryDisplayBadge(rule.category)
                  return (
                    <tr key={rule._key} className="hover:bg-[var(--card-hover)] transition-colors">
                      <td className="px-4 py-3.5 font-medium text-[var(--text-primary)]">
                        <span className={`px-2.5 py-1 rounded font-bold text-xs ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-[var(--text-primary)]">
                        <span className={`px-2.5 py-1 rounded text-xs font-semibold ${rule.txn_type === 'SIP'
                            ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300'
                            : rule.txn_type === 'LUMPSUM'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                              : 'bg-[var(--card-bg-opaque)] text-[var(--text-secondary)]'
                          }`}>
                          {rule.txn_type === '*' || !rule.txn_type ? 'All Types (*)' : rule.txn_type}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-extrabold text-blue-600 dark:text-blue-400">
                        {rule.cc_type === 'flat' ? `₹${rule.cc_value}` : `${rule.cc_value}%`}
                      </td>

                      <td className="px-4 py-3.5 font-extrabold text-emerald-600 dark:text-emerald-400">
                        {rule.si_type === 'flat' ? `₹${rule.si_value}` : `${rule.si_value}%`}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-[var(--text-muted)] font-medium">
                        {rule.min_amount || rule.max_amount ? (
                          <span>
                            ₹{Number(rule.min_amount || 0).toLocaleString()} - {rule.max_amount ? `₹${Number(rule.max_amount).toLocaleString()}` : '∞'}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">Any Amount</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        {rule.is_active !== false ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <FiCheckCircle className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)]">
                            <FiXCircle className="w-3.5 h-3.5" /> Inactive
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenEditModal(rule)}
                          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent)] rounded-lg hover:bg-[var(--card-bg-opaque)] transition-colors"
                          title="Edit Rule"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule._key)}
                          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--error)] rounded-lg hover:bg-[var(--card-bg-opaque)] transition-colors"
                          title="Delete Rule"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Rule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[var(--card-bg)] rounded-xl shadow-2xl border border-[var(--stroke)] max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-[var(--text-primary)]">
            <div className="flex items-center justify-between border-b border-[var(--stroke)] pb-3.5">
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                {editingRule ? 'Edit CC & SI Rule' : 'Add New CC & SI Rule'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Product Category
                  </label>
                  <select
                    value={formMainCategory}
                    onChange={(e) => {
                      const newMain = e.target.value
                      setFormMainCategory(newMain)
                      if (newMain === 'MF') {
                        setFormData({ ...formData, category: 'MF', txn_type: 'SIP' })
                      } else {
                        const appTxns = getApplicableTxnTypes(newMain)
                        const defaultTxn = appTxns[1]?.value || '*'
                        setFormData({ ...formData, category: newMain, txn_type: defaultTxn })
                      }
                    }}
                    className="w-full p-2 text-xs sm:text-sm bg-[var(--card-bg-opaque)] border border-[var(--stroke)] text-[var(--text-primary)] rounded-lg outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)]"
                  >
                    {MAIN_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {formMainCategory === 'MF' && (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      MF Sub-Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        const newSubCat = e.target.value
                        const appTxns = getApplicableTxnTypes(newSubCat)
                        const curTxnValid = appTxns.some(t => t.value === formData.txn_type)
                        setFormData({
                          ...formData,
                          category: newSubCat,
                          txn_type: curTxnValid ? formData.txn_type : (appTxns[1]?.value || 'SIP')
                        })
                      }}
                      className="w-full p-2 text-xs sm:text-sm bg-[var(--card-bg-opaque)] border border-[var(--stroke)] text-[var(--text-primary)] rounded-lg outline-none focus:ring-2 focus:ring-[var(--ring)] font-bold text-red-600 dark:text-red-400"
                    >
                      {MF_SUB_CATEGORIES.map(sub => (
                        <option key={sub.value} value={sub.value}>{sub.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={formMainCategory === 'MF' ? 'col-span-2' : ''}>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Transaction / Investment Type
                  </label>
                  <select
                    value={formData.txn_type}
                    onChange={(e) => setFormData({ ...formData, txn_type: e.target.value })}
                    className="w-full p-2 text-xs sm:text-sm bg-[var(--card-bg-opaque)] border border-[var(--stroke)] text-[var(--text-primary)] rounded-lg outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  >
                    {getApplicableTxnTypes(formData.category).map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CC Rule Input */}
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 space-y-2">
                <label className="block font-bold text-blue-600 dark:text-blue-300 text-xs">
                  Collection Credit (CC) Rule
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Calculation Mode</span>
                    <select
                      value={formData.cc_type}
                      onChange={(e) => setFormData({ ...formData, cc_type: e.target.value })}
                      className="w-full p-1.5 bg-[var(--card-bg-opaque)] border border-[var(--stroke)] rounded text-xs text-[var(--text-primary)] font-medium"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat Amount (₹)</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Value</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={formData.cc_value}
                      onKeyDown={(e) => { if (e.key === '-') e.preventDefault() }}
                      onChange={(e) => {
                        const v = e.target.value
                        if (v !== '' && Number(v) < 0) return
                        setFormData({ ...formData, cc_value: v })
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full p-1.5 bg-[var(--card-bg-opaque)] border border-[var(--stroke)] rounded text-xs text-[var(--text-primary)] font-extrabold"
                    />
                  </div>
                </div>
              </div>

              {/* SI Rule Input */}
              <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 space-y-2">
                <label className="block font-bold text-emerald-600 dark:text-emerald-300 text-xs">
                  Service Income / Incentive (SI) Rule
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Calculation Mode</span>
                    <select
                      value={formData.si_type}
                      onChange={(e) => setFormData({ ...formData, si_type: e.target.value })}
                      className="w-full p-1.5 bg-[var(--card-bg-opaque)] border border-[var(--stroke)] rounded text-xs text-[var(--text-primary)] font-medium"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat Amount (₹)</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Value</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={formData.si_value}
                      onKeyDown={(e) => { if (e.key === '-') e.preventDefault() }}
                      onChange={(e) => {
                        const v = e.target.value
                        if (v !== '' && Number(v) < 0) return
                        setFormData({ ...formData, si_value: v })
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full p-1.5 bg-[var(--card-bg-opaque)] border border-[var(--stroke)] rounded text-xs text-[var(--text-primary)] font-extrabold"
                    />
                  </div>
                </div>
              </div>

              {/* Amount Thresholds */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Min Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_amount}
                    onKeyDown={(e) => { if (e.key === '-') e.preventDefault() }}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v !== '' && Number(v) < 0) return
                      setFormData({ ...formData, min_amount: v })
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full p-2 text-xs sm:text-sm bg-[var(--card-bg-opaque)] border border-[var(--stroke)] rounded-lg text-[var(--text-primary)] font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Max Amount (₹, optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="No upper limit"
                    value={formData.max_amount}
                    onKeyDown={(e) => { if (e.key === '-') e.preventDefault() }}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v !== '' && Number(v) < 0) return
                      setFormData({ ...formData, max_amount: v })
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full p-2 text-xs sm:text-sm bg-[var(--card-bg-opaque)] border border-[var(--stroke)] rounded-lg text-[var(--text-primary)] font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Description / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. SIF Lumpsum SIP incentive rule"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 text-xs sm:text-sm bg-[var(--card-bg-opaque)] border border-[var(--stroke)] rounded-lg text-[var(--text-primary)] font-medium"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="rule_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="rule_active" className="text-xs font-semibold text-[var(--text-secondary)] cursor-pointer select-none">
                  Enable Rule
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--stroke)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--card-bg-opaque)] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                >
                  {saving ? 'Saving...' : editingRule ? 'Update Rule' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tester Modal */}
      {isTesterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[var(--card-bg)] rounded-xl shadow-2xl border border-[var(--stroke)] max-w-lg w-full p-6 space-y-4 text-[var(--text-primary)]">
            <div className="flex items-center justify-between border-b border-[var(--stroke)] pb-3.5">
              <div className="flex items-center gap-2">
                <FiSliders className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Rule Evaluator Simulator</h3>
              </div>
              <button onClick={() => setIsTesterOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Product Category</label>
                  <select
                    value={testMainCategory}
                    onChange={(e) => {
                      const newMain = e.target.value
                      setTestMainCategory(newMain)
                      if (newMain === 'MF') {
                        setTestPayload({ ...testPayload, category: 'MF', txn_type: 'SIP' })
                      } else {
                        const appTxns = getApplicableTxnTypes(newMain)
                        setTestPayload({ ...testPayload, category: newMain, txn_type: appTxns[1]?.value || '*' })
                      }
                    }}
                    className="w-full p-2 bg-[var(--card-bg-opaque)] border border-[var(--stroke)] rounded-lg text-xs text-[var(--text-primary)] font-semibold"
                  >
                    {MAIN_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {testMainCategory === 'MF' && (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">MF Sub-Category</label>
                    <select
                      value={testPayload.category}
                      onChange={(e) => {
                        const newSub = e.target.value
                        const appTxns = getApplicableTxnTypes(newSub)
                        const curValid = appTxns.some(t => t.value === testPayload.txn_type)
                        setTestPayload({
                          ...testPayload,
                          category: newSub,
                          txn_type: curValid ? testPayload.txn_type : (appTxns[1]?.value || 'SIP')
                        })
                      }}
                      className="w-full p-2 bg-[var(--card-bg-opaque)] border border-[var(--stroke)] rounded-lg text-xs text-[var(--text-primary)] font-bold text-red-600 dark:text-red-400"
                    >
                      {MF_SUB_CATEGORIES.map(sub => (
                        <option key={sub.value} value={sub.value}>{sub.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={testMainCategory === 'MF' ? 'col-span-2' : ''}>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Transaction Type</label>
                  <select
                    value={testPayload.txn_type}
                    onChange={(e) => setTestPayload({ ...testPayload, txn_type: e.target.value })}
                    className="w-full p-2 bg-[var(--card-bg-opaque)] border border-[var(--stroke)] rounded-lg text-xs text-[var(--text-primary)] font-medium"
                  >
                    {getApplicableTxnTypes(testPayload.category).filter(t => t.value !== '*').map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Investment Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={testPayload.amount}
                  onKeyDown={(e) => { if (e.key === '-') e.preventDefault() }}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v !== '' && Number(v) < 0) return
                    setTestPayload({ ...testPayload, amount: v })
                  }}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-full p-2 bg-[var(--card-bg-opaque)] border border-[var(--stroke)] rounded-lg text-xs sm:text-sm font-extrabold text-[var(--text-primary)]"
                />
              </div>

              <button
                onClick={handleRunTest}
                disabled={evaluating}
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                {evaluating ? 'Evaluating...' : 'Evaluate Rule Calculation'}
              </button>

              {testResult && (
                <div className="p-4 bg-[var(--card-bg-opaque)] rounded-lg border border-[var(--stroke)] space-y-2.5 mt-4">
                  <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Calculation Outcome</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-2.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <div className="text-xs text-blue-600 dark:text-blue-300 font-semibold">Calculated CC</div>
                      <div className="text-lg sm:text-xl font-extrabold text-blue-600 dark:text-blue-400">₹{testResult.cc_amount}</div>
                    </div>
                    <div className="p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                      <div className="text-xs text-emerald-600 dark:text-emerald-300 font-semibold">Calculated SI</div>
                      <div className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400">₹{testResult.si_amount}</div>
                    </div>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] pt-1 font-medium">
                    <span className="font-bold text-[var(--text-primary)]">Applied Rule:</span> {testResult.rule_id ? testResult.rule_label : 'No custom rule configured in DB (Standard scheme calculation applies)'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Batch Recalculate Modal */}
      {isRecalcOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[var(--card-bg)] rounded-xl shadow-2xl border border-[var(--stroke)] max-w-lg w-full p-6 space-y-4 text-[var(--text-primary)]">
            <div className="flex items-center justify-between border-b border-[var(--stroke)] pb-3.5">
              <div className="flex items-center gap-2">
                <FiPlayCircle className="w-5 h-5 text-amber-600" />
                <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Recalculate Existing Receipts</h3>
              </div>
              <button onClick={() => setIsRecalcOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <p className="text-xs text-[var(--text-muted)] font-medium">
                Re-evaluate CC & SI values for saved receipts matching the selected product category.
              </p>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Target Category</label>
                <select
                  value={recalcCategory}
                  onChange={(e) => setRecalcCategory(e.target.value)}
                  className="w-full p-2 bg-[var(--card-bg-opaque)] border border-[var(--stroke)] rounded-lg text-xs sm:text-sm text-[var(--text-primary)] font-medium"
                >
                  <option value="*">All Categories (*)</option>
                  {MAIN_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                  {MF_SUB_CATEGORIES.filter(s => s.value !== 'MF').map(s => (
                    <option key={s.value} value={s.value}>└─ {s.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="dry_run_check"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="dry_run_check" className="text-xs font-semibold text-[var(--text-secondary)] cursor-pointer select-none">
                  Dry Run Only (Preview without writing changes to DB)
                </label>
              </div>

              <button
                onClick={handleRunRecalculation}
                disabled={recalculating}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                {recalculating ? 'Processing...' : 'Run Recalculation'}
              </button>

              {recalcResult && (
                <div className="p-4 bg-[var(--card-bg-opaque)] rounded-lg border border-[var(--stroke)] space-y-2">
                  <div className="font-bold text-xs text-emerald-600">{recalcResult.message}</div>
                  {recalcResult.samples && recalcResult.samples.length > 0 && (
                    <div className="text-xs space-y-1 pt-1">
                      <div className="font-semibold text-[var(--text-muted)]">Sample Results:</div>
                      {recalcResult.samples.map(s => (
                        <div key={s.receipt_id} className="p-1.5 bg-[var(--card-bg)] rounded border border-[var(--stroke)] text-[11px] flex justify-between">
                          <span>#{s.receipt_no || s.receipt_id} ({s.category} / {s.txn_type}): ₹{s.amount}</span>
                          <span className="font-bold text-blue-600">CC: ₹{s.calculated_cc} | SI: ₹{s.calculated_si}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CCSIRulesView
