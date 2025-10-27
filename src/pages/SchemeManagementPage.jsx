import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { 
  FiDatabase, 
  FiPlus, 
  FiEdit, 
  FiTrash2, 
  FiRefreshCw,
  FiArrowLeft,
  FiTag,
  FiSearch
} from 'react-icons/fi'

export default function SchemeManagementPage() {
  const { token, user } = useAuth()
  const [activeTab, setActiveTab] = useState('MF')
  const [amcs, setAmcs] = useState([])
  const [schemes, setSchemes] = useState([])
  const [fdIssuers, setFdIssuers] = useState([])
  const [fdSchemes, setFdSchemes] = useState([])
  const [fdRateSlabs, setFdRateSlabs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedAmc, setSelectedAmc] = useState(null)
  const [selectedFdIssuer, setSelectedFdIssuer] = useState(null)
  const [selectedFdScheme, setSelectedFdScheme] = useState(null)
  const [showAMCForm, setShowAMCForm] = useState(false)
  const [showSchemeForm, setShowSchemeForm] = useState(false)
  const [showFDIssuerForm, setShowFDIssuerForm] = useState(false)
  const [showFDSchemeForm, setShowFDSchemeForm] = useState(false)
  const [showFDSlabForm, setShowFDSlabForm] = useState(false)
  const [editingFDIssuer, setEditingFDIssuer] = useState(null)
  const [editingFDScheme, setEditingFDScheme] = useState(null)
  const [editingFDSlab, setEditingFDSlab] = useState(null)
  const [editingAMC, setEditingAMC] = useState(null)
  const [editingScheme, setEditingScheme] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [amcFormData, setAmcFormData] = useState({
    amc_name: '',
    amc_code: ''
  })
  const [schemeFormData, setSchemeFormData] = useState({
    scheme_name: '',
    scheme_code: '',
    category: 'Equity',
    sub_category: '',
    plan: 'Regular',
    type: 'Open Ended',
    is_nfo: false,
    nfo_validity: ''
  })
  
  // FD Form Data States
  const [fdIssuerFormData, setFdIssuerFormData] = useState({
    legal_name: '',
    short_name: '',
    type: 'NBFC',
    credit_rating_agency: '',
    credit_rating: '',
    min_deposit_amount: 10000,
    max_deposit_amount: null,
    premature_withdrawal_policy: '',
    notes_compliance: '',
    is_active: true,
    schemes: []
  })
  
  const [fdSchemeFormData, setFdSchemeFormData] = useState({
    scheme_id: '',
    scheme_name: '',
    description_short: '',
    is_cumulative: false,
    payout_frequency_type: ['Monthly'],
    lock_in_months: 0,
    premature_allowed: true,
    premature_terms: '',
    min_tenure_months: 12,
    max_tenure_months: 60,
    min_amount: null,
    max_amount: null,
    senior_citizen_bonus_bps: 0,
    women_bonus_bps: 0,
    renewal_bonus_bps: 0,
    tds_applicable: true,
    show_form15g15h_option: true,
    is_active: true,
    rate_slabs: []
  })
  
  const [fdSlabFormData, setFdSlabFormData] = useState({
    slab_id: '',
    tenure_min_months: 12,
    tenure_max_months: 24,
    payout_frequency_type: 'Monthly',
    base_interest_rate_pa: 0,
    compounding_frequency: 'Quarterly',
    effective_yield_pa: null,
    notes_public_display: '',
    is_active: true
  })

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (!isAdmin) return
    if (activeTab === 'MF') {
      loadAMCs()
    } else if (activeTab === 'FD') {
      loadFDIssuers()
    }
  }, [token, isAdmin, activeTab])

  useEffect(() => {
    if (selectedAmc) {
      loadSchemes(selectedAmc.amc_code)
    }
  }, [selectedAmc, token])

  useEffect(() => {
    if (selectedFdIssuer) {
      loadFDSchemes(selectedFdIssuer.issuer_key)
    }
  }, [selectedFdIssuer, token])

  useEffect(() => {
    if (selectedFdScheme) {
      loadFDRateSlabs(selectedFdScheme.scheme_id)
    }
  }, [selectedFdScheme, token])

  const loadAMCs = async () => {
    if (!token) return
    
    setLoading(true)
    setError('')
    
    try {
      const result = await api.listAMCs(token)
      setAmcs(Array.isArray(result) ? result : [])
    } catch (err) {
      setError(err.message || 'Failed to load AMCs')
    } finally {
      setLoading(false)
    }
  }

  const loadSchemes = async (amc_code) => {
    if (!token || !amc_code) return
    
    setLoading(true)
    setError('')
    
    try {
      const result = await api.getSchemesByAMC(token, amc_code)
      setSchemes(Array.isArray(result) ? result : [])
    } catch (err) {
      setError(err.message || 'Failed to load schemes')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAMC = async (e) => {
    e.preventDefault()
    
    try {
      await api.createAMC(token, amcFormData)
      await loadAMCs()
      setShowAMCForm(false)
      resetAMCForm()
    } catch (err) {
      alert('Failed to create AMC: ' + err.message)
    }
  }

  const handleUpdateAMC = async (e) => {
    e.preventDefault()
    
    try {
      await api.updateAMC(token, editingAMC.amc_code, amcFormData)
      await loadAMCs()
      setEditingAMC(null)
      resetAMCForm()
    } catch (err) {
      alert('Failed to update AMC: ' + err.message)
    }
  }

  const handleDeleteAMC = async (amc_code) => {
    if (!confirm('Are you sure you want to delete this AMC and all its schemes?')) return
    
    try {
      await api.deleteAMC(token, amc_code)
      await loadAMCs()
      setSelectedAmc(null)
    } catch (err) {
      alert('Failed to delete AMC: ' + err.message)
    }
  }

  const handleCreateScheme = async (e) => {
    e.preventDefault()
    
    if (!selectedAmc) {
      alert('Please select an AMC first')
      return
    }
    
    try {
      const schemeData = {
        ...schemeFormData,
        amc_code: selectedAmc.amc_code,
        amc_name: selectedAmc.amc_name,
        nav_latest: 0,
        nav_date: new Date().toISOString().split('T')[0]
      }
      
      await api.createScheme(token, schemeData)
      await loadSchemes(selectedAmc.amc_code)
      setShowSchemeForm(false)
      resetSchemeForm()
    } catch (err) {
      alert('Failed to create scheme: ' + err.message)
    }
  }

  const handleUpdateScheme = async (e) => {
    e.preventDefault()
    
    try {
      await api.updateScheme(token, editingScheme.scheme_code, schemeFormData)
      await loadSchemes(selectedAmc.amc_code)
      setEditingScheme(null)
      resetSchemeForm()
    } catch (err) {
      alert('Failed to update scheme: ' + err.message)
    }
  }

  const handleDeleteScheme = async (scheme_code) => {
    if (!confirm('Are you sure you want to delete this scheme?')) return
    
    try {
      await api.deleteScheme(token, scheme_code)
      await loadSchemes(selectedAmc.amc_code)
    } catch (err) {
      alert('Failed to delete scheme: ' + err.message)
    }
  }

  const resetAMCForm = () => {
    setAmcFormData({ amc_name: '', amc_code: '' })
  }

  const resetSchemeForm = () => {
    setSchemeFormData({
      scheme_name: '',
      scheme_code: '',
      category: 'Equity',
      sub_category: '',
      plan: 'Regular',
      type: 'Open Ended',
      is_nfo: false,
      nfo_validity: ''
    })
  }

  const openAMCEdit = (amc) => {
    setEditingAMC(amc)
    setAmcFormData({
      amc_name: amc.amc_name,
      amc_code: amc.amc_code
    })
  }

  const openSchemeEdit = (scheme) => {
    setEditingScheme(scheme)
    setSchemeFormData({
      scheme_name: scheme.scheme_name,
      scheme_code: scheme.scheme_code,
      category: scheme.category || 'Equity',
      sub_category: scheme.sub_category || '',
      plan: scheme.plan || 'Regular',
      type: scheme.type || 'Open Ended',
      is_nfo: scheme.is_nfo || false,
      nfo_validity: scheme.nfo_validity || ''
    })
  }
  
  // FD Handler Functions
  const handleCreateFDIssuer = async (e) => {
    e.preventDefault()
    try {
      await api.createFDIssuer(token, fdIssuerFormData)
      await loadFDIssuers()
      setShowFDIssuerForm(false)
      setFdIssuerFormData({
        legal_name: '',
        short_name: '',
        type: 'NBFC',
        credit_rating_agency: '',
        credit_rating: '',
        min_deposit_amount: 10000,
        max_deposit_amount: null,
        premature_withdrawal_policy: '',
        notes_compliance: '',
        is_active: true,
        schemes: []
      })
    } catch (err) {
      alert('Failed to create FD issuer: ' + err.message)
    }
  }
  
  const handleUpdateFDIssuer = async (e) => {
    e.preventDefault()
    try {
      await api.updateFDIssuer(token, editingFDIssuer._key, fdIssuerFormData)
      await loadFDIssuers()
      setEditingFDIssuer(null)
      setShowFDIssuerForm(false)
    } catch (err) {
      alert('Failed to update FD issuer: ' + err.message)
    }
  }
  
  const handleDeleteFDIssuer = async (issuer_key) => {
    if (!confirm('Are you sure you want to delete this FD issuer and all its schemes?')) return
    try {
      await api.deleteFDIssuer(token, issuer_key)
      await loadFDIssuers()
      setSelectedFdIssuer(null)
    } catch (err) {
      alert('Failed to delete FD issuer: ' + err.message)
    }
  }
  
  const handleCreateFDScheme = async (e) => {
    e.preventDefault()
    if (!selectedFdIssuer) {
      alert('Please select an FD issuer first')
      return
    }
    try {
      await api.createFDScheme(token, selectedFdIssuer._key, fdSchemeFormData)
      await loadFDSchemes(selectedFdIssuer._key)
      setShowFDSchemeForm(false)
      resetFDSchemeForm()
    } catch (err) {
      alert('Failed to create FD scheme: ' + err.message)
    }
  }
  
  const handleUpdateFDScheme = async (e) => {
    e.preventDefault()
    if (!selectedFdIssuer || !editingFDScheme) return
    try {
      await api.updateFDScheme(token, selectedFdIssuer._key, editingFDScheme.scheme_id, fdSchemeFormData)
      await loadFDSchemes(selectedFdIssuer._key)
      setEditingFDScheme(null)
      setShowFDSchemeForm(false)
      resetFDSchemeForm()
    } catch (err) {
      alert('Failed to update FD scheme: ' + err.message)
    }
  }
  
  const handleDeleteFDScheme = async (scheme_id) => {
    if (!confirm('Are you sure you want to delete this FD scheme?')) return
    if (!selectedFdIssuer) return
    try {
      await api.deleteFDScheme(token, selectedFdIssuer._key, scheme_id)
      await loadFDSchemes(selectedFdIssuer._key)
    } catch (err) {
      alert('Failed to delete FD scheme: ' + err.message)
    }
  }
  
  const handleCreateFDSlab = async (e) => {
    e.preventDefault()
    if (!selectedFdIssuer || !selectedFdScheme) {
      alert('Please select an FD issuer and scheme first')
      return
    }
    try {
      await api.createFDRateSlab(token, selectedFdIssuer._key, selectedFdScheme.scheme_id, fdSlabFormData)
      await loadFDRateSlabs(selectedFdScheme.scheme_id)
      setShowFDSlabForm(false)
      resetFDSlabForm()
    } catch (err) {
      alert('Failed to create rate slab: ' + err.message)
    }
  }
  
  const handleUpdateFDSlab = async (e) => {
    e.preventDefault()
    if (!selectedFdIssuer || !selectedFdScheme || !editingFDSlab) return
    try {
      await api.updateFDRateSlab(token, selectedFdIssuer._key, selectedFdScheme.scheme_id, editingFDSlab.slab_id, fdSlabFormData)
      await loadFDRateSlabs(selectedFdScheme.scheme_id)
      setEditingFDSlab(null)
      setShowFDSlabForm(false)
      resetFDSlabForm()
    } catch (err) {
      alert('Failed to update rate slab: ' + err.message)
    }
  }
  
  const resetFDIssuerForm = () => {
    setFdIssuerFormData({
      legal_name: '',
      short_name: '',
      type: 'NBFC',
      credit_rating_agency: '',
      credit_rating: '',
      min_deposit_amount: 10000,
      max_deposit_amount: null,
      premature_withdrawal_policy: '',
      notes_compliance: '',
      is_active: true,
      schemes: []
    })
  }
  
  const resetFDSchemeForm = () => {
    setFdSchemeFormData({
      scheme_id: '',
      scheme_name: '',
      description_short: '',
      is_cumulative: false,
      payout_frequency_type: ['Monthly'],
      lock_in_months: 0,
      premature_allowed: true,
      premature_terms: '',
      min_tenure_months: 12,
      max_tenure_months: 60,
      min_amount: null,
      max_amount: null,
      senior_citizen_bonus_bps: 0,
      women_bonus_bps: 0,
      renewal_bonus_bps: 0,
      tds_applicable: true,
      show_form15g15h_option: true,
      is_active: true,
      rate_slabs: []
    })
  }
  
  const resetFDSlabForm = () => {
    setFdSlabFormData({
      slab_id: '',
      tenure_min_months: 12,
      tenure_max_months: 24,
      payout_frequency_type: 'Monthly',
      base_interest_rate_pa: 0,
      compounding_frequency: 'Quarterly',
      effective_yield_pa: null,
      notes_public_display: '',
      is_active: true
    })
  }
  
  const openFDIssuerEdit = (issuer) => {
    setEditingFDIssuer(issuer)
    setFdIssuerFormData({
      legal_name: issuer.legal_name || '',
      short_name: issuer.short_name || '',
      type: issuer.type || 'NBFC',
      credit_rating_agency: issuer.credit_rating_agency || '',
      credit_rating: issuer.credit_rating || '',
      min_deposit_amount: issuer.min_deposit_amount || 10000,
      max_deposit_amount: issuer.max_deposit_amount || null,
      premature_withdrawal_policy: issuer.premature_withdrawal_policy || '',
      notes_compliance: issuer.notes_compliance || '',
      is_active: issuer.is_active !== undefined ? issuer.is_active : true,
      schemes: issuer.schemes || []
    })
  }
  
  const openFDSchemeEdit = (scheme) => {
    setEditingFDScheme(scheme)
    setFdSchemeFormData({
      scheme_id: scheme.scheme_id || '',
      scheme_name: scheme.scheme_name || '',
      description_short: scheme.description_short || '',
      is_cumulative: scheme.is_cumulative || false,
      payout_frequency_type: scheme.payout_frequency_type || ['Monthly'],
      lock_in_months: scheme.lock_in_months || 0,
      premature_allowed: scheme.premature_allowed || true,
      premature_terms: scheme.premature_terms || '',
      min_tenure_months: scheme.min_tenure_months || 12,
      max_tenure_months: scheme.max_tenure_months || 60,
      min_amount: scheme.min_amount || null,
      max_amount: scheme.max_amount || null,
      senior_citizen_bonus_bps: scheme.senior_citizen_bonus_bps || 0,
      women_bonus_bps: scheme.women_bonus_bps || 0,
      renewal_bonus_bps: scheme.renewal_bonus_bps || 0,
      tds_applicable: scheme.tds_applicable || true,
      show_form15g15h_option: scheme.show_form15g15h_option || true,
      is_active: scheme.is_active !== undefined ? scheme.is_active : true,
      rate_slabs: scheme.rate_slabs || []
    })
  }
  
  const openFDSlabEdit = (slab) => {
    setEditingFDSlab(slab)
    setFdSlabFormData({
      slab_id: slab.slab_id || '',
      tenure_min_months: slab.tenure_min_months || 12,
      tenure_max_months: slab.tenure_max_months || 24,
      payout_frequency_type: slab.payout_frequency_type || 'Monthly',
      base_interest_rate_pa: slab.base_interest_rate_pa || 0,
      compounding_frequency: slab.compounding_frequency || 'Quarterly',
      effective_yield_pa: slab.effective_yield_pa || null,
      notes_public_display: slab.notes_public_display || '',
      is_active: slab.is_active !== undefined ? slab.is_active : true
    })
  }

  // FD Management Functions
  const loadFDIssuers = async () => {
    if (!token) return
    
    setLoading(true)
    setError('')
    
    try {
      const result = await api.listFDIssuers(token)
      setFdIssuers(Array.isArray(result) ? result : [])
    } catch (err) {
      setError(err.message || 'Failed to load FD issuers')
    } finally {
      setLoading(false)
    }
  }

  const loadFDSchemes = async (issuer_key) => {
    if (!token || !issuer_key) return
    
    setLoading(true)
    setError('')
    
    try {
      const result = await api.getFDSchemesByIssuer(token, issuer_key)
      setFdSchemes(Array.isArray(result) ? result : [])
    } catch (err) {
      setError(err.message || 'Failed to load FD schemes')
    } finally {
      setLoading(false)
    }
  }

  const loadFDRateSlabs = async (scheme_id) => {
    if (!token || !scheme_id || !selectedFdIssuer) return
    
    setLoading(true)
    setError('')
    
    try {
      const result = await api.getFDRateSlabs(token, selectedFdIssuer._key, scheme_id)
      setFdRateSlabs(Array.isArray(result) ? result : [])
    } catch (err) {
      setError(err.message || 'Failed to load rate slabs')
    } finally {
      setLoading(false)
    }
  }

  // Filter schemes based on search query
  const filteredSchemes = searchQuery
    ? schemes.filter(scheme =>
        scheme.scheme_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scheme.scheme_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (scheme.category && scheme.category.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : schemes

  const filteredFdIssuers = fdIssuers // Can add search later
  const filteredFdSchemes = fdSchemes // Can add search later

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <FiDatabase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">This page is only available for administrators.</p>
        </div>
      </div>
    )
  }

  // FD Detail View (Schemes Table)
  if (activeTab === 'FD' && selectedFdIssuer) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => setSelectedFdIssuer(null)}
            className="inline-flex items-center mb-4 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Back to FD Issuers
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedFdIssuer.short_name}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Legal Name: {selectedFdIssuer.legal_name} | Type: {selectedFdIssuer.type}
              </p>
            </div>
            <button
              onClick={() => {
                resetFDSchemeForm()
                setEditingFDScheme(null)
                setShowFDSchemeForm(true)
              }}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <FiPlus className="w-4 h-4 mr-2" />
              Add Scheme
            </button>
          </div>
        </div>

        {/* FD Schemes Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Scheme Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Tenure
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center">
                      <FiRefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
                    </td>
                  </tr>
                ) : filteredFdSchemes.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No FD schemes available.
                    </td>
                  </tr>
                ) : (
                  filteredFdSchemes.map((scheme) => (
                    <tr key={scheme.scheme_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{scheme.scheme_name}</div>
                        {scheme.description_short && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">{scheme.description_short}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {scheme.is_cumulative ? 'Cumulative' : 'Non-Cumulative'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {scheme.min_tenure_months} - {scheme.max_tenure_months} months
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          scheme.is_active 
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        }`}>
                          {scheme.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedFdScheme(scheme)
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                        >
                          View Rate Slabs
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openFDSchemeEdit(scheme)
                            setShowFDSchemeForm(true)
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                        >
                          <FiEdit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteFDScheme(scheme.scheme_id)
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FD Scheme Form Modal - Embedded in Schemes View */}
        {showFDSchemeForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {editingFDScheme ? 'Edit FD Scheme' : 'Add New FD Scheme'}
                </h2>
                <form onSubmit={editingFDScheme ? handleUpdateFDScheme : handleCreateFDScheme} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Scheme ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={fdSchemeFormData.scheme_id}
                        onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, scheme_id: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., SHRIRAM_REG_MONTHLY"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Scheme Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={fdSchemeFormData.scheme_name}
                        onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, scheme_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., Regular FD - Monthly Payout"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Short Description
                    </label>
                    <input
                      type="text"
                      value={fdSchemeFormData.description_short}
                      onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, description_short: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Brief description for display"
                    />
                  </div>
                  
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={fdSchemeFormData.is_cumulative}
                        onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, is_cumulative: e.target.checked })}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Cumulative (interest paid at maturity)
                      </span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Payout Frequency <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'On Maturity'].map(freq => (
                        <label key={freq} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={fdSchemeFormData.payout_frequency_type.includes(freq)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFdSchemeFormData({
                                  ...fdSchemeFormData,
                                  payout_frequency_type: [...fdSchemeFormData.payout_frequency_type, freq]
                                })
                              } else {
                                setFdSchemeFormData({
                                  ...fdSchemeFormData,
                                  payout_frequency_type: fdSchemeFormData.payout_frequency_type.filter(f => f !== freq)
                                })
                              }
                            }}
                            disabled={fdSchemeFormData.is_cumulative && freq !== 'On Maturity'}
                            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{freq}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Min Tenure (months) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={fdSchemeFormData.min_tenure_months}
                        onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, min_tenure_months: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Max Tenure (months) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={fdSchemeFormData.max_tenure_months}
                        onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, max_tenure_months: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Lock-in (months)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={fdSchemeFormData.lock_in_months}
                        onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, lock_in_months: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        checked={fdSchemeFormData.premature_allowed}
                        onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, premature_allowed: e.target.checked })}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Premature withdrawal allowed
                      </span>
                    </label>
                    {fdSchemeFormData.premature_allowed && (
                      <input
                        type="text"
                        required={fdSchemeFormData.premature_allowed}
                        value={fdSchemeFormData.premature_terms}
                        onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, premature_terms: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Premature withdrawal terms..."
                      />
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Senior Citizen Bonus (bps)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={fdSchemeFormData.senior_citizen_bonus_bps}
                        onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, senior_citizen_bonus_bps: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Women Bonus (bps)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={fdSchemeFormData.women_bonus_bps}
                        onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, women_bonus_bps: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Renewal Bonus (bps)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={fdSchemeFormData.renewal_bonus_bps}
                        onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, renewal_bonus_bps: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={fdSchemeFormData.tds_applicable}
                        onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, tds_applicable: e.target.checked })}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        TDS applicable
                      </span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={fdSchemeFormData.show_form15g15h_option}
                        onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, show_form15g15h_option: e.target.checked })}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Show Form 15G/15H option
                      </span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={fdSchemeFormData.is_active}
                        onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, is_active: e.target.checked })}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Scheme is active
                      </span>
                    </label>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowFDSchemeForm(false)
                        setEditingFDScheme(null)
                        resetFDSchemeForm()
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      {editingFDScheme ? 'Update Scheme' : 'Create Scheme'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // FD Rate Slabs View
  if (activeTab === 'FD' && selectedFdScheme) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => setSelectedFdScheme(null)}
            className="inline-flex items-center mb-4 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Back to Schemes
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedFdScheme.scheme_name}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {selectedFdIssuer.short_name} • {selectedFdScheme.is_cumulative ? 'Cumulative' : 'Non-Cumulative'}
              </p>
            </div>
            <button
              onClick={() => {
                resetFDSlabForm()
                setEditingFDSlab(null)
                setShowFDSlabForm(true)
              }}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <FiPlus className="w-4 h-4 mr-2" />
              Add Rate Slab
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tenure Range</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Payout Frequency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Base Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Effective Yield</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center">
                      <FiRefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
                    </td>
                  </tr>
                ) : fdRateSlabs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No rate slabs available. Add one to get started.
                    </td>
                  </tr>
                ) : (
                  fdRateSlabs.map((slab) => (
                    <tr key={slab._key} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {slab.tenure_min_months} - {slab.tenure_max_months} months
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {slab.payout_frequency_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-semibold">
                        {slab.base_interest_rate_pa}% p.a.
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                        {slab.effective_yield_pa ? `${slab.effective_yield_pa}% p.a.` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          slab.is_active 
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        }`}>
                          {slab.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setEditingFDSlab(slab)
                            setShowFDSlabForm(true)
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4"
                        >
                          <FiEdit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Delete this rate slab?')) {
                              try {
                                await api.deleteFDRateSlab(token, selectedFdIssuer._key, selectedFdScheme.scheme_id, slab.slab_id)
                                await loadFDRateSlabs(selectedFdScheme.scheme_id)
                              } catch (err) {
                                alert('Failed to delete slab: ' + err.message)
                              }
                            }
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FD Rate Slab Form Modal - Embedded in Rate Slabs View */}
        {showFDSlabForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {editingFDSlab ? 'Edit Rate Slab' : 'Add New Rate Slab'}
                </h2>
                <form onSubmit={editingFDSlab ? handleUpdateFDSlab : handleCreateFDSlab} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Slab ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fdSlabFormData.slab_id}
                      onChange={(e) => setFdSlabFormData({ ...fdSlabFormData, slab_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., 12to24_months_monthly"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Min Tenure (months) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={fdSlabFormData.tenure_min_months}
                        onChange={(e) => setFdSlabFormData({ ...fdSlabFormData, tenure_min_months: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Max Tenure (months) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={fdSlabFormData.tenure_max_months}
                        onChange={(e) => setFdSlabFormData({ ...fdSlabFormData, tenure_max_months: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Payout Frequency <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={fdSlabFormData.payout_frequency_type}
                        onChange={(e) => setFdSlabFormData({ ...fdSlabFormData, payout_frequency_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Half-Yearly">Half-Yearly</option>
                        <option value="Yearly">Yearly</option>
                        <option value="On Maturity">On Maturity</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Base Interest Rate (% p.a.) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="30"
                        step="0.01"
                        value={fdSlabFormData.base_interest_rate_pa}
                        onChange={(e) => setFdSlabFormData({ ...fdSlabFormData, base_interest_rate_pa: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Compounding Frequency <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={fdSlabFormData.compounding_frequency}
                        onChange={(e) => setFdSlabFormData({ ...fdSlabFormData, compounding_frequency: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="Quarterly">Quarterly</option>
                        <option value="Half-Yearly">Half-Yearly</option>
                        <option value="Yearly">Yearly</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Effective Yield (% p.a.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      step="0.01"
                      value={fdSlabFormData.effective_yield_pa || ''}
                      onChange={(e) => setFdSlabFormData({ ...fdSlabFormData, effective_yield_pa: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Leave empty to calculate automatically"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Public Display Notes
                    </label>
                    <input
                      type="text"
                      value={fdSlabFormData.notes_public_display}
                      onChange={(e) => setFdSlabFormData({ ...fdSlabFormData, notes_public_display: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., Rates effective 27-Oct-2025"
                    />
                  </div>
                  
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={fdSlabFormData.is_active}
                        onChange={(e) => setFdSlabFormData({ ...fdSlabFormData, is_active: e.target.checked })}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Slab is active
                      </span>
                    </label>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowFDSlabForm(false)
                        setEditingFDSlab(null)
                        resetFDSlabForm()
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      {editingFDSlab ? 'Update Slab' : 'Create Slab'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // MF Detail View (Schemes Table)
  if (activeTab === 'MF' && selectedAmc) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => setSelectedAmc(null)}
            className="inline-flex items-center mb-4 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Back to AMCs
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedAmc.amc_name}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                AMC Code: {selectedAmc.amc_code}
              </p>
            </div>
            
            <button
              onClick={() => {
                resetSchemeForm()
                setShowSchemeForm(true)
                setEditingScheme(null)
              }}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <FiPlus className="w-4 h-4 mr-2" />
              Add Scheme
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search schemes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Schemes Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Scheme Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    NFO
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredSchemes.map((scheme, idx) => (
                  <tr key={scheme.scheme_code || idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {scheme.scheme_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {scheme.scheme_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        {scheme.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {scheme.plan}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {scheme.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {scheme.is_nfo ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                          <FiTag className="w-3 h-3 mr-1" />
                          NFO
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openSchemeEdit(scheme)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4"
                      >
                        <FiEdit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteScheme(scheme.scheme_code)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSchemes.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      {searchQuery ? 'No schemes found matching your search.' : 'No schemes available. Add one to get started.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Scheme Form Modal */}
        {(showSchemeForm || editingScheme) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {editingScheme ? 'Edit Scheme' : 'Add New Scheme'}
                </h2>
                <form onSubmit={editingScheme ? handleUpdateScheme : handleCreateScheme} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Scheme Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={schemeFormData.scheme_name}
                        onChange={(e) => setSchemeFormData({ ...schemeFormData, scheme_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Scheme Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={schemeFormData.scheme_code}
                        onChange={(e) => setSchemeFormData({ ...schemeFormData, scheme_code: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={schemeFormData.category}
                        onChange={(e) => setSchemeFormData({ ...schemeFormData, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="Equity">Equity</option>
                        <option value="Debt">Debt</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="Commodity">Commodity</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Sub Category <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={schemeFormData.sub_category}
                        onChange={(e) => setSchemeFormData({ ...schemeFormData, sub_category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Plan <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={schemeFormData.plan}
                        onChange={(e) => setSchemeFormData({ ...schemeFormData, plan: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="Regular">Regular</option>
                        <option value="Direct">Direct</option>
                        <option value="ETF">ETF</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={schemeFormData.type}
                        onChange={(e) => setSchemeFormData({ ...schemeFormData, type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="Open Ended">Open Ended</option>
                        <option value="Close Ended">Close Ended</option>
                        <option value="Exchange Traded Fund">Exchange Traded Fund</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={schemeFormData.is_nfo}
                        onChange={(e) => setSchemeFormData({ ...schemeFormData, is_nfo: e.target.checked, nfo_validity: e.target.checked ? schemeFormData.nfo_validity : '' })}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        This is an NFO (New Fund Offering)
                      </span>
                    </label>
                  </div>
                  
                  {schemeFormData.is_nfo && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        NFO Validity Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required={schemeFormData.is_nfo}
                        value={schemeFormData.nfo_validity}
                        onChange={(e) => setSchemeFormData({ ...schemeFormData, nfo_validity: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSchemeForm(false)
                        setEditingScheme(null)
                        resetSchemeForm()
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      {editingScheme ? 'Update Scheme' : 'Create Scheme'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Master View (AMC Table)
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Scheme Management
        </h1>
        
        {/* Tab */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <button 
              onClick={() => setActiveTab('MF')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'MF'
                  ? 'text-gray-900 dark:text-white border-b-2 border-red-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Mutual Fund
            </button>
            <button 
              onClick={() => setActiveTab('FD')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'FD'
                  ? 'text-gray-900 dark:text-white border-b-2 border-red-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Fixed Deposit
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {/* AMC Form Modal */}
      {(showAMCForm || editingAMC) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {editingAMC ? 'Edit AMC' : 'Add New AMC'}
              </h2>
              <form onSubmit={editingAMC ? handleUpdateAMC : handleCreateAMC} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    AMC Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={amcFormData.amc_name}
                    onChange={(e) => setAmcFormData({ ...amcFormData, amc_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    AMC Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={amcFormData.amc_code}
                    onChange={(e) => setAmcFormData({ ...amcFormData, amc_code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    readOnly={!!editingAMC}
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAMCForm(false)
                      setEditingAMC(null)
                      resetAMCForm()
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    {editingAMC ? 'Update AMC' : 'Create AMC'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        {activeTab === 'MF' ? (
          <>
            <button
              onClick={() => {
                resetAMCForm()
                setShowAMCForm(true)
                setEditingAMC(null)
              }}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <FiPlus className="w-4 h-4 mr-2" />
              Add AMC
            </button>
            <button
              onClick={loadAMCs}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <FiRefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                resetFDIssuerForm()
                setShowFDIssuerForm(true)
                setEditingFDIssuer(null)
              }}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <FiPlus className="w-4 h-4 mr-2" />
              Add FD Issuer
            </button>
            <button
              onClick={loadFDIssuers}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <FiRefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </>
        )}
      </div>

      {/* Conditional Table */}
      {activeTab === 'MF' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  AMC Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  AMC Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Schemes
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center">
                    <FiRefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
                  </td>
                </tr>
              ) : amcs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No AMCs available. Add one to get started.
                  </td>
                </tr>
              ) : (
                amcs.map((amc, idx) => (
                  <tr 
                    key={amc.amc_code || idx} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => setSelectedAmc(amc)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {amc.amc_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {amc.amc_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedAmc(amc)
                        }}
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                      >
                        View Schemes
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openAMCEdit(amc)
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4"
                      >
                        <FiEdit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteAMC(amc.amc_code)
                        }}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Issuer Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Min Deposit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center">
                      <FiRefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
                    </td>
                  </tr>
                ) : filteredFdIssuers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No FD issuers available.
                    </td>
                  </tr>
                ) : (
                  filteredFdIssuers.map((issuer, idx) => (
                    <tr 
                      key={issuer.issuer_key || idx} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => setSelectedFdIssuer(issuer)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {issuer.short_name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{issuer.legal_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {issuer.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {issuer.credit_rating ? `${issuer.credit_rating_agency} - ${issuer.credit_rating}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        ₹{issuer.min_deposit_amount?.toLocaleString() || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedFdIssuer(issuer)
                          }}
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                        >
                          View Schemes
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openFDIssuerEdit(issuer)
                            setShowFDIssuerForm(true)
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                        >
                          <FiEdit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteFDIssuer(issuer._key)
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FD Issuer Form Modal */}
      {showFDIssuerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {editingFDIssuer ? 'Edit FD Issuer' : 'Add New FD Issuer'}
              </h2>
              <form onSubmit={editingFDIssuer ? handleUpdateFDIssuer : handleCreateFDIssuer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Legal Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fdIssuerFormData.legal_name}
                      onChange={(e) => setFdIssuerFormData({ ...fdIssuerFormData, legal_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Short Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fdIssuerFormData.short_name}
                      onChange={(e) => setFdIssuerFormData({ ...fdIssuerFormData, short_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={fdIssuerFormData.type}
                      onChange={(e) => setFdIssuerFormData({ ...fdIssuerFormData, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="NBFC">NBFC</option>
                      <option value="Bank">Bank</option>
                      <option value="Corporate FD">Corporate FD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Credit Rating Agency
                    </label>
                    <input
                      type="text"
                      value={fdIssuerFormData.credit_rating_agency}
                      onChange={(e) => setFdIssuerFormData({ ...fdIssuerFormData, credit_rating_agency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., CRISIL"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Credit Rating
                    </label>
                    <input
                      type="text"
                      value={fdIssuerFormData.credit_rating}
                      onChange={(e) => setFdIssuerFormData({ ...fdIssuerFormData, credit_rating: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., AAA (Stable)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Min Deposit Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={fdIssuerFormData.min_deposit_amount}
                      onChange={(e) => setFdIssuerFormData({ ...fdIssuerFormData, min_deposit_amount: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Deposit Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={fdIssuerFormData.max_deposit_amount || ''}
                    onChange={(e) => setFdIssuerFormData({ ...fdIssuerFormData, max_deposit_amount: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Leave empty for no limit"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Premature Withdrawal Policy <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows="3"
                    value={fdIssuerFormData.premature_withdrawal_policy}
                    onChange={(e) => setFdIssuerFormData({ ...fdIssuerFormData, premature_withdrawal_policy: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Describe the premature withdrawal terms..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Compliance Notes (Internal)
                  </label>
                  <textarea
                    rows="2"
                    value={fdIssuerFormData.notes_compliance}
                    onChange={(e) => setFdIssuerFormData({ ...fdIssuerFormData, notes_compliance: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Internal notes for RM..."
                  />
                </div>
                
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={fdIssuerFormData.is_active}
                      onChange={(e) => setFdIssuerFormData({ ...fdIssuerFormData, is_active: e.target.checked })}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Issuer is active
                    </span>
                  </label>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFDIssuerForm(false)
                      setEditingFDIssuer(null)
                      resetFDIssuerForm()
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    {editingFDIssuer ? 'Update Issuer' : 'Create Issuer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* FD Scheme Form Modal */}
      {showFDSchemeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {editingFDScheme ? 'Edit FD Scheme' : 'Add New FD Scheme'}
              </h2>
              <form onSubmit={editingFDScheme ? handleUpdateFDScheme : handleCreateFDScheme} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Scheme ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fdSchemeFormData.scheme_id}
                      onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, scheme_id: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., SHRIRAM_REG_MONTHLY"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Scheme Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fdSchemeFormData.scheme_name}
                      onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, scheme_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., Regular FD - Monthly Payout"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Short Description
                  </label>
                  <input
                    type="text"
                    value={fdSchemeFormData.description_short}
                    onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, description_short: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Brief description for display"
                  />
                </div>
                
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={fdSchemeFormData.is_cumulative}
                      onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, is_cumulative: e.target.checked })}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cumulative (interest paid at maturity)
                    </span>
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payout Frequency <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'On Maturity'].map(freq => (
                      <label key={freq} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={fdSchemeFormData.payout_frequency_type.includes(freq)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFdSchemeFormData({
                                ...fdSchemeFormData,
                                payout_frequency_type: [...fdSchemeFormData.payout_frequency_type, freq]
                              })
                            } else {
                              setFdSchemeFormData({
                                ...fdSchemeFormData,
                                payout_frequency_type: fdSchemeFormData.payout_frequency_type.filter(f => f !== freq)
                              })
                            }
                          }}
                          disabled={fdSchemeFormData.is_cumulative && freq !== 'On Maturity'}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{freq}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Min Tenure (months) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={fdSchemeFormData.min_tenure_months}
                      onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, min_tenure_months: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Max Tenure (months) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={fdSchemeFormData.max_tenure_months}
                      onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, max_tenure_months: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Lock-in (months)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={fdSchemeFormData.lock_in_months}
                      onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, lock_in_months: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={fdSchemeFormData.premature_allowed}
                      onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, premature_allowed: e.target.checked })}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Premature withdrawal allowed
                    </span>
                  </label>
                  {fdSchemeFormData.premature_allowed && (
                    <input
                      type="text"
                      required={fdSchemeFormData.premature_allowed}
                      value={fdSchemeFormData.premature_terms}
                      onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, premature_terms: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Premature withdrawal terms..."
                    />
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Senior Citizen Bonus (bps)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={fdSchemeFormData.senior_citizen_bonus_bps}
                      onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, senior_citizen_bonus_bps: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Women Bonus (bps)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={fdSchemeFormData.women_bonus_bps}
                      onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, women_bonus_bps: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Renewal Bonus (bps)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={fdSchemeFormData.renewal_bonus_bps}
                      onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, renewal_bonus_bps: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={fdSchemeFormData.tds_applicable}
                      onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, tds_applicable: e.target.checked })}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      TDS applicable
                    </span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={fdSchemeFormData.show_form15g15h_option}
                      onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, show_form15g15h_option: e.target.checked })}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Show Form 15G/15H option
                    </span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={fdSchemeFormData.is_active}
                      onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, is_active: e.target.checked })}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Scheme is active
                    </span>
                  </label>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFDSchemeForm(false)
                      setEditingFDScheme(null)
                      resetFDSchemeForm()
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    {editingFDScheme ? 'Update Scheme' : 'Create Scheme'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* FD Rate Slab Form Modal */}
      {showFDSlabForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {editingFDSlab ? 'Edit Rate Slab' : 'Add New Rate Slab'}
              </h2>
              <form onSubmit={editingFDSlab ? handleUpdateFDSlab : handleCreateFDSlab} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Slab ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fdSlabFormData.slab_id}
                    onChange={(e) => setFdSlabFormData({ ...fdSlabFormData, slab_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., 12to24_months_monthly"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Min Tenure (months) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={fdSlabFormData.tenure_min_months}
                      onChange={(e) => setFdSlabFormData({ ...fdSlabFormData, tenure_min_months: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Max Tenure (months) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={fdSlabFormData.tenure_max_months}
                      onChange={(e) => setFdSlabFormData({ ...fdSlabFormData, tenure_max_months: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Payout Frequency <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={fdSlabFormData.payout_frequency_type}
                      onChange={(e) => setFdSlabFormData({ ...fdSlabFormData, payout_frequency_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Half-Yearly">Half-Yearly</option>
                      <option value="Yearly">Yearly</option>
                      <option value="On Maturity">On Maturity</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Base Interest Rate (% p.a.) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="30"
                      step="0.01"
                      value={fdSlabFormData.base_interest_rate_pa}
                      onChange={(e) => setFdSlabFormData({ ...fdSlabFormData, base_interest_rate_pa: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Compounding Frequency <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={fdSlabFormData.compounding_frequency}
                      onChange={(e) => setFdSlabFormData({ ...fdSlabFormData, compounding_frequency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="Quarterly">Quarterly</option>
                      <option value="Half-Yearly">Half-Yearly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Effective Yield (% p.a.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="0.01"
                    value={fdSlabFormData.effective_yield_pa || ''}
                    onChange={(e) => setFdSlabFormData({ ...fdSlabFormData, effective_yield_pa: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Leave empty to calculate automatically"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Public Display Notes
                  </label>
                  <input
                    type="text"
                    value={fdSlabFormData.notes_public_display}
                    onChange={(e) => setFdSlabFormData({ ...fdSlabFormData, notes_public_display: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Rates effective 27-Oct-2025"
                  />
                </div>
                
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={fdSlabFormData.is_active}
                      onChange={(e) => setFdSlabFormData({ ...fdSlabFormData, is_active: e.target.checked })}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Slab is active
                    </span>
                  </label>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFDSlabForm(false)
                      setEditingFDSlab(null)
                      resetFDSlabForm()
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    {editingFDSlab ? 'Update Slab' : 'Create Slab'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

