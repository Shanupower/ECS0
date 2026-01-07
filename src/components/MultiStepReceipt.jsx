import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PrintReceipt from './PrintReceipt.jsx'
import SearchableSelect from './SearchableSelect.jsx'
import ReportIssueModal from './ReportIssueModal.jsx'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { normalizeBranchForAPI } from '../utils/branchMapping'
import { FiPlus, FiX, FiUpload, FiFile, FiTrash2, FiAlertCircle, FiHelpCircle } from 'react-icons/fi'
import { validateCustomerForm, getPattern, getTitle } from '../utils/validators'
import StepMFScheme from './receipt-steps/StepMFScheme.jsx'
import StepInvestmentType from './receipt-steps/StepInvestmentType.jsx'
import StepTransactionDetails from './receipt-steps/StepTransactionDetails.jsx'
import StepFDIssuer from './receipt-steps/StepFDIssuer.jsx'
import StepFDScheme from './receipt-steps/StepFDScheme.jsx'
import StepFDDetails from './receipt-steps/StepFDDetails.jsx'
import StepNCDBondIssuer from './receipt-steps/StepNCDBondIssuer.jsx'
import StepNCDBondScheme from './receipt-steps/StepNCDBondScheme.jsx'
import StepNCDBondDetails from './receipt-steps/StepNCDBondDetails.jsx'
import StepProductType from './receipt-steps/StepProductType.jsx'
import StepProduct from './receipt-steps/StepProduct.jsx'
import StepFinal from './receipt-steps/StepFinal.jsx'

// import investorsData from '../data/investors.json' // Removed - too large, using optimized loading instead
// import empData from '../data/empdata.json' // Removed - using backend API instead
import mfSchemes from '../data/mf_schemes.json'
import nonMfIssuers from '../data/non_mf_issuers.json'
import insuranceIssuers from '../data/insurance_issuers.json'

function genReceiptNo() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `ECS-${y}${m}${day}-${rand}`
}

// Load investors from backend API with pagination
let cachedInvestorsData = null
async function loadInvestorsFromAPI(token) {
  if (cachedInvestorsData) {
    return cachedInvestorsData
  }
  
  try {
    if (token) {
      // Fetch all customers/investors from backend API with large page size
      const customersResponse = await api.listCustomers(token, { page: 1, size: 10000 })
      const investors = Array.isArray(customersResponse) ? customersResponse : (customersResponse.items || [])
      
      // Transform API data to match expected format
      const transformedInvestors = investors.map(customer => ({
        investorId: customer.investor_id,
        investorName: customer.name || customer.investor_name || 'Unknown',
        investorAddress: `${customer.address1 || ''} ${customer.address2 || ''} ${customer.address3 || ''}`.trim() || customer.investor_address || '',
        pinCode: customer.pin || customer.pin_code || '',
        pan: customer.pan || '',
        email: customer.email || ''
      }))
      
      cachedInvestorsData = transformedInvestors
      console.log(`Loaded ${cachedInvestorsData.length} investors from API (all available customers)`)
      return cachedInvestorsData
    } else {
      console.log('No token available for loading investors')
      return []
    }
  } catch (error) {
    console.error('Failed to load investors from API:', error)
    // Return empty array if API fails
    return []
  }
}

// Load investors with pagination for better performance
async function loadInvestorsFromAPIPaginated(token, page = 1, limit = 50, userBranch = null) {
  try {
    if (token) {
      // Prepare query parameters
      const queryParams = { page: page, size: limit }
      
      // Note: Backend automatically filters by user's branch via JWT authentication
      // Non-admin users only see customers from their assigned branch
      
      // Fetch paginated customers/investors from backend API
      const customersResponse = await api.listCustomers(token, queryParams)
      
      const investors = Array.isArray(customersResponse) ? customersResponse : (customersResponse.items || [])
      const total = customersResponse.total || investors.length
      
      // Backend handles branch filtering automatically via JWT authentication
      
      // Transform API data to match expected format
      const transformedInvestors = investors.map(customer => ({
        investorId: customer.investor_id,
        investorName: customer.name || customer.investor_name || 'Unknown',
        investorAddress: `${customer.address1 || ''} ${customer.address2 || ''} ${customer.address3 || ''}`.trim() || customer.investor_address || '',
        pinCode: customer.pin || customer.pin_code || '',
        pan: customer.pan || '',
        email: customer.email || ''
      }))
      
      console.log(`Loaded ${transformedInvestors.length} investors from API (page ${page}, limit ${limit})`)
      
      return {
        results: transformedInvestors,
        total: total,
        hasMore: (page * limit) < total
      }
    } else {
      console.log('No token available for loading investors')
      return {
        results: [],
        total: 0,
        hasMore: false
      }
    }
  } catch (error) {
    console.error('Failed to load paginated investors from API:', error)
    return {
      results: [],
      total: 0,
      hasMore: false
    }
  }
}

// Search investors using API data with pagination
async function searchInvestorsFromAPI(token, query, limit = 50, page = 1, userBranch = null) {
  try {
    // Try to use the search API endpoint first for better performance
    if (query && query.length >= 2) {
      try {
        // Prepare search parameters
        const searchParams = { 
          q: query, 
          limit: limit.toString(),
          page: page.toString()
        }
        
        // Note: Backend automatically filters by user's branch via JWT authentication
        
        const searchResults = await api.searchInvestors(token, searchParams)
        
        // Handle various response structures from the search API
        let customers = []
        console.log('Search API response structure:', searchResults)
        
        // Check for nested customers array (as seen in the network response)
        if (searchResults && searchResults.customers && Array.isArray(searchResults.customers)) {
          customers = searchResults.customers
          console.log('Found customers in searchResults.customers:', customers.length)
        } 
        // Check for direct array response
        else if (searchResults && Array.isArray(searchResults)) {
          customers = searchResults
          console.log('Found customers as direct array:', customers.length)
        }
        // Check for other possible structures
        else if (searchResults && searchResults.data && Array.isArray(searchResults.data)) {
          customers = searchResults.data
          console.log('Found customers in searchResults.data:', customers.length)
        }
        // Check for results property
        else if (searchResults && searchResults.results && Array.isArray(searchResults.results)) {
          customers = searchResults.results
          console.log('Found customers in searchResults.results:', customers.length)
        }
        else {
          console.log('No customers found in response structure')
          console.log('Available properties:', Object.keys(searchResults || {}))
        }
        
        // Handle minors array from search results
        const minors = searchResults && searchResults.minors && Array.isArray(searchResults.minors) 
          ? searchResults.minors 
          : []
        
        // Transform customers to expected format
        const transformedCustomers = customers.map(customer => {
          const transformed = {
            investorId: customer.investor_id,
            investorName: customer.name,
            investorAddress: `${customer.address1 || ''} ${customer.address2 || ''} ${customer.address3 || ''}`.trim() || customer.investor_address || '',
            pinCode: customer.pin || customer.pin_code || '',
            pan: customer.pan || '',
            email: customer.email || '',
            isMinor: false,
            parentName: null,
            parentInvestorId: null
          }
          return transformed
        })
        
        // Transform minors to expected format
        const transformedMinors = minors.map(minor => {
          // Compute address - use parent's address if use_same_address is true
          let address = ''
          if (minor.use_same_address) {
            // Find parent customer to get address
            const parent = customers.find(c => c.investor_id === minor.parent_investor_id)
            if (parent) {
              address = `${parent.address1 || ''} ${parent.address2 || ''} ${parent.address3 || ''}`.trim()
            }
          } else {
            address = `${minor.address1 || ''} ${minor.address2 || ''} ${minor.address3 || ''}`.trim()
          }
          
          return {
            investorId: minor.investor_id,
            investorName: `${minor.name} (Minor - ${minor.relationship_type === 'child' ? 'Child' : 'Ward'})`,
            investorAddress: address,
            pinCode: minor.use_same_address 
              ? (customers.find(c => c.investor_id === minor.parent_investor_id)?.pin || minor.pin || '')
              : (minor.pin || ''),
            pan: minor.pan || '',
            email: '',
            isMinor: true,
            parentName: minor.parent_name || '',
            parentInvestorId: minor.parent_investor_id
          }
        })
        
        // Combine customers and minors
        const transformedResults = [...transformedCustomers, ...transformedMinors]
        
        if (transformedResults.length > 0) {
          console.log(`Search API returned ${customers.length} customers and ${minors.length} minors`)
          
          return {
            results: transformedResults,
            pagination: {
              page: page,
              limit: limit,
              total: searchResults.pagination?.total || transformedResults.length,
              hasMore: searchResults.pagination?.hasNext || false
            }
          }
        } else {
          console.log('No customers or minors found - returning empty results')
        }
      } catch (searchError) {
        console.warn('Search API failed, falling back to local search:', searchError)
      }
    }
    
    // Fallback: Load paginated investors from API
    const paginatedInvestors = await loadInvestorsFromAPIPaginated(token, page, limit, userBranch)
    
    if (!query || query.length < 2) {
      return {
        results: paginatedInvestors.results.slice(0, limit),
        pagination: {
          page: page,
          limit: limit,
          total: paginatedInvestors.total,
          hasMore: paginatedInvestors.hasMore
        }
      }
    }
    
    const searchTerm = query.toLowerCase()
    const filtered = paginatedInvestors.results.filter(inv => {
      const name = (inv.investorName || '').toLowerCase()
      const id = String(inv.investorId || '').toLowerCase()
      const pan = (inv.pan || '').toLowerCase()
      const email = (inv.email || '').toLowerCase()
      const address = (inv.investorAddress || '').toLowerCase()
      
      return name.includes(searchTerm) || 
             id.includes(searchTerm) || 
             pan.includes(searchTerm) || 
             email.includes(searchTerm) ||
             address.includes(searchTerm)
    })
    
    return {
      results: filtered.slice(0, limit),
      pagination: {
        page: page,
        limit: limit,
        total: filtered.length,
        hasMore: filtered.length === limit
      }
    }
  } catch (error) {
    console.error('Search error:', error)
    return {
      results: [],
      pagination: {
        page: 1,
        limit: limit,
        total: 0,
        hasMore: false
      }
    }
  }
}

// Validate data size to prevent truncation errors
function validateDataSize(data, maxSizeBytes = 1024 * 1024) { // 1MB default limit
  try {
    const jsonString = JSON.stringify(data)
    const sizeInBytes = new Blob([jsonString]).size
    
    if (sizeInBytes > maxSizeBytes) {
      return {
        isValid: false,
        error: `Data size (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxSizeBytes / 1024 / 1024).toFixed(2)}MB)`
      }
    }
    
    return { isValid: true, sizeInBytes }
  } catch (error) {
    return {
      isValid: false,
      error: `Failed to validate data size: ${error.message}`
    }
  }
}

// Truncate long strings to prevent database field overflow
function sanitizeReceiptData(data) {
  const sanitized = { ...data }
  
  // Define field length limits (adjust based on your database schema)
  const fieldLimits = {
    investorName: 255,
    investorAddress: 500,
    schemeName: 255,
    folioPolicyNo: 100,
    issuerCompany: 255,
    issuerCategory: 255,
    instrumentNo: 100,
    email: 255,
    pan: 20,
    pinCode: 10
  }
  
  Object.keys(fieldLimits).forEach(field => {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      const limit = fieldLimits[field]
      if (sanitized[field].length > limit) {
        console.warn(`Truncating ${field} from ${sanitized[field].length} to ${limit} characters`)
        sanitized[field] = sanitized[field].substring(0, limit)
      }
    }
  })
  
  return sanitized
}

function StepHeader({ step, productType }) {
  // Dynamic step labels with proper numbering based on product type
  const getStepLabels = () => {
    if (productType === 'MF') {
      return [
        ['Employee', 1],
        ['Investor', 2],
        ['Product Type', 3],
        ['Investment Type', 4],
        ['Details', 5],
        ['Preview', 6],
      ]
    } else {
      return [
        ['Employee', 1],
        ['Investor', 2],
        ['Product Type', 3],
        ['Details', 4], // Renumbered from 5 to 4
        ['Preview', 5], // Renumbered from 6 to 5
      ]
    }
  }

  const stepLabels = getStepLabels()
  
  // Calculate progress based on actual step position in the labels array
  const getStepProgress = () => {
    const currentStepIndex = stepLabels.findIndex(([_, stepNumber]) => stepNumber === step)
    if (currentStepIndex === -1) return 0
    return ((currentStepIndex + 1) / stepLabels.length) * 100
  }

  const pct = getStepProgress()

  return (
    <div className="stepper-wrap" style={{ margin: '4px 0 10px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, minWidth: 0 }}>
        {stepLabels.map(([label, stepNumber], i) => (
          <React.Fragment key={label}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                className={`w-7 h-7 rounded-full grid place-items-center font-bold text-xs border shadow-sm ${
                  step === stepNumber 
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-transparent' 
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Step counter removed */}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{label}</div>
            </div>
            {i < stepLabels.length - 1 && <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700 min-w-6" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

function StepEmployee({ user, onNext }) {
  // Auto-populate from user context (comes from API)
  const code = user?.emp_code || ''
  const employeeName = user?.name || ''
  const branch = user?.branch || ''
  
  // Employee data is now coming from the user context (API), so no need for static lookup
  const isValidEmployee = code && employeeName

  return (
    <div>
      <h3 className="mt-0 text-lg font-semibold text-gray-900 dark:text-gray-100">Step 1 — Employee</h3>
      <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <div className="col" style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column' }}>
          <label className="text-sm text-gray-600 dark:text-gray-400 my-2 font-semibold">Employee Code</label>
          <input
            value={code}
            readOnly
            placeholder="e.g., ECS497"
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed text-gray-900 dark:text-gray-100"
          />
          <div className="text-xs text-gray-500 dark:text-gray-400">Auto-filled from your login credentials.</div>
        </div>
      </div>

      {code && (
        <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 p-4">
          <h3 className="m-0 mb-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100">Employee Preview</h3>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Name</label>
              <div className="text-gray-900 dark:text-gray-100">{employeeName || '-'}</div>
            </div>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Branch</label>
              <div className="text-gray-900 dark:text-gray-100">{branch || '-'}</div>
            </div>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Email</label>
              <div className="text-gray-900 dark:text-gray-100">{user?.email || '-'}</div>
            </div>
          </div>
        </div>
      )}

      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => onNext({ empCode: code || '', employeeName: employeeName || '', branch: branch || '' })}
          disabled={!code}
          className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 font-bold bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

function StepInvestor({ onBack, onFound, token, user }) {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    title: '',
    name: '',
    pan: '',
    email: '',
    mobile: '',
    address1: '',
    address2: '',
    address3: '',
    city: '',
    state: '',
    pin: '',
    country: 'India',
    date_of_birth: ''
  })
  const [isCreating, setIsCreating] = useState(false)
  
  // Pincode lookup states
  const [pincodeLoading, setPincodeLoading] = useState(false)
  const [pincodeSuggestions, setPincodeSuggestions] = useState([])
  const [showPincodeDropdown, setShowPincodeDropdown] = useState(false)
  
  // Media upload states
  const [mediaFiles, setMediaFiles] = useState([])

  // Pincode lookup function
  const lookupPincode = async (pincode) => {
    if (!pincode || pincode.length < 3) {
      setPincodeSuggestions([])
      setShowPincodeDropdown(false)
      return
    }

    setPincodeLoading(true)
    try {
      // Using India Post API for pincode lookup
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
      const data = await response.json()
      
      if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice) {
        const suggestions = data[0].PostOffice.map(office => ({
          pincode: office.Pincode,
          city: office.District,
          state: office.State,
          country: 'India'
        }))
        
        // Remove duplicates based on city and state
        const uniqueSuggestions = suggestions.reduce((acc, current) => {
          const exists = acc.find(item => 
            item.city === current.city && item.state === current.state
          )
          if (!exists) {
            acc.push(current)
          }
          return acc
        }, [])
        
        setPincodeSuggestions(uniqueSuggestions)
        setShowPincodeDropdown(true)
      } else {
        setPincodeSuggestions([])
        setShowPincodeDropdown(false)
      }
    } catch (error) {
      console.error('Pincode lookup error:', error)
      setPincodeSuggestions([])
      setShowPincodeDropdown(false)
    } finally {
      setPincodeLoading(false)
    }
  }

  // Handle pincode input change
  const handlePincodeChange = (value) => {
    setNewCustomer(prev => ({ ...prev, pin: value }))
    
    if (value.length >= 3) {
      // Debounce the API call
      const timeoutId = setTimeout(() => {
        lookupPincode(value)
      }, 500)
      
      // Clear previous timeout
      return () => clearTimeout(timeoutId)
    } else {
      setPincodeSuggestions([])
      setShowPincodeDropdown(false)
    }
  }

  // Handle pincode suggestion selection
  const selectPincodeSuggestion = (suggestion) => {
    setNewCustomer(prev => ({
      ...prev,
      pin: suggestion.pincode,
      city: suggestion.city,
      state: suggestion.state,
      country: suggestion.country
    }))
    setPincodeSuggestions([])
    setShowPincodeDropdown(false)
  }

  // Media handling functions
  const handleMediaUpload = (event) => {
    const files = Array.from(event.target.files)
    const validFiles = files.filter(file => {
      const maxSize = 10 * 1024 * 1024 // 10MB
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'image/webp']
      
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`)
        return false
      }
      
      if (!allowedTypes.includes(file.type)) {
        alert(`File ${file.name} has an unsupported format. Please upload images or PDF files.`)
        return false
      }
      
      return true
    })
    
    setMediaFiles(prev => [...prev, ...validFiles])
  }

  const removeMediaFile = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
  }

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) {
      return '🖼️'
    } else if (file.type === 'application/pdf') {
      return '📄'
    }
    return '📎'
  }

  const resetCustomerForm = () => {
    setNewCustomer({
      title: '',
      name: '',
      pan: '',
      email: '',
      mobile: '',
      address1: '',
      address2: '',
      address3: '',
      city: '',
      state: '',
      pin: '',
      country: 'India',
      date_of_birth: ''
    })
    setPincodeSuggestions([])
    setShowPincodeDropdown(false)
    setMediaFiles([])
  }

  // Fetch full customer details when clicked
  const handleSelectCustomer = async (customer) => {
    setIsLoadingCustomer(true)
    try {
      // Fetch full customer details from the API
      const fullCustomerData = await api.getCustomer(token, customer.investorId)
      
      console.log('Full customer data fetched:', fullCustomerData)
      
      // Transform the full customer data to match expected format
      const transformedCustomer = {
        investorId: fullCustomerData.investor_id,
        investorName: fullCustomerData.name || fullCustomerData.investor_name || 'Unknown',
        investorAddress: `${fullCustomerData.address1 || ''} ${fullCustomerData.address2 || ''} ${fullCustomerData.address3 || ''}`.trim() || fullCustomerData.investor_address || '',
        pinCode: fullCustomerData.pin || fullCustomerData.pin_code || '',
        pan: fullCustomerData.pan || '',
        email: fullCustomerData.email || ''
      }
      
      console.log('Transformed selected customer:', transformedCustomer)
      setSelected(transformedCustomer)
    } catch (error) {
      console.error('Error fetching customer details:', error)
      // Fallback to using the search result data if API call fails
      setSelected(customer)
      alert('Could not fetch complete customer details. Using available data.')
    } finally {
      setIsLoadingCustomer(false)
    }
  }

  const handleCreateCustomer = async () => {
    // Validate form
    const validation = validateCustomerForm(newCustomer)
    if (!validation.valid) {
      alert('Please fix the following errors:\n\n' + validation.errors.join('\n'))
      return
    }
    
    setIsCreating(true)
    try {
      // Create FormData to handle file uploads
      const formDataToSend = new FormData()
      
      // Add all form fields
      Object.keys(newCustomer).forEach(key => {
        if (newCustomer[key] !== null && newCustomer[key] !== undefined && newCustomer[key] !== '') {
          formDataToSend.append(key, newCustomer[key])
        }
      })
      
      // Add media files
      mediaFiles.forEach((file, index) => {
        formDataToSend.append('media', file)
      })
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/customers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create customer')
      }
      
      const result = await response.json()
      
      // Transform the created customer to match the expected format
      const createdCustomer = {
        investorId: result.investor_id,
        investorName: newCustomer.name,
        investorAddress: `${newCustomer.address1 || ''} ${newCustomer.address2 || ''} ${newCustomer.address3 || ''}`.trim(),
        pinCode: newCustomer.pin || '',
        pan: newCustomer.pan || '',
        email: newCustomer.email || ''
      }
      
      // Select the newly created customer
      setSelected(createdCustomer)
      setShowCreateForm(false)
      resetCustomerForm()
      
      alert(`Customer created successfully! ${result.media_files > 0 ? `(${result.media_files} files uploaded)` : ''}`)
      
      // Refresh the search results to include the new customer
      if (q && q.length >= 2) {
        const searchResponse = await searchInvestorsFromAPI(token, q, 50, 1, user?.branch)
        setResults(searchResponse.results)
        setAllResults(searchResponse.results)
        setPagination(searchResponse.pagination)
      }
      
    } catch (err) {
      alert('Failed to create customer: ' + err.message)
    } finally {
      setIsCreating(false)
    }
  }

  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    hasMore: false
  })
  const [allResults, setAllResults] = useState([]) // For accumulating results

  // Use useEffect to handle async search with debouncing
  useEffect(() => {
    const performSearch = async () => {
      if (!q || q.length < 2) {
        setResults([])
        setAllResults([])
        setPagination({
          page: 1,
          limit: 50,
          total: 0,
          hasMore: false
        })
        return
      }
      
      setIsSearching(true)
      try {
        console.log(`Starting search for: "${q}"`)
        const searchResponse = await searchInvestorsFromAPI(token, q, 50, 1, user?.branch)
        console.log('Search response received:', searchResponse)
        console.log('Results count:', searchResponse.results?.length || 0)
        
        setResults(searchResponse.results)
        setAllResults(searchResponse.results)
        setPagination(searchResponse.pagination)
        
        console.log('State updated with results:', searchResponse.results?.length || 0)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
        setAllResults([])
        setPagination({
          page: 1,
          limit: 50,
          total: 0,
          hasMore: false
        })
      } finally {
        setIsSearching(false)
      }
    }

    const debounceTimer = setTimeout(performSearch, 300) // 300ms debounce
    return () => clearTimeout(debounceTimer)
  }, [q, token])

  // Load more results for pagination
  const loadMoreResults = async () => {
    if (!pagination.hasMore || isSearching) return
    
    setIsSearching(true)
    try {
      const nextPage = pagination.page + 1
      const searchResponse = await searchInvestorsFromAPI(token, q, 50, nextPage, user?.branch)
      
      setAllResults(prev => [...prev, ...searchResponse.results])
      setPagination(searchResponse.pagination)
    } catch (error) {
      console.error('Load more error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div>
      <h3 className="mt-0 text-lg font-semibold text-gray-900 dark:text-gray-100">Step 2 — Investor</h3>

      <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <div className="col" style={{ flex: '1 1 320px' }}>
          <label className="text-sm text-gray-600 dark:text-gray-400 my-2 font-semibold">
            Search Investor (ID / Name / Address / PAN / Email)
          </label>
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setSelected(null) }}
            placeholder="Type any part of ID, name, address, PAN, or email"
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Showing {allResults.length} results
            {pagination.total > 0 && ` of ${pagination.total}`}
            {pagination.hasMore && ' (scroll for more)'}
          </div>
        </div>
      </div>

      {/* Create New Customer Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center px-4 py-2 border border-blue-300 dark:border-red-600 text-sm font-semibold rounded-lg text-blue-700 dark:text-red-300 bg-blue-50 dark:bg-red-900/40 hover:bg-blue-100 dark:hover:bg-red-900/60 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:ring-offset-1 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <FiPlus className="w-4 h-4 mr-2" />
          {showCreateForm ? 'Cancel' : 'Create New Customer'}
        </button>
      </div>

      {/* Enhanced Create New Customer Form */}
      {showCreateForm && (
        <div className="mt-4 border border-blue-200 dark:border-red-700 rounded-2xl bg-blue-50 dark:bg-red-900/20 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Create New Customer</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Title</label>
                <select
                  value={newCustomer.title}
                  onChange={e => setNewCustomer(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Select Title</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Dr.">Dr.</option>
                  <option value="Prof.">Prof.</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Customer Name *</label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={e => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter customer name"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">PAN Number *</label>
                <input
                  type="text"
                  value={newCustomer.pan}
                  onChange={e => setNewCustomer(prev => ({ ...prev, pan: e.target.value.toUpperCase() }))}
                  placeholder="ABCDE1234F"
                  pattern={getPattern('pan')}
                  maxLength="10"
                  title={getTitle('pan')}
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Email *</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={e => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Mobile *</label>
                <input
                  type="tel"
                  value={newCustomer.mobile}
                  onChange={e => setNewCustomer(prev => ({ ...prev, mobile: e.target.value.replace(/\D/g, '') }))}
                  placeholder="9876543210"
                  pattern={getPattern('mobile')}
                  maxLength="10"
                  title={getTitle('mobile')}
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Date of Birth</label>
                <input
                  type="date"
                  value={newCustomer.date_of_birth}
                  onChange={e => setNewCustomer(prev => ({ ...prev, date_of_birth: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* PIN Code with lookup */}
            <div className="relative">
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">PIN Code (Enter to auto-fill location)</label>
              <input
                type="text"
                value={newCustomer.pin}
                onChange={e => handlePincodeChange(e.target.value.replace(/\D/g, ''))}
                placeholder="110001"
                pattern={getPattern('pin')}
                maxLength="6"
                title={getTitle('pin')}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:border-transparent"
              />
              
              {/* Loading indicator */}
              {pincodeLoading && (
                <div className="absolute right-3 top-8">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
              
              {/* Pincode suggestions dropdown */}
              {showPincodeDropdown && pincodeSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {pincodeSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectPincodeSuggestion(suggestion)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {suggestion.pincode}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {suggestion.city}, {suggestion.state}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {suggestion.country}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Address Line 1</label>
                <input
                  type="text"
                  value={newCustomer.address1}
                  onChange={e => setNewCustomer(prev => ({ ...prev, address1: e.target.value }))}
                  placeholder="Enter address line 1"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Address Line 2</label>
                <input
                  type="text"
                  value={newCustomer.address2}
                  onChange={e => setNewCustomer(prev => ({ ...prev, address2: e.target.value }))}
                  placeholder="Enter address line 2"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Address Line 3</label>
                <input
                  type="text"
                  value={newCustomer.address3}
                  onChange={e => setNewCustomer(prev => ({ ...prev, address3: e.target.value }))}
                  placeholder="Enter address line 3"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">City *</label>
                <input
                  type="text"
                  value={newCustomer.city}
                  onChange={e => setNewCustomer(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Enter city"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">State *</label>
                <input
                  type="text"
                  value={newCustomer.state}
                  onChange={e => setNewCustomer(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="Enter state"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Country *</label>
                <input
                  type="text"
                  value={newCustomer.country || 'India'}
                  onChange={e => setNewCustomer(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Media Upload Section */}
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Supporting Documents</label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleMediaUpload}
                  className="hidden"
                  id="media-upload-receipt"
                />
                <label
                  htmlFor="media-upload-receipt"
                  className="inline-flex items-center px-3 py-2 border border-blue-300 dark:border-blue-600 text-sm font-semibold rounded-lg text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                >
                  📎 Upload Documents
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Supported formats: JPEG, PNG, GIF, WebP, PDF (Max 10MB each)
                </p>
              </div>

              {/* Display uploaded files */}
              {mediaFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-400">
                    Uploaded Files ({mediaFiles.length})
                  </h4>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {mediaFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{getFileIcon(file)}</span>
                          <div>
                            <p className="text-xs font-medium text-gray-900 dark:text-white truncate max-w-32">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMediaFile(index)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreateCustomer}
                disabled={isCreating || !newCustomer.name.trim()}
                className="inline-flex items-center px-4 py-2 border border-green-300 dark:border-green-600 text-sm font-semibold rounded-lg text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/40 hover:bg-green-100 dark:hover:bg-green-900/60 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create Customer'}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  resetCustomerForm()
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-semibold rounded-lg text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <FiX className="w-4 h-4 mr-2" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-h-65 overflow-auto border border-gray-200 dark:border-gray-700 rounded-xl relative">
        {isLoadingCustomer && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center z-10 rounded-xl">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading customer details...</p>
            </div>
          </div>
        )}
        {isSearching ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Searching investors...</p>
          </div>
        ) : allResults.length === 0 && q && q.length >= 2 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">No investors found matching your search.</p>
          </div>
        ) : (
          <>
          <table className="w-full border-collapse text-sm min-w-160">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th className="text-left px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">ID</th>
                <th className="text-left px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">Name</th>
                <th className="text-left px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">PAN</th>
                <th className="text-left px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">Email</th>
                <th className="text-left px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">PIN</th>
              </tr>
            </thead>
            <tbody>
              {allResults.map((it, i) => {
                const isSel = selected && String(selected.investorId) === String(it.investorId)
                return (
                  <tr
                    key={`${it.investorId}-${i}`}
                    onClick={() => handleSelectCustomer(it)}
                    className={`cursor-pointer ${isSel ? 'bg-gray-100 dark:bg-gray-600' : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    <td className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">{it.investorId ?? ''}</td>
                    <td className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">{it.investorName ?? ''}</td>
                    <td className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">{it.pan ?? ''}</td>
                    <td className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">{it.email ?? ''}</td>
                    <td className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">{it.pinCode ?? ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          {/* Load More Button */}
          {pagination.hasMore && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center">
              <button
                onClick={loadMoreResults}
                disabled={isSearching}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center justify-center mx-auto"
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Loading...
                  </>
                ) : (
                  'Load More Results'
                )}
              </button>
            </div>
          )}
          </>
        )}
      </div>

      {selected && (
        <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 p-4">
          <h3 className="m-0 mb-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100">Investor Preview</h3>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold">ID</label>
              <div className="text-gray-900 dark:text-gray-100">{selected.investorId || '-'}</div>
            </div>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Name</label>
              <div className="text-gray-900 dark:text-gray-100">{selected.investorName || '-'}</div>
            </div>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold">PAN</label>
              <div className="text-gray-900 dark:text-gray-100">{selected.pan || '-'}</div>
            </div>
          </div>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Email</label>
              <div className="text-gray-900 dark:text-gray-100">{selected.email || '-'}</div>
            </div>
            <div className="col" style={{ flex: '1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold">PIN</label>
              <div className="text-gray-900 dark:text-gray-100">{selected.pinCode || '-'}</div>
            </div>
          </div>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex: '1 1 640px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Address</label>
              <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{selected.investorAddress || '-'}</div>
            </div>
          </div>
        </div>
      )}

      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onBack} className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 bg-white/85 dark:bg-gray-800/85 font-bold text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 transition-colors text-sm sm:text-base">
          Back
        </button>
        <button
          onClick={() => onFound({ investorId: selected ? selected.investorId : '', info: selected || null })}
          disabled={!selected}
          className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 font-bold bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

// StepProductType, StepProduct, and StepFinal components have been moved to separate files in receipt-steps/ folder

export default function MultiStepReceipt() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [empSeed, setEmpSeed] = useState({ empCode: '', employeeName: '', branch: '' })
  const [investorSeed, setInvestorSeed] = useState({ investorId: '', investorInfo: null })
  const [productTypeSeed, setProductTypeSeed] = useState('')
  const [mfSchemeSeed, setMfSchemeSeed] = useState(null) // Stores selectedAmc, selectedScheme, hasExistingFolio, folioNumber
  const [investmentTypeSeed, setInvestmentTypeSeed] = useState('')
  const [fdIssuerSeed, setFdIssuerSeed] = useState(null)
  const [fdSchemeSeed, setFdSchemeSeed] = useState(null)
  const [ncdBondIssuerSeed, setNcdBondIssuerSeed] = useState(null)
  const [ncdBondSchemeSeed, setNcdBondSchemeSeed] = useState(null)
  const [finalData, setFinalData] = useState(null)
  const [supportingDocument, setSupportingDocument] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [showFailurePopup, setShowFailurePopup] = useState(false)
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [stuckTimer, setStuckTimer] = useState(null)
  const [failureScreenshot, setFailureScreenshot] = useState(null)
  const [failureDetails, setFailureDetails] = useState(null)
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false)
  const [saveErrorObj, setSaveErrorObj] = useState(null)

  // Auto-populate employee data from user context
  useEffect(() => {
    if (user && !empSeed.empCode) {
      setEmpSeed({
        empCode: user.emp_code || '',
        employeeName: user.name || '',
        branch: user.branch || user.branch_name || ''
      })
    }
  }, [user])

  // Monitor for stuck users - show popup after 2 minutes on same step
  useEffect(() => {
    if (step > 1 && step < 7) {
      // Clear existing timer
      if (stuckTimer) {
        clearTimeout(stuckTimer)
      }
      
      // Set new timer for 2 minutes
      const timer = setTimeout(() => {
        setShowFailurePopup(true)
      }, 120000) // 2 minutes
      
      setStuckTimer(timer)
      
      return () => {
        clearTimeout(timer)
      }
    } else {
      // Clear timer if on first or last step
      if (stuckTimer) {
        clearTimeout(stuckTimer)
        setStuckTimer(null)
      }
      setShowFailurePopup(false)
    }
  }, [step])

  // Show failure popup when there's a save error
  useEffect(() => {
    if (saveError && typeof saveError === 'string') {
      setShowFailurePopup(true)
    }
  }, [saveError])

  // Function to capture screenshot of the current page
  const captureScreenshot = async () => {
    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default
      
      // Capture the entire document body
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        logging: false,
        scale: 0.75, // Reduce size for better performance
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight
      })
      
      // Convert canvas to blob
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            // Create a File object from blob
            const file = new File([blob], `receipt-failure-${Date.now()}.png`, { type: 'image/png' })
            resolve(file)
          } else {
            resolve(null)
          }
        }, 'image/png', 0.8)
      })
    } catch (error) {
      console.error('Failed to capture screenshot:', error)
      return null
    }
  }

  // Function to generate failure details for issue report
  const generateFailureDetails = (error, receiptData) => {
    const title = `Receipt Creation Failed - ${error.message || 'Unknown Error'}`
    
    let description = `**Receipt Creation Failure Report**\n\n`
    description += `**Error Message:** ${error.message || 'Unknown error occurred'}\n\n`
    description += `**Timestamp:** ${new Date().toISOString()}\n\n`
    description += `**User Details:**\n`
    description += `- Employee Code: ${user?.emp_code || 'N/A'}\n`
    description += `- Employee Name: ${user?.name || 'N/A'}\n`
    description += `- Branch: ${user?.branch || user?.branch_name || 'N/A'}\n\n`
    
    if (receiptData) {
      description += `**Receipt Details:**\n`
      description += `- Receipt Number: ${receiptData.receipt_no || receiptData.receiptNo || 'N/A'}\n`
      description += `- Date: ${receiptData.date || 'N/A'}\n`
      description += `- Product Type: ${receiptData.product_category || receiptData.productType || 'N/A'}\n`
      description += `- Investor ID: ${receiptData.investor_id || receiptData.investorId || 'N/A'}\n`
      description += `- Investor Name: ${receiptData.investor_name || receiptData.investorName || 'N/A'}\n`
      if (receiptData.investment_amount || receiptData.investmentAmount || receiptData.fd_deposit_amount) {
        description += `- Investment Amount: ₹${receiptData.investment_amount || receiptData.investmentAmount || receiptData.fd_deposit_amount}\n`
      }
      description += `- Current Step: ${step}\n\n`
    }
    
    description += `**Steps Taken:**\n`
    description += `1. Selected Employee: ${empSeed.employeeName || empSeed.empCode || 'N/A'}\n`
    description += `2. Selected Investor: ${investorSeed.investorInfo?.investorName || investorSeed.investorId || 'N/A'}\n`
    description += `3. Selected Product Type: ${productTypeSeed || 'N/A'}\n`
    if (productTypeSeed === 'MF') {
      description += `4. Selected MF Scheme: ${mfSchemeSeed?.selectedScheme?.scheme_name || mfSchemeSeed?.selectedScheme?.display_name || 'N/A'}\n`
      description += `5. Investment Type: ${investmentTypeSeed || 'N/A'}\n`
    } else if (productTypeSeed === 'FD') {
      description += `4. Selected FD Issuer: ${fdIssuerSeed?.issuer_name || 'N/A'}\n`
      description += `5. Selected FD Scheme: ${fdSchemeSeed?.scheme_name || 'N/A'}\n`
    }
    description += `6. Reached Final Step: Yes\n`
    description += `7. Attempted to Save: Yes\n\n`
    
    description += `**Error Details:**\n`
    if (error.stack) {
      description += `\`\`\`\n${error.stack}\n\`\`\`\n\n`
    }
    
    description += `**Browser Information:**\n`
    description += `- User Agent: ${navigator.userAgent}\n`
    description += `- Screen Resolution: ${window.screen.width}x${window.screen.height}\n`
    description += `- Viewport: ${window.innerWidth}x${window.innerHeight}\n`
    
    return { title, description }
  }

  /**
   * Build base receipt structure with common fields
   * This creates the foundation for all receipt types (MF, FD, INS, BOND)
   * All fields use snake_case to match backend expectations
   */
  const buildBase = () => {
    const base = {
      // Receipt identification
      receipt_no: genReceiptNo(),
      date: new Date().toISOString().slice(0, 10),
      
      // Employee information
      branch: empSeed.branch || '',
      employee_name: empSeed.employeeName || '',
      emp_code: empSeed.empCode || '',
      
      // Investor information
      investor_id: investorSeed.investorId || '',
      investor_name: '',
      investor_address: '',
      pin_code: '',
      pan: '',
      email: ''
    }
    
    // Populate investor info if available
    if (investorSeed.investorInfo) {
      base.investor_name = investorSeed.investorInfo.investorName || ''
      base.investor_address = investorSeed.investorInfo.investorAddress || ''
      base.pin_code = investorSeed.investorInfo.pinCode || ''
      base.pan = investorSeed.investorInfo.pan || ''
      base.email = investorSeed.investorInfo.email || ''
    }
    
    return base
  }

  /**
   * Build clean MF receipt structure
   * Consolidates all MF-specific fields into a single, non-redundant structure
   * @param {Object} transactionData - Data from StepTransactionDetails (amount, mode, SIP/SWP/STP/Switch Over details)
   * @returns {Object} Clean receipt object with all MF fields properly structured
   */
  const buildMFReceipt = (transactionData) => {
    const base = buildBase()
    
    // Determine mode from investment type
    const modeMap = {
      'Lumpsum': 'Lump Sum',
      'SIP': 'SIP',
      'SWP': 'SWP',
      'STP': 'STP',
      'Switch Over': 'Lump Sum'
    }
    
    return {
      ...base,
      // Product category
      product_category: 'MF',
      
      // AMC information
      amc_code: mfSchemeSeed.selectedAmc.amc_code,
      amc_name: mfSchemeSeed.selectedAmc.amc_name,
      
      // Scheme information
      scheme_code: mfSchemeSeed.selectedScheme.scheme_code,
      scheme_name: mfSchemeSeed.selectedScheme.display_name || mfSchemeSeed.selectedScheme.scheme_name,
      scheme_category: mfSchemeSeed.selectedScheme.category || null,
      scheme_sub_category: mfSchemeSeed.selectedScheme.sub_category || null,
      scheme_plan: mfSchemeSeed.selectedScheme.plan || null,
      scheme_option: mfSchemeSeed.selectedScheme.option || null,
      scheme_type: mfSchemeSeed.selectedScheme.type || null,
      scheme_is_nfo: mfSchemeSeed.selectedScheme.is_nfo || false,
      
      // Investment details
      investment_amount: transactionData.investment_amount || transactionData.investmentAmount || null,
      mode: transactionData.mode || modeMap[investmentTypeSeed] || 'Lump Sum',
      txn_type: transactionData.txn_type || (investmentTypeSeed === 'Switch Over' ? 'Switch Over' : investmentTypeSeed) || null,
      
      // Folio information
      has_existing_folio: mfSchemeSeed.hasExistingFolio || false,
      folio_number: mfSchemeSeed.folioNumber || null,
      folio_policy_no: mfSchemeSeed.folioNumber || null,
      
      // SIP fields (if applicable)
      ...(investmentTypeSeed === 'SIP' && {
        sip_frequency: transactionData.sip_frequency || null,
        sip_start_date: transactionData.sip_start_date || null,
        sip_end_date: transactionData.sip_end_date || null,
        sip_is_perpetual: transactionData.sip_is_perpetual || false
      }),
      
      // SWP fields (if applicable)
      ...(investmentTypeSeed === 'SWP' && {
        swp_frequency: transactionData.swp_frequency || null,
        swp_start_date: transactionData.swp_start_date || null,
        swp_amount: transactionData.swp_amount || null
      }),
      
      // STP fields (if applicable)
      ...(investmentTypeSeed === 'STP' && {
        stp_target_scheme_code: transactionData.stp_target_scheme_code || null,
        stp_target_scheme_name: transactionData.stp_target_scheme_name || null,
        stp_frequency: transactionData.stp_frequency || null,
        stp_start_date: transactionData.stp_start_date || null,
        stp_amount: transactionData.stp_amount || null,
        stp_original_amount: transactionData.stp_original_amount || null
      }),
      
      // Switch Over fields (if applicable)
      ...(investmentTypeSeed === 'Switch Over' && {
        switch_from_scheme_code: transactionData.switch_from_scheme_code || null,
        switch_from_scheme_name: transactionData.switch_from_scheme_name || null,
        switch_to_scheme_code: transactionData.switch_to_scheme_code || null,
        switch_to_scheme_name: transactionData.switch_to_scheme_name || null,
        switch_type: transactionData.switch_type || null,
        switch_value: transactionData.switch_value || null
      })
    }
  }

  /**
   * Build clean FD receipt structure
   * Consolidates all FD-specific fields into a single, non-redundant structure
   * @param {Object} fdData - Data from StepFDDetails (deposit amount, tenure, rates, etc.)
   * @returns {Object} Clean receipt object with all FD fields properly structured
   */
  const buildFDReceipt = (fdData) => {
    const base = buildBase()
    
    // Calculate deposit_period_ym from tenure_months if not provided
    const depositPeriodYM = fdData.deposit_period_ym || (fdData.fd_tenure_months 
      ? `${Math.floor(fdData.fd_tenure_months / 12)}Y ${fdData.fd_tenure_months % 12}M`
      : null)
    
    return {
      ...base,
      // Product category
      product_category: 'FD',
      
      // FD Issuer information (from fdData, which includes issuer info from StepFDDetails)
      fd_issuer_key: fdData.fd_issuer_key || null,
      fd_issuer_name: fdData.fd_issuer_name || null,
      fd_issuer_type: fdData.fd_issuer_type || null,
      issuer_company: fdData.fd_issuer_name || null,
      issuer_category: 'Fixed Deposit',
      
      // FD Scheme information (from fdData)
      fd_scheme_id: fdData.fd_scheme_id || null,
      fd_scheme_name: fdData.fd_scheme_name || null,
      scheme_name: fdData.fd_scheme_name || null,
      fd_is_cumulative: fdData.fd_is_cumulative || false,
      
      // FD Transaction details
      fd_transaction_type: fdData.fd_transaction_type || 'Fresh',
      txn_type: fdData.fd_transaction_type || 'Fresh',
      fd_renewal_investment_type: fdData.fd_renewal_investment_type || null,
      fd_renewal_additional_amount: fdData.fd_renewal_additional_amount || null,
      
      // FD Deposit details
      fd_deposit_amount: fdData.fd_deposit_amount || null,
      investment_amount: fdData.fd_deposit_amount || null,
      fd_tenure_months: fdData.fd_tenure_months || null,
      deposit_period_ym: depositPeriodYM,
      fd_booking_date: fdData.fd_booking_date || null,
      fd_deposit_date: fdData.fd_booking_date || fdData.fd_deposit_date || null,
      
      // FD Rate and interest details
      fd_payout_frequency: fdData.fd_payout_frequency || null,
      interest_frequency: fdData.fd_payout_frequency || null,
      fd_base_rate_pa: fdData.fd_base_rate_pa || null,
      fd_locked_interest_rate_pa: fdData.fd_locked_interest_rate_pa || null,
      fd_effective_yield_pa: fdData.fd_effective_yield_pa || null,
      fd_senior_citizen_bonus: fdData.fd_senior_citizen_bonus || null,
      fd_women_bonus: fdData.fd_women_bonus || null,
      fd_renewal_bonus: fdData.fd_renewal_bonus || null,
      fd_total_rate_pa: fdData.fd_total_rate_pa || null,
      roi_percent: fdData.fd_total_rate_pa || null,
      
      // FD Maturity and payout details
      fd_maturity_amount: fdData.fd_maturity_amount || null,
      maturity_amount: fdData.fd_maturity_amount || null,
      fd_maturity_date: fdData.fd_maturity_date || null,
      fd_periodic_payout: fdData.fd_periodic_payout || null,
      fd_total_interest: fdData.fd_total_interest || null,
      
      // FD Application details
      fd_application_number: fdData.fd_application_number || null,
      folio_policy_no: fdData.fd_application_number || null,
      
      // FD Tax details
      fd_tds_applicable: fdData.fd_tds_applicable || null,
      fd_form_15g_15h: fdData.fd_form_15g_15h || null
    }
  }

  /**
   * Build clean NCD/Bond receipt structure
   * @param {Object} bondData - Data from StepNCDBondDetails
   * @returns {Object} Clean receipt object with all NCD/Bond fields properly structured
   */
  const buildNCDBondReceipt = (bondData) => {
    const base = buildBase()
    
    return {
      ...base,
      // Product category
      product_category: 'BOND',
      
      // NCD/Bond Issuer information
      bond_issuer_key: bondData.bond_issuer_key || null,
      bond_issuer_name: bondData.bond_issuer_name || null,
      bond_issuer_type: bondData.bond_issuer_type || null,
      issuer_company: bondData.bond_issuer_name || null,
      issuer_category: bondData.bond_issuer_type || 'Bonds',
      
      // NCD/Bond Scheme information
      bond_scheme_id: bondData.bond_scheme_id || null,
      bond_scheme_name: bondData.bond_scheme_name || null,
      scheme_name: bondData.bond_scheme_name || null,
      bond_isin: bondData.bond_isin || null,
      bond_coupon_rate: bondData.bond_coupon_rate || null,
      bond_face_value: bondData.bond_face_value || null,
      bond_issue_date: bondData.bond_issue_date || null,
      bond_maturity_date: bondData.bond_maturity_date || null,
      renewal_due_date: bondData.bond_maturity_date || null,
      
      // NCD/Bond Transaction details
      bond_transaction_type: bondData.bond_transaction_type || null,
      txn_type: bondData.bond_transaction_type || null,
      bond_number_of_units: bondData.bond_number_of_units || null,
      bond_investment_amount: bondData.bond_investment_amount || null,
      investment_amount: bondData.bond_investment_amount || null,
      bond_transaction_date: bondData.bond_transaction_date || null,
      
      // NCD/Bond Application details
      bond_application_number: bondData.bond_application_number || null,
      folio_policy_no: bondData.bond_application_number || null,
      
      // NCD/Bond Tax details
      bond_form_15g_15h: bondData.bond_form_15g_15h || null,
      
      // ROI from coupon rate
      roi_percent: bondData.bond_coupon_rate || null
      
      // Note: NCD/Bonds do NOT have a 'mode' field (unlike MF)
    }
  }

  const saveToServer = async () => {
    if (!token) {
      setSaveError('Not authenticated')
      return
    }
    
    if (!finalData) {
      setSaveError('No data to save')
      return
    }
    
    setIsSaving(true)
    setSaveError('')
    
    try {
      // Validate and sanitize data before sending
      const validation = validateDataSize(finalData)
      if (!validation.isValid) {
        setSaveError(`Data validation failed: ${validation.error}`)
        return
      }
      
      // Sanitize data to prevent field truncation
      const sanitizedData = sanitizeReceiptData(finalData)
      
      console.log(`Sending data size: ${(validation.sizeInBytes / 1024).toFixed(2)}KB`)
      
      // Use branch-specific receipt creation only for branch users, not regular employees
      let result
      const files = supportingDocument ? [supportingDocument] : []
      
      if (user?.role === 'branch' && user?.branch_code) {
        // Branch users can use branch-specific endpoint
        result = await api.createBranchReceipt(token, user.branch_code, sanitizedData, files)
      } else {
        // All other users (employees, admins) use regular receipt creation
        result = await api.createReceipt(token, sanitizedData, files)
      }
      
      // Show success message and store in localStorage for toast
      const receiptId = result.id || result.receiptNo || result.receipt_id || 'Unknown'
      const successMessage = `Receipt saved successfully! Receipt ID: ${receiptId}`
      
      // Store success message in localStorage for toast notification
      localStorage.setItem('receipt_success_message', successMessage)
      localStorage.setItem('receipt_success_timestamp', Date.now().toString())
      localStorage.setItem('receipt_force_refresh', 'true')
      
      // Reset form after successful save
      setStep(1)
      setEmpSeed({ empCode: '', employeeName: '', branch: '' })
      setInvestorSeed({ investorId: '', investorInfo: null })
      setProductTypeSeed('')
      setInvestmentTypeSeed('')
      setFinalData(null)
      setSupportingDocument(null)
      setSaveError('')
      setSaveErrorObj(null)
      setFailureScreenshot(null)
      setFailureDetails(null)
      
      // Navigate to transactions page immediately
      navigate('/transactions')
    } catch (err) {
      console.error('Save error:', err)
      
      // Store error object for later use (only capture screenshot if user wants to report)
      setSaveErrorObj(err)
      
      // Set user-friendly error message
      let userFriendlyError = ''
      if (err.message && err.message.includes('WARN_DATA_TRUNCATED')) {
        userFriendlyError = 'Data was too large and was truncated. Please reduce the amount of data or contact support.'
      } else if (err.message && err.message.includes('save_failed')) {
        userFriendlyError = 'Failed to save receipt. The data may be too large or contain invalid characters.'
      } else {
        userFriendlyError = err.message || 'Failed to save receipt'
      }
      setSaveError(userFriendlyError)
      
      // Store error message in localStorage for toast notification
      const errorMessage = err.message || 'Failed to save receipt'
      localStorage.setItem('receipt_error_message', errorMessage)
      localStorage.setItem('receipt_error_timestamp', Date.now().toString())
      localStorage.setItem('receipt_force_refresh', 'true')
      
      // Show error message to user
      setSaveSuccess('')
      
      // Show failure popup instead of navigating immediately
      setShowFailurePopup(true)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
      {/* Failure Popup */}
      {showFailurePopup && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  saveError 
                    ? 'bg-red-100 dark:bg-red-900/30' 
                    : 'bg-blue-100 dark:bg-blue-900/30'
                }`}>
                  <FiAlertCircle className={`w-5 h-5 ${
                    saveError 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-blue-600 dark:text-blue-400'
                  }`} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  {saveError ? 'Receipt Creation Failed' : 'Feeling Stuck?'}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  {saveError 
                    ? 'We encountered an issue while creating your receipt. Would you like to report this problem?'
                    : 'It looks like you\'ve been on this step for a while. Are you having trouble understanding what to do next or unable to proceed? We\'re here to help!'}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={async () => {
                      // Only capture screenshot and generate details if user wants to report
                      setIsCapturingScreenshot(true)
                      
                      try {
                        // Capture screenshot
                        const screenshot = await captureScreenshot()
                        setFailureScreenshot(screenshot)
                        
                        // Generate failure details
                        if (saveErrorObj) {
                          // For actual save errors
                          const failureInfo = generateFailureDetails(saveErrorObj, finalData)
                          setFailureDetails(failureInfo)
                        } else {
                          // For stuck users
                          const failureInfo = {
                            title: `Stuck on Receipt Creation - Step ${step}`,
                            description: `**User Stuck on Receipt Creation**\n\n` +
                              `**Issue:** User has been on step ${step} for more than 2 minutes\n\n` +
                              `**User Details:**\n` +
                              `- Employee Code: ${user?.emp_code || 'N/A'}\n` +
                              `- Employee Name: ${user?.name || 'N/A'}\n` +
                              `- Branch: ${user?.branch || user?.branch_name || 'N/A'}\n\n` +
                              `**Current Progress:**\n` +
                              `- Current Step: ${step}\n` +
                              `- Product Type: ${productTypeSeed || 'Not selected'}\n` +
                              `- Investor Selected: ${investorSeed.investorId ? 'Yes' : 'No'}\n\n` +
                              `**Browser Information:**\n` +
                              `- User Agent: ${navigator.userAgent}\n` +
                              `- Screen Resolution: ${window.screen.width}x${window.screen.height}\n` +
                              `- Viewport: ${window.innerWidth}x${window.innerHeight}\n`
                          }
                          setFailureDetails(failureInfo)
                        }
                      } catch (error) {
                        console.error('Failed to capture screenshot:', error)
                        // Still show modal even if screenshot fails
                      } finally {
                        setIsCapturingScreenshot(false)
                        setShowIssueModal(true)
                        setShowFailurePopup(false)
                      }
                    }}
                    disabled={isCapturingScreenshot}
                    className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center space-x-1 disabled:cursor-not-allowed"
                  >
                    {isCapturingScreenshot ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                        <span>Preparing...</span>
                      </>
                    ) : (
                      <>
                        <FiHelpCircle size={14} />
                        <span>Report Issue</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowFailurePopup(false)
                      if (saveError) {
                        // Navigate to transactions on dismiss if there was an error
                        navigate('/transactions')
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowFailurePopup(false)
                  if (saveError) {
                    navigate('/transactions')
                  }
                }}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <FiX size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Issue Modal */}
      <ReportIssueModal 
        isOpen={showIssueModal} 
        onClose={() => {
          setShowIssueModal(false)
          // Reset failure data after closing
          setFailureScreenshot(null)
          setFailureDetails(null)
          setSaveErrorObj(null)
        }}
        initialData={failureDetails ? {
          title: failureDetails.title,
          description: failureDetails.description,
          priority: 'high',
          screenshot: failureScreenshot
        } : null}
      />

      {step === 1 && (
        <StepEmployee
          user={user}
          onNext={e => { setEmpSeed(e); setStep(2) }}
        />
      )}

      {step === 2 && (
        <StepInvestor
          onBack={() => setStep(1)}
          onFound={r => { setInvestorSeed({ investorId: r.investorId, investorInfo: r.info }); setStep(3) }}
          token={token}
          user={user}
        />
      )}

      {step === 3 && (
        <StepProductType
          onBack={() => setStep(2)}
          onNext={type => { 
            setProductTypeSeed(type)
            // MF, FD, BOND, and INS go through special flows
            if (type === 'MF') {
              setStep(4)
            } else if (type === 'FD') {
              setStep(4) // FD also starts at step 4 (FD Issuer selection)
            } else if (type === 'BOND') {
              setStep(4) // BOND also starts at step 4 (NCD/Bond Issuer selection)
            } else if (type === 'INS') {
              setStep(4) // INS also starts at step 4 (Insurance Product selection)
            } else {
              setStep(999) // Skip to old flow for other types
            }
          }}
        />
      )}

      {/* FD Flow */}
      {step === 4 && productTypeSeed === 'FD' && (
        <StepFDIssuer
          onBack={() => setStep(3)}
          onNext={(issuer) => {
            setFdIssuerSeed(issuer)
            setStep(5)
          }}
          token={token}
        />
      )}

      {step === 5 && productTypeSeed === 'FD' && fdIssuerSeed && (
        <StepFDScheme
          onBack={() => setStep(4)}
          onNext={(scheme) => {
            setFdSchemeSeed(scheme)
            setStep(6)
          }}
          token={token}
          issuer={fdIssuerSeed}
        />
      )}

      {step === 6 && productTypeSeed === 'FD' && fdSchemeSeed && (
        <StepFDDetails
          onBack={() => setStep(5)}
          onNext={(fdData) => {
            const cleanReceipt = buildFDReceipt(fdData)
            setFinalData(cleanReceipt)
            setStep(7)
          }}
          token={token}
          issuer={fdIssuerSeed}
          scheme={fdSchemeSeed}
        />
      )}

      {/* NCD/Bond Flow */}
      {step === 4 && productTypeSeed === 'BOND' && (
        <StepNCDBondIssuer
          onBack={() => setStep(3)}
          onNext={(issuer) => {
            setNcdBondIssuerSeed(issuer)
            setStep(5)
          }}
          token={token}
        />
      )}

      {step === 5 && productTypeSeed === 'BOND' && ncdBondIssuerSeed && (
        <StepNCDBondScheme
          onBack={() => setStep(4)}
          onNext={(scheme) => {
            setNcdBondSchemeSeed(scheme)
            setStep(6)
          }}
          token={token}
          issuer={ncdBondIssuerSeed}
        />
      )}

      {step === 6 && productTypeSeed === 'BOND' && ncdBondSchemeSeed && (
        <StepNCDBondDetails
          onBack={() => setStep(5)}
          onNext={(bondData) => {
            const cleanReceipt = buildNCDBondReceipt(bondData)
            setFinalData(cleanReceipt)
            setStep(7)
          }}
          token={token}
          issuer={ncdBondIssuerSeed}
          scheme={ncdBondSchemeSeed}
        />
      )}

      {/* Insurance Flow */}
      {step === 4 && productTypeSeed === 'INS' && (
        <StepProduct
          onBack={() => setStep(3)}
          onNext={(_, normalized) => {
            const base = buildBase()
            const merged = {
              ...base,
              ...normalized,
              product_category: 'INS'
            }
            setFinalData(merged)
            setStep(5) // Next: StepFinal (Transaction Details)
          }}
          investmentType="Lumpsum"
          productType="INS"
          token={token}
        />
      )}

      {step === 5 && productTypeSeed === 'INS' && finalData && (
        <StepFinal
          data={finalData}
          onBack={() => setStep(4)}
          onSave={saveToServer}
          isSaving={isSaving}
          saveError={saveError}
          saveSuccess={saveSuccess}
          supportingDocument={supportingDocument}
          setSupportingDocument={setSupportingDocument}
        />
      )}

      {step === 4 && productTypeSeed === 'MF' && (
        <StepMFScheme
          onBack={() => setStep(3)}
          onNext={mfData => { 
            setMfSchemeSeed(mfData)
            setStep(5) // Next: Investment Type selection
          }}
          token={token}
        />
      )}

      {step === 5 && productTypeSeed === 'MF' && mfSchemeSeed && (
        <StepInvestmentType
          onBack={() => setStep(4)}
          onNext={type => { 
            setInvestmentTypeSeed(type)
            setStep(6) // Next: Transaction-specific details
          }}
          productType={productTypeSeed}
          hasExistingFolio={mfSchemeSeed.hasExistingFolio}
        />
      )}

      {step === 6 && productTypeSeed === 'MF' && mfSchemeSeed && investmentTypeSeed && (
        <StepTransactionDetails
          onBack={() => setStep(5)}
          onNext={transactionData => {
            // Build clean MF receipt structure
            const cleanReceipt = buildMFReceipt(transactionData)
            setFinalData(cleanReceipt)
            setStep(7)
          }}
          investmentType={investmentTypeSeed}
          selectedScheme={mfSchemeSeed.selectedScheme}
          selectedAmc={mfSchemeSeed.selectedAmc}
          token={token}
        />
      )}

      {step === 5 && productTypeSeed !== 'MF' && productTypeSeed !== 'FD' && productTypeSeed !== 'BOND' && productTypeSeed !== 'INS' && (
        <StepProduct
          onBack={() => setStep(3)}
          onNext={(_, normalized) => {
            const base = buildBase()
            const merged = {
              ...base,
              ...normalized,
              product_category: productTypeSeed || normalized.product_category || null
            }
            setFinalData(merged)
            setStep(6)
          }}
          investmentType={investmentTypeSeed}
          productType={productTypeSeed}
          token={token}
        />
      )}

      {step === 7 && finalData && (
        <StepFinal 
          data={finalData} 
          onBack={() => setStep(5)} 
          onSave={saveToServer}
          isSaving={isSaving}
          saveError={saveError}
          saveSuccess={saveSuccess}
          supportingDocument={supportingDocument}
          setSupportingDocument={setSupportingDocument}
        />
      )}
    </div>
  )
}