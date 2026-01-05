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
  FiSearch,
  FiDownload,
  FiUpload
} from 'react-icons/fi'

export default function SchemeManagementPage() {
  const { token, user } = useAuth()
  const [activeTab, setActiveTab] = useState('MF')
  const [amcs, setAmcs] = useState([])
  const [schemes, setSchemes] = useState([])
  const [fdIssuers, setFdIssuers] = useState([])
  const [fdSchemes, setFdSchemes] = useState([])
  const [fdRateSlabs, setFdRateSlabs] = useState([])
  const [ncdBondIssuers, setNcdBondIssuers] = useState([])
  const [ncdBondSchemes, setNcdBondSchemes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedAmc, setSelectedAmc] = useState(null)
  const [selectedFdIssuer, setSelectedFdIssuer] = useState(null)
  const [selectedFdScheme, setSelectedFdScheme] = useState(null)
  const [selectedNcdBondIssuer, setSelectedNcdBondIssuer] = useState(null)
  const [selectedNcdBondScheme, setSelectedNcdBondScheme] = useState(null)
  const [showAMCForm, setShowAMCForm] = useState(false)
  const [showSchemeForm, setShowSchemeForm] = useState(false)
  const [showFDIssuerForm, setShowFDIssuerForm] = useState(false)
  const [showFDSchemeForm, setShowFDSchemeForm] = useState(false)
  const [showFDSlabForm, setShowFDSlabForm] = useState(false)
  const [showNcdBondIssuerForm, setShowNcdBondIssuerForm] = useState(false)
  const [showNcdBondSchemeForm, setShowNcdBondSchemeForm] = useState(false)
  const [editingFDIssuer, setEditingFDIssuer] = useState(null)
  const [editingFDScheme, setEditingFDScheme] = useState(null)
  const [editingFDSlab, setEditingFDSlab] = useState(null)
  const [editingNcdBondIssuer, setEditingNcdBondIssuer] = useState(null)
  const [editingNcdBondScheme, setEditingNcdBondScheme] = useState(null)
  const [editingAMC, setEditingAMC] = useState(null)
  const [editingScheme, setEditingScheme] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importResult, setImportResult] = useState(null)

  // Utility function to trim all string values in an object (including nested arrays/objects)
  const trimFormData = (obj) => {
    if (typeof obj === 'string') {
      return obj.trim()
    }
    if (Array.isArray(obj)) {
      return obj.map(item => trimFormData(item))
    }
    if (obj && typeof obj === 'object') {
      const trimmed = {}
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          trimmed[key] = trimFormData(obj[key])
        }
      }
      return trimmed
    }
    return obj
  }
  const [amcFormData, setAmcFormData] = useState({
    amc_name: '',
    amc_code: ''
  })
  const [schemeFormData, setSchemeFormData] = useState({
    base_name: '',
    scheme_code: '',
    category: 'Equity',
    sub_category: '',
    plans: ['REGULAR'],
    options: ['GROWTH'],
    type: 'OPEN_ENDED',
    is_nfo: false,
    nfo_validity: '',
    cc: 0,
    si: 0
  })
  
  // Variant preview states
  const [showVariantPreview, setShowVariantPreview] = useState(false)
  const [variantPreviewData, setVariantPreviewData] = useState([])
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [proposedAmfiCodes, setProposedAmfiCodes] = useState({})
  const [updateIfExists, setUpdateIfExists] = useState(false)

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
  
  // NCD/Bond Form Data States
  const [ncdBondIssuerFormData, setNcdBondIssuerFormData] = useState({
    legal_name: '',
    short_name: '',
    type: 'NCD',
    credit_rating_agency: '',
    credit_rating: '',
    is_active: true
  })
  
  const [ncdBondSchemeFormData, setNcdBondSchemeFormData] = useState({
    scheme_id: '',
    scheme_name: '',
    isin: '',
    description_short: '',
    coupon_rate: 0,
    face_value: 1000,
    issue_date: '',
    maturity_date: '',
    is_variable_rate: false,
    listing_status: 'Listed',
    credit_rating: '',
    min_investment: 10000,
    interest_payment_frequency: 'Quarterly',
    is_secured: true,
    early_redemption_allowed: false,
    early_redemption_terms: '',
    put_option_available: false,
    call_option_available: false,
    currency: 'INR',
    issue_size: '',
    is_active: true,
    cc: 0,
    si: 0
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
    cc: 0,
    si: 0,
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
    } else if (activeTab === 'NCDBond') {
      loadNcdBondIssuers()
    }
  }, [token, isAdmin, activeTab])

  useEffect(() => {
    if (selectedAmc) {
      loadSchemes(selectedAmc.amc_code)
    }
  }, [selectedAmc, token])

useEffect(() => {
  if (!selectedFdIssuer) {
    setFdSchemes([])
    setSelectedFdScheme(null)
    setFdRateSlabs([])
    return
  }
  
  const issuerKey = selectedFdIssuer._key || selectedFdIssuer.issuer_key
  if (!issuerKey) return
  
  // Reset scheme selection whenever issuer context changes
  setSelectedFdScheme(null)
  loadFDSchemes(issuerKey)
}, [selectedFdIssuer, token])

useEffect(() => {
  if (!selectedNcdBondIssuer) {
    setNcdBondSchemes([])
    setSelectedNcdBondScheme(null)
    return
  }
  
  const issuerKey = selectedNcdBondIssuer._key || selectedNcdBondIssuer.issuer_key
  if (!issuerKey) return
  
  // Reset scheme selection whenever issuer context changes
  setSelectedNcdBondScheme(null)
  loadNcdBondSchemes(issuerKey)
}, [selectedNcdBondIssuer, token])

useEffect(() => {
  if (!selectedFdScheme) {
    setFdRateSlabs([])
    return
  }
  loadFDRateSlabs(selectedFdScheme.scheme_id)
}, [selectedFdScheme, token])

  // Auto-calculate effective yield for cumulative schemes
  useEffect(() => {
    if (selectedFdScheme?.is_cumulative && fdSlabFormData.compounding_frequency && fdSlabFormData.base_interest_rate_pa) {
      const r = fdSlabFormData.base_interest_rate_pa / 100
      const n = fdSlabFormData.compounding_frequency === 'Monthly' ? 12 :
                fdSlabFormData.compounding_frequency === 'Quarterly' ? 4 :
                fdSlabFormData.compounding_frequency === 'Half-Yearly' ? 2 : 1
      const effectiveYield = Math.round(((Math.pow(1 + r / n, n) - 1) * 100) * 100) / 100
      // Only update if the calculated value is different from current value
      if (Math.abs((fdSlabFormData.effective_yield_pa || 0) - effectiveYield) > 0.001) {
        setFdSlabFormData(prev => ({ ...prev, effective_yield_pa: effectiveYield }))
      }
    }
  }, [fdSlabFormData.base_interest_rate_pa, fdSlabFormData.compounding_frequency, selectedFdScheme?.is_cumulative])

  // Export schemes to Excel (MF)
  const handleExportSchemes = async (amcCode = null) => {
    if (!token) {
      alert('Please login to export schemes')
      return
    }
    setExporting(true)
    try {
      const blob = await api.exportSchemesExcel(token, amcCode)
      if (!blob || blob.size === 0) {
        throw new Error('Empty file received from server')
      }
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `schemes-export-${amcCode || 'all'}-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      alert('Schemes exported successfully!')
    } catch (err) {
      console.error('Export error:', err)
      alert('Failed to export schemes: ' + (err.message || 'Unknown error'))
    } finally {
      setExporting(false)
    }
  }

  // Export FD schemes to Excel
  const handleExportFDSchemes = async (issuerKey = null) => {
    if (!token) {
      alert('Please login to export FD schemes')
      return
    }
    setExporting(true)
    try {
      const blob = await api.exportFDSchemesExcel(token, issuerKey)
      if (!blob || blob.size === 0) {
        throw new Error('Empty file received from server')
      }
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fd-schemes-export-${issuerKey || 'all'}-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      alert('FD Schemes exported successfully!')
    } catch (err) {
      console.error('Export error:', err)
      alert('Failed to export FD schemes: ' + (err.message || 'Unknown error'))
    } finally {
      setExporting(false)
    }
  }

  // Export NCD/Bond schemes to Excel
  const handleExportNcdBondSchemes = async (issuerKey = null) => {
    if (!token) {
      alert('Please login to export NCD/Bond schemes')
      return
    }
    setExporting(true)
    try {
      const blob = await api.exportNCDBondSchemesExcel(token, issuerKey)
      if (!blob || blob.size === 0) {
        throw new Error('Empty file received from server')
      }
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ncd-bond-schemes-export-${issuerKey || 'all'}-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      alert('NCD/Bond Schemes exported successfully!')
    } catch (err) {
      console.error('Export error:', err)
      alert('Failed to export NCD/Bond schemes: ' + (err.message || 'Unknown error'))
    } finally {
      setExporting(false)
    }
  }

  // Handle import file selection
  const handleImportFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        alert('Please select an Excel file (.xlsx or .xls)')
        return
      }
      setImportFile(file)
    }
  }

  // Import schemes from Excel
  const handleImportSchemes = async () => {
    if (!importFile) {
      alert('Please select an Excel file to import')
      return
    }

    if (!confirm('This will update existing schemes based on the Excel file. Continue?')) {
      return
    }

    setImporting(true)
    setImportResult(null)
    try {
      let result
      if (activeTab === 'MF') {
        result = await api.importSchemesExcel(token, importFile)
        if (result.updated > 0 && selectedAmc) {
          await loadSchemes(selectedAmc.amc_code)
        }
      } else {
        result = await api.importFDSchemesExcel(token, importFile)
        if (result.updated > 0 && selectedFdIssuer) {
          const issuerKey = selectedFdIssuer._key || selectedFdIssuer.issuer_key
          if (issuerKey) {
            await loadFDSchemes(issuerKey)
          }
        }
      }
      
      setImportResult(result)
      
      if (result.updated > 0) {
        alert(`Import completed! Updated: ${result.updated}, Failed: ${result.failed}`)
      } else {
        alert('No schemes were updated. Please check the file format.')
      }
      
      // Reset file input
      setImportFile(null)
      setShowImportModal(false)
    } catch (err) {
      alert('Failed to import schemes: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

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
      const trimmedData = trimFormData(amcFormData)
      await api.createAMC(token, trimmedData)
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
      const trimmedData = trimFormData(amcFormData)
      await api.updateAMC(token, editingAMC.amc_code, trimmedData)
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

  // Generate variant preview
  const handlePreviewVariants = async () => {
    if (!selectedAmc) {
      alert('Please select an AMC first')
      return
    }
    
    if (!schemeFormData.base_name || !schemeFormData.base_name.trim()) {
      alert('Please enter a scheme name')
      return
    }
    
    if (schemeFormData.plans.length === 0) {
      alert('Please select at least one plan')
      return
    }
    
    if (schemeFormData.options.length === 0) {
      alert('Please select at least one option')
      return
    }
    
    setLoadingPreview(true)
    try {
      const previewData = {
        amc_code: selectedAmc.amc_code,
        amc_name: selectedAmc.amc_name,
        base_name: schemeFormData.base_name,
        category: schemeFormData.category,
        sub_category: schemeFormData.sub_category,
        type: schemeFormData.type,
        is_nfo: schemeFormData.is_nfo,
        plans: schemeFormData.plans,
        options: schemeFormData.options,
        proposedAmfiCodes: proposedAmfiCodes
      }
      
      const result = await api.expandPreview(token, previewData)
      
      // Initialize each variant with selected: true and editable amfi_code
      const initializedVariants = result.variants.map((v, idx) => ({
        ...v,
        selected: !v.exists, // Pre-select only non-existing variants
        id: `${v.plan}|${v.option}`,
        cc: v.cc || 0,
        si: v.si || 0
      }))
      
      setVariantPreviewData(initializedVariants)
      setShowVariantPreview(true)
    } catch (err) {
      alert('Failed to generate preview: ' + err.message)
    } finally {
      setLoadingPreview(false)
    }
  }
  
  // Commit selected variants
  const handleCommitVariants = async () => {
    const selectedVariants = variantPreviewData.filter(v => v.selected)
    
    if (selectedVariants.length === 0) {
      alert('Please select at least one variant to create')
      return
    }
    
    // Validate all selected variants have AMFI codes (unless NFO)
    const missingAmfi = selectedVariants.filter(v => !v.amfi_code && !schemeFormData.is_nfo)
    if (missingAmfi.length > 0) {
      alert('All selected variants must have an AMFI code (or enable NFO mode)')
      return
    }
    
    setLoadingPreview(true)
    try {
      const commitData = trimFormData({
        amc_code: selectedAmc.amc_code,
        amc_name: selectedAmc.amc_name,
        base_name: schemeFormData.base_name,
        category: schemeFormData.category,
        sub_category: schemeFormData.sub_category,
        type: schemeFormData.type,
        is_nfo: schemeFormData.is_nfo,
        nfo_validity: schemeFormData.nfo_validity,
        variants: selectedVariants.map(v => ({
          plan: v.plan,
          option: v.option,
          amfi_code: v.amfi_code,
          cc: v.cc || 0,
          si: v.si || 0,
          selected: true,
          updateIfExists: updateIfExists
        }))
      })
      
      const result = await api.commitVariants(token, commitData)
      
      let message = `Successfully processed ${selectedVariants.length} variants:\n`
      message += `Created: ${result.created}\n`
      message += `Updated: ${result.updated}\n`
      message += `Skipped: ${result.skipped}`
      
      if (result.errors && result.errors.length > 0) {
        message += `\n\nErrors:\n${result.errors.map(e => `${e.variant}: ${e.error}`).join('\n')}`
      }
      
      alert(message)
      
      await loadSchemes(selectedAmc.amc_code)
      setShowSchemeForm(false)
      setShowVariantPreview(false)
      resetSchemeForm()
    } catch (err) {
      alert('Failed to commit variants: ' + err.message)
    } finally {
      setLoadingPreview(false)
    }
  }
  
  const handleCreateScheme = async (e) => {
    e.preventDefault()
    
    // Use variant preview flow
    handlePreviewVariants()
  }

  const handleUpdateScheme = async (e) => {
    e.preventDefault()
    
    try {
      const trimmedData = trimFormData({
        ...schemeFormData,
        cc: schemeFormData.cc !== undefined ? schemeFormData.cc : null,
        si: schemeFormData.si !== undefined ? schemeFormData.si : null
      })
      await api.updateScheme(token, editingScheme.scheme_code, trimmedData)
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
      base_name: '',
      scheme_code: '',
      category: 'Equity',
      sub_category: '',
      plans: ['REGULAR'],
      options: ['GROWTH'],
      type: 'OPEN_ENDED',
      is_nfo: false,
      nfo_validity: '',
      cc: 0,
      si: 0
    })
    setShowVariantPreview(false)
    setVariantPreviewData([])
    setProposedAmfiCodes({})
    setUpdateIfExists(false)
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
      base_name: scheme.base_name || scheme.scheme_name || '',
      scheme_code: scheme.scheme_code || '',
      category: scheme.category || 'Equity',
      sub_category: scheme.sub_category || '',
      plans: scheme.plan ? [scheme.plan] : ['REGULAR'],
      options: scheme.option ? [scheme.option] : ['GROWTH'],
      type: scheme.type || 'OPEN_ENDED',
      is_nfo: scheme.is_nfo || false,
      nfo_validity: scheme.nfo_validity || '',
      cc: scheme.cc || 0,
      si: scheme.si || 0
    })
    setShowVariantPreview(false) // Don't show variant preview when editing
  }
  
  // FD Handler Functions
  const handleCreateFDIssuer = async (e) => {
    e.preventDefault()
    try {
      const trimmedData = trimFormData(fdIssuerFormData)
      await api.createFDIssuer(token, trimmedData)
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
      const trimmedData = trimFormData(fdIssuerFormData)
      await api.updateFDIssuer(token, editingFDIssuer._key, trimmedData)
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
  
  const handleDeleteNcdBondIssuer = async (issuer_key) => {
    if (!confirm('Are you sure you want to delete this NCD/Bond issuer and all its schemes?')) return
    try {
      await api.deleteNCDBondIssuer(token, issuer_key)
      await loadNcdBondIssuers()
      setSelectedNcdBondIssuer(null)
    } catch (err) {
      alert('Failed to delete NCD/Bond issuer: ' + err.message)
    }
  }
  
  const handleCreateFDScheme = async (e) => {
    e.preventDefault()
    if (!selectedFdIssuer) {
      alert('Please select an FD issuer first')
      return
    }
    try {
      const issuerKey = selectedFdIssuer._key || selectedFdIssuer.issuer_key
      const trimmedData = trimFormData(fdSchemeFormData)
      await api.createFDScheme(token, issuerKey, trimmedData)
      await loadFDSchemes(issuerKey)
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
      const issuerKey = selectedFdIssuer._key || selectedFdIssuer.issuer_key
      const trimmedData = trimFormData(fdSchemeFormData)
      await api.updateFDScheme(token, issuerKey, editingFDScheme.scheme_id, trimmedData)
      await loadFDSchemes(issuerKey)
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
      const issuerKey = selectedFdIssuer._key || selectedFdIssuer.issuer_key
      await api.deleteFDScheme(token, issuerKey, scheme_id)
      await loadFDSchemes(issuerKey)
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
      const issuerKey = selectedFdIssuer._key || selectedFdIssuer.issuer_key
      const trimmedData = trimFormData(fdSlabFormData)
      await api.createFDRateSlab(token, issuerKey, selectedFdScheme.scheme_id, trimmedData)
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
      const issuerKey = selectedFdIssuer._key || selectedFdIssuer.issuer_key
      const trimmedData = trimFormData(fdSlabFormData)
      await api.updateFDRateSlab(token, issuerKey, selectedFdScheme.scheme_id, editingFDSlab.slab_id, trimmedData)
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
      cc: 0,
      si: 0,
      rate_slabs: []
    })
  }
  
  const resetFDSlabForm = () => {
    // Auto-set payout frequency to "On Maturity" for cumulative schemes
    const defaultPayoutFrequency = selectedFdScheme?.is_cumulative ? 'On Maturity' : 'Monthly'
    setFdSlabFormData({
      slab_id: '',
      tenure_min_months: 12,
      tenure_max_months: 24,
      payout_frequency_type: defaultPayoutFrequency,
      base_interest_rate_pa: 0,
      compounding_frequency: null,
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
      cc: scheme.cc || 0,
      si: scheme.si || 0,
      rate_slabs: scheme.rate_slabs || []
    })
  }
  
  const openFDSlabEdit = (slab) => {
    setEditingFDSlab(slab)
    // Auto-set payout frequency to "On Maturity" for cumulative schemes
    const defaultPayoutFrequency = selectedFdScheme?.is_cumulative ? 'On Maturity' : (slab.payout_frequency_type || 'Monthly')
    setFdSlabFormData({
      slab_id: slab.slab_id || '',
      tenure_min_months: slab.tenure_min_months || 12,
      tenure_max_months: slab.tenure_max_months || 24,
      payout_frequency_type: defaultPayoutFrequency,
      base_interest_rate_pa: slab.base_interest_rate_pa || 0,
      compounding_frequency: slab.compounding_frequency || null,
      effective_yield_pa: slab.effective_yield_pa || null,
      notes_public_display: slab.notes_public_display || '',
      is_active: slab.is_active !== undefined ? slab.is_active : true
    })
  }
  
  // NCD/Bond Handler Functions
  const openNcdBondIssuerEdit = (issuer) => {
    setEditingNcdBondIssuer(issuer)
    setNcdBondIssuerFormData({
      legal_name: issuer.legal_name || '',
      short_name: issuer.short_name || '',
      type: issuer.type || 'NCD',
      credit_rating_agency: issuer.credit_rating_agency || '',
      credit_rating: issuer.credit_rating || '',
      is_active: issuer.is_active !== undefined ? issuer.is_active : true
    })
  }
  
  const openNcdBondSchemeEdit = (scheme) => {
    setEditingNcdBondScheme(scheme)
    setNcdBondSchemeFormData({
      scheme_id: scheme.scheme_id || '',
      scheme_name: scheme.scheme_name || '',
      isin: scheme.isin || '',
      description_short: scheme.description_short || scheme.description || '',
      coupon_rate: scheme.coupon_rate || 0,
      face_value: scheme.face_value || 1000,
      issue_date: scheme.issue_date || '',
      maturity_date: scheme.maturity_date || '',
      is_variable_rate: scheme.is_variable_rate || false,
      listing_status: scheme.listing_status || 'Listed',
      credit_rating: scheme.credit_rating || '',
      min_investment: scheme.min_investment || 10000,
      interest_payment_frequency: scheme.interest_payment_frequency || 'Quarterly',
      is_secured: scheme.is_secured !== undefined ? scheme.is_secured : true,
      early_redemption_allowed: scheme.early_redemption_allowed || false,
      early_redemption_terms: scheme.early_redemption_terms || '',
      put_option_available: scheme.put_option_available || false,
      call_option_available: scheme.call_option_available || false,
      currency: scheme.currency || 'INR',
      issue_size: scheme.issue_size || '',
      is_active: scheme.is_active !== undefined ? scheme.is_active : true,
      cc: scheme.cc || 0,
      si: scheme.si || 0
    })
  }
  
  const resetNcdBondIssuerForm = () => {
    setNcdBondIssuerFormData({
      legal_name: '',
      short_name: '',
      type: 'NCD',
      credit_rating_agency: '',
      credit_rating: '',
      is_active: true
    })
  }
  
  const resetNcdBondSchemeForm = () => {
    setNcdBondSchemeFormData({
      scheme_id: '',
      scheme_name: '',
      isin: '',
      description_short: '',
      coupon_rate: 0,
      face_value: 1000,
      issue_date: '',
      maturity_date: '',
      is_variable_rate: false,
      listing_status: 'Listed',
      credit_rating: '',
      min_investment: 10000,
      interest_payment_frequency: 'Quarterly',
      is_secured: true,
      early_redemption_allowed: false,
      early_redemption_terms: '',
      put_option_available: false,
      call_option_available: false,
      currency: 'INR',
      issue_size: '',
      is_active: true,
      cc: 0,
      si: 0
    })
  }
  
  const handleCreateNcdBondIssuer = async (e) => {
    e.preventDefault()
    try {
      const trimmedData = trimFormData(ncdBondIssuerFormData)
      await api.createNCDBondIssuer(token, trimmedData)
      await loadNcdBondIssuers()
      setShowNcdBondIssuerForm(false)
      resetNcdBondIssuerForm()
    } catch (err) {
      alert('Failed to create NCD/Bond issuer: ' + err.message)
    }
  }
  
  const handleUpdateNcdBondIssuer = async (e) => {
    e.preventDefault()
    try {
      const trimmedData = trimFormData(ncdBondIssuerFormData)
      await api.updateNCDBondIssuer(token, editingNcdBondIssuer._key, trimmedData)
      await loadNcdBondIssuers()
      setEditingNcdBondIssuer(null)
      setShowNcdBondIssuerForm(false)
      resetNcdBondIssuerForm()
    } catch (err) {
      alert('Failed to update NCD/Bond issuer: ' + err.message)
    }
  }
  
  const handleCreateNcdBondScheme = async (e) => {
    e.preventDefault()
    if (!selectedNcdBondIssuer) {
      alert('Please select an NCD/Bond issuer first')
      return
    }
    try {
      const issuerKey = selectedNcdBondIssuer._key || selectedNcdBondIssuer.issuer_key
      const trimmedData = trimFormData(ncdBondSchemeFormData)
      await api.createNCDBondScheme(token, issuerKey, trimmedData)
      await loadNcdBondSchemes(issuerKey)
      setShowNcdBondSchemeForm(false)
      resetNcdBondSchemeForm()
    } catch (err) {
      alert('Failed to create NCD/Bond scheme: ' + err.message)
    }
  }
  
  const handleUpdateNcdBondScheme = async (e) => {
    e.preventDefault()
    if (!selectedNcdBondIssuer || !editingNcdBondScheme) return
    try {
      const issuerKey = selectedNcdBondIssuer._key || selectedNcdBondIssuer.issuer_key
      const trimmedData = trimFormData(ncdBondSchemeFormData)
      await api.updateNCDBondScheme(token, issuerKey, editingNcdBondScheme.scheme_id, trimmedData)
      await loadNcdBondSchemes(issuerKey)
      setEditingNcdBondScheme(null)
      setShowNcdBondSchemeForm(false)
      resetNcdBondSchemeForm()
    } catch (err) {
      alert('Failed to update NCD/Bond scheme: ' + err.message)
    }
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
      const list = Array.isArray(result) ? result : []
      const seen = new Set()
      const deduped = []
      
      for (const scheme of list) {
        const rawId = scheme?.scheme_id
        const key = rawId === undefined || rawId === null ? '' : String(rawId).trim().toUpperCase()
        if (key && seen.has(key)) {
          continue
        }
        if (key) seen.add(key)
        deduped.push(scheme)
      }
      
      setFdSchemes(deduped)
    } catch (err) {
      setError(err.message || 'Failed to load FD schemes')
    } finally {
      setLoading(false)
    }
  }

  const loadFDRateSlabs = async (scheme_id) => {
    if (!token || !scheme_id) return
    
    // If selectedFdIssuer is not set, don't load (rate slabs view requires issuer)
    if (!selectedFdIssuer) return
    
    setLoading(true)
    setError('')
    
    try {
      const issuerKey = selectedFdIssuer._key || selectedFdIssuer.issuer_key
      const result = await api.getFDRateSlabs(token, issuerKey, scheme_id)
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

  // NCD/Bond Management Functions
  const loadNcdBondIssuers = async () => {
    if (!token) return
    
    setLoading(true)
    setError('')
    
    try {
      const result = await api.listNCDBondIssuers(token)
      setNcdBondIssuers(Array.isArray(result) ? result : [])
    } catch (err) {
      setError(err.message || 'Failed to load NCD/Bond issuers')
    } finally {
      setLoading(false)
    }
  }

  const loadNcdBondSchemes = async (issuer_key) => {
    if (!token || !issuer_key) return
    
    setLoading(true)
    setError('')
    
    try {
      const result = await api.getNCDBondSchemesByIssuer(token, issuer_key)
      setNcdBondSchemes(Array.isArray(result) ? result : [])
    } catch (err) {
      setError(err.message || 'Failed to load NCD/Bond schemes')
    } finally {
      setLoading(false)
    }
  }

  // Note: NCDs/Bonds don't use rate slabs - they have fixed coupon rates

  const filteredNcdBondIssuers = ncdBondIssuers
  const filteredNcdBondSchemes = ncdBondSchemes

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

  // NCD/Bond Detail View (Schemes Table)
  if (activeTab === 'NCDBond' && selectedNcdBondIssuer) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => setSelectedNcdBondIssuer(null)}
            className="inline-flex items-center mb-4 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Back to NCD/Bond Issuers
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedNcdBondIssuer.short_name}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Legal Name: {selectedNcdBondIssuer.legal_name} | Type: {selectedNcdBondIssuer.type || 'NCD/Bond'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  const issuerKey = selectedNcdBondIssuer._key || selectedNcdBondIssuer.issuer_key
                  handleExportNcdBondSchemes(issuerKey)
                }}
                disabled={exporting}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiDownload className={`w-4 h-4 mr-2 ${exporting ? 'animate-spin' : ''}`} />
                {exporting ? 'Exporting...' : 'Export'}
              </button>
              <button
                onClick={() => {
                  resetNcdBondSchemeForm()
                  setEditingNcdBondScheme(null)
                  setShowNcdBondSchemeForm(true)
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiPlus className="w-4 h-4 mr-2" />
                Add Scheme
              </button>
            </div>
          </div>
        </div>

        {/* NCD/Bond Schemes Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Scheme Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    ISIN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Coupon Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Maturity Date
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
                    <td colSpan="6" className="px-6 py-8 text-center">
                      <FiRefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
                    </td>
                  </tr>
                ) : filteredNcdBondSchemes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No NCD/Bond schemes available.
                    </td>
                  </tr>
                ) : (
                  filteredNcdBondSchemes.map((scheme) => (
                    <tr key={scheme.scheme_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{scheme.scheme_name}</div>
                        {scheme.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">{scheme.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {scheme.isin || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {scheme.coupon_rate !== undefined ? `${scheme.coupon_rate}%` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {scheme.maturity_date ? new Date(scheme.maturity_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          scheme.is_active !== false
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        }`}>
                          {scheme.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            try {
                              openNcdBondSchemeEdit(scheme)
                              setShowNcdBondSchemeForm(true)
                            } catch (error) {
                              console.error('Error opening scheme edit:', error)
                              alert('Error opening edit form: ' + error.message)
                            }
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                        >
                          <FiEdit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            if (confirm('Are you sure you want to delete this scheme?')) {
                              try {
                                const issuerKey = selectedNcdBondIssuer._key || selectedNcdBondIssuer.issuer_key
                                await api.deleteNCDBondScheme(token, issuerKey, scheme.scheme_id)
                                await loadNcdBondSchemes(issuerKey)
                              } catch (err) {
                                setError(err.message || 'Failed to delete scheme')
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

        {/* NCD/Bond Scheme Form Modal - Inside Schemes View */}
        {showNcdBondSchemeForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {editingNcdBondScheme ? 'Edit NCD/Bond Scheme' : 'Add New NCD/Bond Scheme'}
                </h2>
                <form onSubmit={editingNcdBondScheme ? handleUpdateNcdBondScheme : handleCreateNcdBondScheme} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Scheme ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={ncdBondSchemeFormData.scheme_id}
                        onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, scheme_id: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., ADANI_NCD_SERIES_A"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Scheme Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={ncdBondSchemeFormData.scheme_name}
                        onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, scheme_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., Adani Enterprises NCD Series A"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ISIN <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={12}
                      value={ncdBondSchemeFormData.isin}
                      onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, isin: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., INE01XX07026"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Short Description
                    </label>
                    <input
                      type="text"
                      value={ncdBondSchemeFormData.description_short}
                      onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, description_short: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Brief description for display"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Coupon Rate (%) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={ncdBondSchemeFormData.coupon_rate}
                        onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, coupon_rate: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., 8.50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Face Value (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        value={ncdBondSchemeFormData.face_value}
                        onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, face_value: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., 1000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Issue Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={ncdBondSchemeFormData.issue_date}
                        onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, issue_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Maturity Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={ncdBondSchemeFormData.maturity_date}
                        onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, maturity_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Interest Payment Frequency
                      </label>
                      <select
                        value={ncdBondSchemeFormData.interest_payment_frequency}
                        onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, interest_payment_frequency: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Half-Yearly">Half-Yearly</option>
                        <option value="Annual">Annual</option>
                        <option value="Cumulative">Cumulative</option>
                        <option value="At Maturity">At Maturity</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Credit Rating
                      </label>
                      <input
                        type="text"
                        value={ncdBondSchemeFormData.credit_rating}
                        onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, credit_rating: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., AAA, AA+"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Listing Status
                      </label>
                      <select
                        value={ncdBondSchemeFormData.listing_status}
                        onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, listing_status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="Listed">Listed</option>
                        <option value="Unlisted">Unlisted</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Min Investment (₹)
                      </label>
                      <input
                        type="number"
                        value={ncdBondSchemeFormData.min_investment}
                        onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, min_investment: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., 10000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Currency
                      </label>
                      <input
                        type="text"
                        value={ncdBondSchemeFormData.currency}
                        onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, currency: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., INR"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Issue Size
                      </label>
                      <input
                        type="text"
                        value={ncdBondSchemeFormData.issue_size}
                        onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, issue_size: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., ₹500 Crores"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        CC %
                      </label>
                      <input
                        type="number"
                        step="0.00001"
                        value={ncdBondSchemeFormData.cc}
                        onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, cc: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., 0.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        SI %
                      </label>
                      <input
                        type="number"
                        step="0.00001"
                        value={ncdBondSchemeFormData.si}
                        onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, si: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., 0.2"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={ncdBondSchemeFormData.is_variable_rate}
                        onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, is_variable_rate: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                        Variable Rate
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={ncdBondSchemeFormData.is_secured}
                        onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, is_secured: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                        Secured
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={ncdBondSchemeFormData.early_redemption_allowed}
                        onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, early_redemption_allowed: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                        Early Redemption Allowed
                      </label>
                    </div>
                    {ncdBondSchemeFormData.early_redemption_allowed && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Early Redemption Terms
                        </label>
                        <input
                          type="text"
                          value={ncdBondSchemeFormData.early_redemption_terms}
                          onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, early_redemption_terms: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="e.g., After 12 months with penalty"
                        />
                      </div>
                    )}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={ncdBondSchemeFormData.put_option_available}
                        onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, put_option_available: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                        Put Option Available
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={ncdBondSchemeFormData.call_option_available}
                        onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, call_option_available: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                        Call Option Available
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={ncdBondSchemeFormData.is_active}
                        onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, is_active: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                        Is Active
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNcdBondSchemeForm(false)
                        setEditingNcdBondScheme(null)
                        resetNcdBondSchemeForm()
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {editingNcdBondScheme ? 'Update Scheme' : 'Add Scheme'}
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

  // FD Rate Slabs View - Must be checked BEFORE Schemes view
  if (activeTab === 'FD' && selectedFdScheme && selectedFdIssuer) {
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
                            openFDSlabEdit(slab)
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
                                const issuerKey = selectedFdIssuer._key || selectedFdIssuer.issuer_key
                                await api.deleteFDRateSlab(token, issuerKey, selectedFdScheme.scheme_id, slab.slab_id)
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
                        {selectedFdScheme?.is_cumulative && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Fixed for Cumulative)</span>
                        )}
                      </label>
                      <select
                        required
                        value={fdSlabFormData.payout_frequency_type}
                        onChange={(e) => setFdSlabFormData({ ...fdSlabFormData, payout_frequency_type: e.target.value })}
                        disabled={selectedFdScheme?.is_cumulative}
                        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                          selectedFdScheme?.is_cumulative ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Half-Yearly">Half-Yearly</option>
                        <option value="Yearly">Yearly</option>
                        <option value="On Maturity">On Maturity</option>
                      </select>
                      {selectedFdScheme?.is_cumulative && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Cumulative schemes payout only at maturity
                        </p>
                      )}
                    </div>
                  </div>
                  
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
                  
                  {selectedFdScheme?.is_cumulative && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Compounding Frequency <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={fdSlabFormData.compounding_frequency || ''}
                          onChange={(e) => setFdSlabFormData({ ...fdSlabFormData, compounding_frequency: e.target.value || null })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="Quarterly">Quarterly</option>
                          <option value="Half-Yearly">Half-Yearly</option>
                          <option value="Yearly">Yearly</option>
                        </select>
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
                    </>
                  )}
                  
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
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  const issuerKey = selectedFdIssuer._key || selectedFdIssuer.issuer_key
                  handleExportFDSchemes(issuerKey)
                }}
                disabled={exporting}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiDownload className={`w-4 h-4 mr-2 ${exporting ? 'animate-spin' : ''}`} />
                {exporting ? 'Exporting...' : 'Export'}
              </button>
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
                        onChange={(e) => {
                          const isCumulative = e.target.checked
                          setFdSchemeFormData({
                            ...fdSchemeFormData,
                            is_cumulative: isCumulative,
                            // Auto-set payout frequency based on cumulative status
                            payout_frequency_type: isCumulative ? ['On Maturity'] : ['Monthly']
                          })
                        }}
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
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        CC (%) <span className="text-gray-500">(Commission Credit)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={fdSchemeFormData.cc || 0}
                        onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, cc: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        SI (%) <span className="text-gray-500">(Service Income)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={fdSchemeFormData.si || 0}
                        onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, si: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowFDSchemeForm(false)
                        setTimeout(() => {
                          setEditingFDScheme(null)
                          resetFDSchemeForm()
                        }, 300)
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
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleExportSchemes(selectedAmc.amc_code)}
                disabled={exporting}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiDownload className={`w-4 h-4 mr-2 ${exporting ? 'animate-spin' : ''}`} />
                {exporting ? 'Exporting...' : 'Export'}
              </button>
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
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Option
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
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {scheme.display_name || scheme.scheme_name}
                      </div>
                      {scheme.display_name && scheme.display_name !== scheme.scheme_name && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Base: {scheme.base_name || scheme.scheme_name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        {scheme.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {scheme.plan || 'Regular'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {scheme.option ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          scheme.option === 'GROWTH' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                          scheme.option === 'IDCW_PAYOUT' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                          'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'
                        }`}>
                          {scheme.option === 'GROWTH' ? 'Growth' : 
                           scheme.option === 'IDCW_PAYOUT' ? 'IDCW-P' : 
                           scheme.option === 'IDCW_REINVEST' ? 'IDCW-R' : 
                           scheme.option}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
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
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowSchemeForm(false)
                setTimeout(() => {
                  setEditingScheme(null)
                  resetSchemeForm()
                }, 300)
              }
            }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {editingScheme ? 'Edit Scheme' : 'Add New Scheme'}
                </h2>
                {editingScheme ? (
                  /* Direct Edit Form for Existing Scheme */
                  <form onSubmit={handleUpdateScheme} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Scheme Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={schemeFormData.scheme_code}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Scheme code cannot be changed
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Scheme Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={schemeFormData.base_name}
                        onChange={(e) => setSchemeFormData({ ...schemeFormData, base_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
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
                          <option value="ETF">ETF</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Sub Category
                        </label>
                        <input
                          type="text"
                          value={schemeFormData.sub_category}
                          onChange={(e) => setSchemeFormData({ ...schemeFormData, sub_category: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Plan
                        </label>
                        <input
                          type="text"
                          value={schemeFormData.plans[0] || ''}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Option
                        </label>
                        <input
                          type="text"
                          value={schemeFormData.options[0] || ''}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Type
                      </label>
                      <select
                        value={schemeFormData.type}
                        onChange={(e) => setSchemeFormData({ ...schemeFormData, type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="OPEN_ENDED">Open Ended</option>
                        <option value="CLOSE_ENDED">Close Ended</option>
                        <option value="INTERVAL">Interval</option>
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          CC (%) <span className="text-gray-500">(Commission Credit)</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={schemeFormData.cc || 0}
                          onChange={(e) => setSchemeFormData({ ...schemeFormData, cc: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          SI (%) <span className="text-gray-500">(Service Income)</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={schemeFormData.si || 0}
                          onChange={(e) => setSchemeFormData({ ...schemeFormData, si: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingScheme(null)
                          setTimeout(() => {
                            resetSchemeForm()
                          }, 300)
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Update Scheme
                      </button>
                    </div>
                  </form>
                ) : !showVariantPreview ? (
                  <form onSubmit={handleCreateScheme} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Scheme Base Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={schemeFormData.base_name}
                        onChange={(e) => setSchemeFormData({ ...schemeFormData, base_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., HDFC Flexi Cap Fund"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Base name without plan or option suffixes
                      </p>
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
                          <option value="ETF">ETF</option>
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
                          placeholder="e.g., Flexi Cap, Large Cap"
                        />
                      </div>
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
                        <option value="OPEN_ENDED">Open Ended</option>
                        <option value="CLOSE_ENDED">Close Ended</option>
                        <option value="INTERVAL">Interval</option>
                      </select>
                    </div>
                    
                    {/* Plan Multi-Select */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Plan (Multi-Select) <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {['REGULAR', 'DIRECT'].map(plan => (
                          <label key={plan} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={schemeFormData.plans.includes(plan)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSchemeFormData({ ...schemeFormData, plans: [...schemeFormData.plans, plan] })
                                } else {
                                  setSchemeFormData({ ...schemeFormData, plans: schemeFormData.plans.filter(p => p !== plan) })
                                }
                              }}
                              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {plan === 'REGULAR' ? 'Regular' : 'Direct'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    {/* Option Multi-Select */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Option (Multi-Select) <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {['GROWTH', 'IDCW_PAYOUT', 'IDCW_REINVEST'].map(option => (
                          <label key={option} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={schemeFormData.options.includes(option)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSchemeFormData({ ...schemeFormData, options: [...schemeFormData.options, option] })
                                } else {
                                  setSchemeFormData({ ...schemeFormData, options: schemeFormData.options.filter(o => o !== option) })
                                }
                              }}
                              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {option === 'GROWTH' ? 'Growth' : option === 'IDCW_PAYOUT' ? 'IDCW – Payout' : 'IDCW – Reinvestment'}
                            </span>
                          </label>
                        ))}
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
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                          ⚠️ AMFI code required before activation
                        </p>
                      </div>
                    )}
                    
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSchemeForm(false)
                          setTimeout(() => {
                            setEditingScheme(null)
                            resetSchemeForm()
                          }, 300)
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loadingPreview || schemeFormData.plans.length === 0 || schemeFormData.options.length === 0}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingPreview ? 'Loading...' : 'Preview Variants'}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Variant Preview Table */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-md font-semibold text-gray-900 dark:text-white">
                        Preview Scheme Variants ({variantPreviewData.length} total)
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowVariantPreview(false)}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      >
                        ← Back to Form
                      </button>
                    </div>
                    
                    {schemeFormData.is_nfo && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          ⚠️ This is an NFO. AMFI code required before activation.
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        checked={updateIfExists}
                        onChange={(e) => setUpdateIfExists(e.target.checked)}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <label className="text-sm text-gray-700 dark:text-gray-300">
                        Update existing schemes if they already exist
                      </label>
                    </div>
                    
                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                              Select
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                              Display Name
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                              Plan
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                              Option
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                              AMFI Code
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                              CC (%)
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                              SI (%)
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {variantPreviewData.map((variant, idx) => (
                            <tr key={variant.id} className={variant.exists ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}>
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={variant.selected}
                                  onChange={(e) => {
                                    const updated = [...variantPreviewData]
                                    updated[idx].selected = e.target.checked
                                    setVariantPreviewData(updated)
                                  }}
                                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                />
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                                {variant.display_name}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                                {variant.plan}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                                {variant.option.replace('_', ' ')}
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={variant.amfi_code || ''}
                                  onChange={(e) => {
                                    const updated = [...variantPreviewData]
                                    updated[idx].amfi_code = e.target.value
                                    setVariantPreviewData(updated)
                                  }}
                                  placeholder="Enter AMFI code"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  value={variant.cc || 0}
                                  onChange={(e) => {
                                    const updated = [...variantPreviewData]
                                    updated[idx].cc = parseFloat(e.target.value) || 0
                                    setVariantPreviewData(updated)
                                  }}
                                  placeholder="0"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  value={variant.si || 0}
                                  onChange={(e) => {
                                    const updated = [...variantPreviewData]
                                    updated[idx].si = parseFloat(e.target.value) || 0
                                    setVariantPreviewData(updated)
                                  }}
                                  placeholder="0"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex flex-col gap-1">
                                  {variant.exists && (
                                    <span className="inline-flex text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200">
                                      Exists
                                    </span>
                                  )}
                                  {variant.missingAmfi && (
                                    <span className="inline-flex text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">
                                      Missing AMFI
                                    </span>
                                  )}
                                  {variant.warnings && variant.warnings.length > 0 && variant.warnings.map((warning, wIdx) => (
                                    <span key={wIdx} className="inline-flex text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200">
                                      {warning}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSchemeForm(false)
                          setTimeout(() => {
                            setEditingScheme(null)
                            resetSchemeForm()
                          }, 300)
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowVariantPreview(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleCommitVariants}
                        disabled={loadingPreview || variantPreviewData.filter(v => v.selected).length === 0}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingPreview ? 'Creating...' : `Create ${variantPreviewData.filter(v => v.selected).length} Variants`}
                      </button>
                    </div>
                  </div>
                )}
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
            <button 
              onClick={() => setActiveTab('NCDBond')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'NCDBond'
                  ? 'text-gray-900 dark:text-white border-b-2 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              NCD/Bonds
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
                      setTimeout(() => {
                        setEditingAMC(null)
                        resetAMCForm()
                      }, 300)
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
            <div className="flex items-center space-x-3">
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
                onClick={() => handleExportSchemes()}
                disabled={exporting}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiDownload className={`w-4 h-4 mr-2 ${exporting ? 'animate-spin' : ''}`} />
                {exporting ? 'Exporting...' : 'Export All'}
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiUpload className="w-4 h-4 mr-2" />
                Import
              </button>
            </div>
            <button
              onClick={loadAMCs}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <FiRefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </>
        ) : activeTab === 'FD' ? (
          <>
            <div className="flex items-center space-x-3">
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
                onClick={() => handleExportFDSchemes()}
                disabled={exporting}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiDownload className={`w-4 h-4 mr-2 ${exporting ? 'animate-spin' : ''}`} />
                {exporting ? 'Exporting...' : 'Export All'}
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiUpload className="w-4 h-4 mr-2" />
                Import
              </button>
            </div>
            <button
              onClick={loadFDIssuers}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <FiRefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </>
        ) : activeTab === 'NCDBond' ? (
          <>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  resetNcdBondIssuerForm()
                  setShowNcdBondIssuerForm(true)
                  setEditingNcdBondIssuer(null)
                }}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <FiPlus className="w-4 h-4 mr-2" />
                Add NCD/Bond Issuer
              </button>
              <button
                onClick={() => handleExportNcdBondSchemes()}
                disabled={exporting}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiDownload className={`w-4 h-4 mr-2 ${exporting ? 'animate-spin' : ''}`} />
                {exporting ? 'Exporting...' : 'Export All'}
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiUpload className="w-4 h-4 mr-2" />
                Import
              </button>
            </div>
            <button
              onClick={loadNcdBondIssuers}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <FiRefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </>
        ) : null}
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
      ) : activeTab === 'FD' && !selectedFdIssuer ? (
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
      ) : activeTab === 'NCDBond' && !selectedNcdBondIssuer ? (
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
                ) : filteredNcdBondIssuers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No NCD/Bond issuers available.
                    </td>
                  </tr>
                ) : (
                  filteredNcdBondIssuers.map((issuer, idx) => (
                    <tr 
                      key={issuer._key || idx} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => setSelectedNcdBondIssuer(issuer)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {issuer.short_name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{issuer.legal_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                          {issuer.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {issuer.credit_rating ? `${issuer.credit_rating_agency} - ${issuer.credit_rating}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedNcdBondIssuer(issuer)
                          }}
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                        >
                          View Schemes
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openNcdBondIssuerEdit(issuer)
                            setShowNcdBondIssuerForm(true)
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                        >
                          <FiEdit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteNcdBondIssuer(issuer._key)
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
      ) : null}

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
                      setTimeout(() => {
                        setEditingFDIssuer(null)
                        resetFDIssuerForm()
                      }, 300)
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
                      onChange={(e) => {
                        const isCumulative = e.target.checked
                        setFdSchemeFormData({
                          ...fdSchemeFormData,
                          is_cumulative: isCumulative,
                          // Auto-set payout frequency based on cumulative status
                          payout_frequency_type: isCumulative ? ['On Maturity'] : ['Monthly']
                        })
                      }}
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      CC (%) <span className="text-gray-500">(Commission Credit)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={fdSchemeFormData.cc || 0}
                      onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, cc: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      SI (%) <span className="text-gray-500">(Service Income)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={fdSchemeFormData.si || 0}
                      onChange={(e) => setFdSchemeFormData({ ...fdSchemeFormData, si: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
              <button
                    type="button"
                    onClick={() => {
                      setShowFDSchemeForm(false)
                      setTimeout(() => {
                        setEditingFDScheme(null)
                        resetFDSchemeForm()
                      }, 300)
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

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Import Schemes from Excel
              </h2>
              
              <div className="space-y-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
                    <strong>Instructions:</strong>
                  </p>
                  <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
                    <li>Download the export template first to see the correct format</li>
                    {activeTab === 'MF' ? (
                      <>
                        <li>Only edit the unlocked columns (Category, NAV, CC%, SI%, etc.)</li>
                        <li>Do not modify Scheme Code, AMC Code, or other locked fields</li>
                        <li>The import will update existing schemes based on Scheme Code</li>
                      </>
                    ) : (
                      <>
                        <li>Only edit the unlocked columns (Description, Payout Frequency, CC%, SI%, Bonuses, etc.)</li>
                        <li>Do not modify Issuer Key, Scheme ID, Scheme Name, or Is Cumulative fields</li>
                        <li>The import will update existing schemes based on Issuer Key and Scheme ID</li>
                      </>
                    )}
                  </ul>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Excel File
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportFileChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {importFile && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Selected: {importFile.name}
                    </p>
                  )}
                </div>

                {importResult && (
                  <div className={`p-4 rounded-lg ${
                    importResult.failed > 0 
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                      : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  }`}>
                    <p className={`text-sm font-medium ${
                      importResult.failed > 0 
                        ? 'text-yellow-800 dark:text-yellow-300'
                        : 'text-green-800 dark:text-green-300'
                    }`}>
                      Import Results:
                    </p>
                    <ul className="text-xs mt-1 space-y-1">
                      <li>Total: {importResult.total}</li>
                      <li>Updated: {importResult.updated}</li>
                      <li>Failed: {importResult.failed}</li>
                    </ul>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer">View Errors</summary>
                        <ul className="text-xs mt-1 space-y-1 max-h-32 overflow-y-auto">
                          {importResult.errors.slice(0, 10).map((err, idx) => (
                            <li key={idx} className="text-red-600 dark:text-red-400">
                              Row {err.row}: {err.error}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false)
                    setImportFile(null)
                    setImportResult(null)
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportSchemes}
                  disabled={!importFile || importing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* NCD/Bond Issuer Form Modal */}
      {showNcdBondIssuerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {editingNcdBondIssuer ? 'Edit NCD/Bond Issuer' : 'Add New NCD/Bond Issuer'}
              </h2>
              <form onSubmit={editingNcdBondIssuer ? handleUpdateNcdBondIssuer : handleCreateNcdBondIssuer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Legal Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={ncdBondIssuerFormData.legal_name}
                      onChange={(e) => setNcdBondIssuerFormData({ ...ncdBondIssuerFormData, legal_name: e.target.value })}
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
                      value={ncdBondIssuerFormData.short_name}
                      onChange={(e) => setNcdBondIssuerFormData({ ...ncdBondIssuerFormData, short_name: e.target.value })}
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
                      value={ncdBondIssuerFormData.type}
                      onChange={(e) => setNcdBondIssuerFormData({ ...ncdBondIssuerFormData, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="NCD">NCD</option>
                      <option value="Bond">Bond</option>
                      <option value="Government Bond">Government Bond</option>
                      <option value="Corporate Bond">Corporate Bond</option>
                      <option value="Infrastructure Bond">Infrastructure Bond</option>
                      <option value="Bank Bond">Bank Bond</option>
                      <option value="Housing Finance NCD">Housing Finance NCD</option>
                      <option value="NBFC NCD">NBFC NCD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Credit Rating Agency
                    </label>
                    <input
                      type="text"
                      value={ncdBondIssuerFormData.credit_rating_agency}
                      onChange={(e) => setNcdBondIssuerFormData({ ...ncdBondIssuerFormData, credit_rating_agency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., CRISIL"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Credit Rating
                  </label>
                  <input
                    type="text"
                    value={ncdBondIssuerFormData.credit_rating}
                    onChange={(e) => setNcdBondIssuerFormData({ ...ncdBondIssuerFormData, credit_rating: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., AAA"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={ncdBondIssuerFormData.is_active}
                    onChange={(e) => setNcdBondIssuerFormData({ ...ncdBondIssuerFormData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                    Is Active
                  </label>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNcdBondIssuerForm(false)
                      setEditingNcdBondIssuer(null)
                      resetNcdBondIssuerForm()
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingNcdBondIssuer ? 'Update Issuer' : 'Add Issuer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* NCD/Bond Scheme Form Modal */}
      {showNcdBondSchemeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {editingNcdBondScheme ? 'Edit NCD/Bond Scheme' : 'Add New NCD/Bond Scheme'}
              </h2>
              <form onSubmit={editingNcdBondScheme ? handleUpdateNcdBondScheme : handleCreateNcdBondScheme} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Scheme ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={ncdBondSchemeFormData.scheme_id}
                      onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, scheme_id: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., ADANI_NCD_SERIES_A"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Scheme Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={ncdBondSchemeFormData.scheme_name}
                      onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, scheme_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., Adani Enterprises NCD Series A"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ISIN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    value={ncdBondSchemeFormData.isin}
                    onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, isin: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., INE01XX07026"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Short Description
                  </label>
                  <input
                    type="text"
                    value={ncdBondSchemeFormData.description_short}
                    onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, description_short: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Brief description for display"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Coupon Rate (%) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={ncdBondSchemeFormData.coupon_rate}
                      onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, coupon_rate: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., 8.50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Face Value (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      value={ncdBondSchemeFormData.face_value}
                      onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, face_value: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., 1000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Issue Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={ncdBondSchemeFormData.issue_date}
                      onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, issue_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Maturity Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={ncdBondSchemeFormData.maturity_date}
                      onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, maturity_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Interest Payment Frequency
                    </label>
                    <select
                      value={ncdBondSchemeFormData.interest_payment_frequency}
                      onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, interest_payment_frequency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Half-Yearly">Half-Yearly</option>
                      <option value="Annual">Annual</option>
                      <option value="Cumulative">Cumulative</option>
                      <option value="At Maturity">At Maturity</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Credit Rating
                    </label>
                    <input
                      type="text"
                      value={ncdBondSchemeFormData.credit_rating}
                      onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, credit_rating: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., AAA, AA+"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Listing Status
                    </label>
                    <select
                      value={ncdBondSchemeFormData.listing_status}
                      onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, listing_status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="Listed">Listed</option>
                      <option value="Unlisted">Unlisted</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Min Investment (₹)
                    </label>
                    <input
                      type="number"
                      value={ncdBondSchemeFormData.min_investment}
                      onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, min_investment: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., 10000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Currency
                    </label>
                    <input
                      type="text"
                      value={ncdBondSchemeFormData.currency}
                      onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., INR"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Issue Size
                    </label>
                    <input
                      type="text"
                      value={ncdBondSchemeFormData.issue_size}
                      onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, issue_size: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., ₹500 Crores"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      CC %
                    </label>
                    <input
                      type="number"
                      step="0.00001"
                      value={ncdBondSchemeFormData.cc}
                      onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, cc: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., 0.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      SI %
                    </label>
                    <input
                      type="number"
                      step="0.00001"
                      value={ncdBondSchemeFormData.si}
                      onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, si: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., 0.2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={ncdBondSchemeFormData.is_variable_rate}
                      onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, is_variable_rate: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                      Variable Rate
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={ncdBondSchemeFormData.is_secured}
                      onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, is_secured: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                      Secured
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={ncdBondSchemeFormData.early_redemption_allowed}
                      onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, early_redemption_allowed: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                      Early Redemption Allowed
                    </label>
                  </div>
                  {ncdBondSchemeFormData.early_redemption_allowed && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Early Redemption Terms
                      </label>
                      <input
                        type="text"
                        value={ncdBondSchemeFormData.early_redemption_terms}
                        onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, early_redemption_terms: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., After 12 months with penalty"
                      />
                    </div>
                  )}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={ncdBondSchemeFormData.put_option_available}
                      onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, put_option_available: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                      Put Option Available
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={ncdBondSchemeFormData.call_option_available}
                      onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, call_option_available: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                      Call Option Available
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={ncdBondSchemeFormData.is_active}
                      onChange={(e) => setNcdBondSchemeFormData({ ...ncdBondSchemeFormData, is_active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                      Is Active
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNcdBondSchemeForm(false)
                      setEditingNcdBondScheme(null)
                      resetNcdBondSchemeForm()
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingNcdBondScheme ? 'Update Scheme' : 'Add Scheme'}
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

