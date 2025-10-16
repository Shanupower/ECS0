import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PrintReceipt from './PrintReceipt.jsx'
import SearchableSelect from './SearchableSelect.jsx'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { normalizeBranchForAPI } from '../utils/branchMapping'
import { FiPlus, FiX, FiUpload, FiFile, FiTrash2 } from 'react-icons/fi'

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
      
      // Backend filtering by relationship_manager is not implemented
      // Using frontend filtering as the primary solution
      // if (userBranch) {
      //   const normalizedBranch = normalizeBranchForAPI(userBranch)
      //   queryParams.relationship_manager = normalizedBranch
      // }
      
      // Fetch paginated customers/investors from backend API
      const customersResponse = await api.listCustomers(token, queryParams)
      
      const investors = Array.isArray(customersResponse) ? customersResponse : (customersResponse.items || [])
      const total = customersResponse.total || investors.length
      
      // Branch filtering disabled to show all customers (like Customer Management)
      let filteredInvestors = investors
      
      // Optional: Enable branch filtering if needed in the future
      // if (userBranch) {
      //   const normalizedBranch = normalizeBranchForAPI(userBranch)
      //   filteredInvestors = investors.filter(customer => {
      //     const customerRM = customer.relationship_manager
      //     if (!customerRM) return false
      //     
      //     // Normalize customer RM for comparison
      //     const normalizedCustomerRM = normalizeBranchForAPI(customerRM)
      //     
      //     // Check for exact match or partial match
      //     return customerRM === normalizedBranch || 
      //            normalizedCustomerRM === normalizedBranch ||
      //            customerRM.includes(normalizedBranch) ||
      //            normalizedBranch.includes(customerRM)
      //   })
      // }
      
      // Transform API data to match expected format
      const transformedInvestors = filteredInvestors.map(customer => ({
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
        
        // Backend filtering by relationship_manager is not implemented
        // Using frontend filtering as the primary solution
        // if (userBranch) {
        //   const normalizedBranch = normalizeBranchForAPI(userBranch)
        //   searchParams.relationship_manager = normalizedBranch
        // }
        
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
        
        if (customers.length > 0) {
          console.log(`Search API returned ${customers.length} customers`)
          console.log('First customer:', customers[0])
          
          // Branch filtering disabled to show all customers (like Customer Management)
          // Users can search for any customer across all branches
          let filteredResults = customers
          
          // Transform customers to expected format
          const transformedResults = filteredResults.map(customer => {
            const transformed = {
              investorId: customer.investor_id,
              investorName: customer.name,
              investorAddress: `${customer.address1 || ''} ${customer.address2 || ''} ${customer.address3 || ''}`.trim() || customer.investor_address || '',
              pinCode: customer.pin || customer.pin_code || '',
              pan: customer.pan || '',
              email: customer.email || ''
            }
            console.log('Transformed customer:', transformed)
            return transformed
          })
          
          console.log(`Returning ${transformedResults.length} transformed results`)
          
          return {
            results: transformedResults,
            pagination: {
              page: page,
              limit: limit,
              total: searchResults.pagination?.total || filteredResults.length,
              hasMore: searchResults.pagination?.hasNext || false
            }
          }
        } else {
          console.log('No customers found - returning empty results')
        }
      } catch (searchError) {
        console.warn('Search API failed, falling back to local search:', searchError)
      }
    }
    
    // Fallback: Load paginated investors from API and search locally
    const paginatedInvestors = await loadInvestorsFromAPIPaginated(token, page, limit, userBranch)
    
    // Get local customers from localStorage as fallback
    const localCustomers = JSON.parse(localStorage.getItem('local_customers') || '[]')
    const allData = [...paginatedInvestors.results, ...localCustomers]
    
    if (!query || query.length < 2) {
      return {
        results: allData.slice(0, limit),
        pagination: {
          page: page,
          limit: limit,
          total: paginatedInvestors.total,
          hasMore: paginatedInvestors.hasMore
        }
      }
    }
    
    const searchTerm = query.toLowerCase()
    const filtered = allData.filter(inv => {
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
    if (!newCustomer.name.trim()) {
      alert('Customer name is required')
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
                  onChange={e => setNewCustomer(prev => ({ ...prev, pan: e.target.value }))}
                  placeholder="Enter PAN number"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Email *</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={e => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
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
                  onChange={e => setNewCustomer(prev => ({ ...prev, mobile: e.target.value }))}
                  placeholder="Enter mobile number"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Date of Birth *</label>
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
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">PIN Code * (Enter to auto-fill location)</label>
              <input
                type="text"
                value={newCustomer.pin}
                onChange={e => handlePincodeChange(e.target.value)}
                placeholder="Enter PIN code to auto-fill location"
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
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Address Line 1 *</label>
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

function StepProductType({ onBack, onNext }) {
  const [productType, setProductType] = useState('')

  const productTypes = [
    { 
      value: 'MF', 
      label: 'Mutual Funds', 
      icon: '📈',
      description: 'Invest in diversified portfolios managed by professionals'
    },
    { 
      value: 'INS', 
      label: 'Insurance', 
      icon: '🛡️',
      description: 'Protect your future with life and health insurance'
    },
    { 
      value: 'FD', 
      label: 'Fixed Deposit', 
      icon: '🏦',
      description: 'Secure fixed returns with guaranteed interest rates'
    },
    { 
      value: 'BOND', 
      label: 'Bonds', 
      icon: '📊',
      description: 'Government and corporate bonds for stable returns'
    }
  ]

  return (
    <div>
      <h3 className="mt-0 text-lg font-semibold text-gray-900 dark:text-gray-100">Step 3 — Select Product Type</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Choose the type of financial product you want to invest in</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {productTypes.map(type => (
          <button
            key={type.value}
            type="button"
            onClick={() => setProductType(type.value)}
            className={`p-6 rounded-2xl border-2 transition-all duration-200 hover:shadow-lg ${
              productType === type.value 
                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-md' 
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="text-center">
              <div className="text-4xl mb-3">{type.icon}</div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{type.label}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{type.description}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onBack} className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 bg-white/85 dark:bg-gray-800/85 font-bold text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 transition-colors text-sm sm:text-base">
          Back
        </button>
        <button
          onClick={() => onNext(productType)}
          disabled={!productType}
          className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 font-bold bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

function StepInvestmentType({ onBack, onNext, productType }) {
  const [investmentType, setInvestmentType] = useState('')

  const investmentTypes = [
    { 
      value: 'Lumpsum', 
      label: 'Lumpsum', 
      icon: '💰',
      description: 'One-time investment with immediate allocation'
    },
    { 
      value: 'SIP', 
      label: 'SIP (Systematic Investment Plan)', 
      icon: '📅',
      description: 'Regular monthly investments for long-term wealth building'
    },
    { 
      value: 'SWP', 
      label: 'SWP (Systematic Withdrawal Plan)', 
      icon: '💸',
      description: 'Regular withdrawals from existing investments'
    },
    { 
      value: 'STP', 
      label: 'STP (Systematic Transfer Plan)', 
      icon: '🔄',
      description: 'Transfer funds between different schemes systematically'
    },
    { 
      value: 'NFO', 
      label: 'NFO (New Fund Offer)', 
      icon: '🆕',
      description: 'Invest in newly launched mutual fund schemes'
    },
    { 
      value: 'Additional Purchase', 
      label: 'Additional Purchase', 
      icon: '➕',
      description: 'Add more units to your existing investment'
    },
    { 
      value: 'Switch Over', 
      label: 'Switch Over', 
      icon: '🔄',
      description: 'Move from one scheme to another within the same AMC'
    }
  ]

  return (
    <div>
      <h3 className="mt-0 text-lg font-semibold text-gray-900 dark:text-gray-100">Step 4 — Select Investment Type</h3>
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Product Type:</strong> {productType === 'MF' ? 'Mutual Funds' : productType === 'INS' ? 'Insurance' : productType === 'FD' ? 'Fixed Deposit' : 'Bonds'}
        </p>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Choose how you want to invest in this product</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {investmentTypes.map(type => (
          <button
            key={type.value}
            type="button"
            onClick={() => setInvestmentType(type.value)}
            className={`p-4 rounded-2xl border-2 transition-all duration-200 hover:shadow-lg ${
              investmentType === type.value 
                ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20 shadow-md' 
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="text-center">
              <div className="text-3xl mb-2">{type.icon}</div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">{type.label}</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">{type.description}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onBack} className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 bg-white/85 dark:bg-gray-800/85 font-bold text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 transition-colors text-sm sm:text-base">
          Back
        </button>
        <button
          onClick={() => onNext(investmentType)}
          disabled={!investmentType}
          className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 font-bold bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

function StepProduct({ onBack, onNext, investmentType, productType }) {
  const [product, setProduct] = useState(productType)
  
  // MF states
  const [mfIssuer, setMfIssuer] = useState('')
  const [mfScheme, setMfScheme] = useState('')
  const [mfInvestmentAmount, setMfInvestmentAmount] = useState('')
  const [mfFolioPolicyNo, setMfFolioPolicyNo] = useState('')
  const [mfSchemeOption, setMfSchemeOption] = useState('Growth')
  const [mfPeriod, setMfPeriod] = useState('')
  const [mfOldIssuer, setMfOldIssuer] = useState('')
  const [mfOldScheme, setMfOldScheme] = useState('')
  
  // FD states
  const [fdIssuer, setFdIssuer] = useState('')
  const [fdScheme, setFdScheme] = useState('')
  const [fdInvestmentAmount, setFdInvestmentAmount] = useState('')
  const [fdApplicationNo, setFdApplicationNo] = useState('')
  const [fdClientType, setFdClientType] = useState('Individual')
  const [fdDepositPeriod, setFdDepositPeriod] = useState('')
  const [fdRoi, setFdRoi] = useState('')
  
  // Insurance states
  const [insIssuer, setInsIssuer] = useState('')
  const [insCategory, setInsCategory] = useState('')
  const [insProduct, setInsProduct] = useState('')
  const [insPremiumAmount, setInsPremiumAmount] = useState('')
  const [insPolicyNo, setInsPolicyNo] = useState('')
  
  // Bond states
  const [bondIssuer, setBondIssuer] = useState('')
  const [bondScheme, setBondScheme] = useState('')
  const [bondInvestmentAmount, setBondInvestmentAmount] = useState('')
  const [bondApplicationNo, setBondApplicationNo] = useState('')

  const mfIssuerOptions = useMemo(() => mfSchemes.map(a => ({ label: a.company, value: a.company })), [])
  const mfSchemeOptions = useMemo(() => {
    const f = mfSchemes.find(a => a.company === mfIssuer)
    return f ? f.schemes.map(s => ({ label: s, value: s })) : []
  }, [mfIssuer])

  const mfOldSchemeOptions = useMemo(() => {
    const f = mfSchemes.find(a => a.company === mfOldIssuer)
    return f ? f.schemes.map(s => ({ label: s, value: s })) : []
  }, [mfOldIssuer])
  
  const nonMfIssuerOptions = useMemo(() => nonMfIssuers.map(x => ({ label: x.company, value: x.company })), [])
  const fdSchemeOptions = useMemo(() => {
    const f = nonMfIssuers.find(x => x.company === fdIssuer)
    return f ? f.schemes.map(s => ({ label: s, value: s })) : []
  }, [fdIssuer])
  
  const bondSchemeOptions = useMemo(() => {
    const f = nonMfIssuers.find(x => x.company === bondIssuer)
    return f ? f.schemes.map(s => ({ label: s, value: s })) : []
  }, [bondIssuer])
  
  const insIssuerOptions = useMemo(() => insuranceIssuers.map(x => ({ label: x.company, value: x.company })), [])
  const insCategoryOptions = useMemo(() => {
    const f = insuranceIssuers.find(x => x.company === insIssuer)
    return f ? f.subsections.map(s => ({ label: s.name, value: s.name })) : []
  }, [insIssuer])
  const insProductOptions = useMemo(() => {
    const f = insuranceIssuers.find(x => x.company === insIssuer)
    const sub = f?.subsections?.find(s => s.name === insCategory)
    return sub ? sub.products.map(p => ({ label: p, value: p })) : []
  }, [insIssuer, insCategory])

  const tile = (val, label) => (
    <button
      type="button"
      onClick={() => setProduct(val)}
      className={`appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 font-bold cursor-pointer transition-colors ${
        product === val 
          ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100' 
          : 'bg-white/85 dark:bg-gray-800/85 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
      }`}
    >{label}</button>
  )

  return (
    <div>
      <h3 className="mt-0 text-lg font-semibold text-gray-900 dark:text-gray-100">Step 5 — Fill Product Details</h3>
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Product Type:</strong> {productType === 'MF' ? 'Mutual Funds' : productType === 'INS' ? 'Insurance' : productType === 'FD' ? 'Fixed Deposit' : 'Bonds'} | <strong>Investment Type:</strong> {investmentType}
        </p>
      </div>

      {product === 'MF' && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 p-4">
          <h3 className="m-0 mb-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100">Mutual Fund</h3>
          
          {/* Common fields for all investment types */}
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Issuer Company (AMC)</label>
              <SearchableSelect
                options={mfIssuerOptions}
                value={mfIssuer}
                onChange={(v)=>{ setMfIssuer(v); setMfScheme('') }}
                placeholder="Select AMC"
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Issuer Scheme</label>
              <SearchableSelect
                options={mfSchemeOptions}
                value={mfScheme}
                onChange={setMfScheme}
                placeholder="Select scheme"
                disabled={!mfIssuer}
              />
            </div>
          </div>

          {/* Switch Over - Special case with old and new scheme */}
          {investmentType === 'Switch Over' && (
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Switch-out Scheme (AMC)</label>
                <SearchableSelect
                  options={mfIssuerOptions}
                  value={mfOldIssuer}
                  onChange={(v)=>{ setMfOldIssuer(v); setMfOldScheme('') }}
                  placeholder="Select Old AMC"
                />
              </div>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Switch-out Scheme</label>
                <SearchableSelect
                  options={mfOldSchemeOptions}
                  value={mfOldScheme}
                  onChange={setMfOldScheme}
                  placeholder="Select Old scheme"
                  disabled={!mfOldIssuer}
                />
              </div>
            </div>
          )}

          {/* Dynamic fields based on investment type */}
          {investmentType === 'Lumpsum' && (
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Growth / IDCW / EISS</label>
                <select value={mfSchemeOption} onChange={e=>setMfSchemeOption(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="Growth">Growth</option>
                  <option value="IDCW">IDCW</option>
                  <option value="EISS">EISS</option>
                </select>
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Investment Amount</label>
              <input type="number" inputMode="decimal" value={mfInvestmentAmount} onChange={e=>setMfInvestmentAmount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
          )}

          {investmentType === 'SIP' && (
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Growth / EISS</label>
                <select value={mfSchemeOption} onChange={e=>setMfSchemeOption(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="Growth">Growth</option>
                  <option value="EISS">EISS</option>
                </select>
              </div>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Period — years / Number of Installments</label>
                <input type="text" value={mfPeriod} onChange={e=>setMfPeriod(e.target.value)} placeholder="e.g., 12 months or 5 years" className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Investment Amount</label>
                <input type="number" inputMode="decimal" value={mfInvestmentAmount} onChange={e=>setMfInvestmentAmount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
          )}

          {investmentType === 'SWP' && (
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Growth / IDCW / EISS</label>
                <select value={mfSchemeOption} onChange={e=>setMfSchemeOption(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="Growth">Growth</option>
                  <option value="IDCW">IDCW</option>
                  <option value="EISS">EISS</option>
                </select>
              </div>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Period — years / Number of Installments</label>
                <input type="text" value={mfPeriod} onChange={e=>setMfPeriod(e.target.value)} placeholder="e.g., 12 months or 5 years" className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Amount</label>
                <input type="number" inputMode="decimal" value={mfInvestmentAmount} onChange={e=>setMfInvestmentAmount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
          )}

          {investmentType === 'STP' && (
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Growth / EISS</label>
                <select value={mfSchemeOption} onChange={e=>setMfSchemeOption(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="Growth">Growth</option>
                  <option value="EISS">EISS</option>
                </select>
              </div>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Period — years / Number of Installments</label>
                <input type="text" value={mfPeriod} onChange={e=>setMfPeriod(e.target.value)} placeholder="e.g., 12 months or 5 years" className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Amount</label>
                <input type="number" inputMode="decimal" value={mfInvestmentAmount} onChange={e=>setMfInvestmentAmount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
          )}

          {investmentType === 'NFO' && (
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Growth / IDCW / EISS</label>
                <select value={mfSchemeOption} onChange={e=>setMfSchemeOption(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="Growth">Growth</option>
                  <option value="IDCW">IDCW</option>
                  <option value="EISS">EISS</option>
                </select>
              </div>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Investment Amount</label>
                <input type="number" inputMode="decimal" value={mfInvestmentAmount} onChange={e=>setMfInvestmentAmount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
          )}

          {investmentType === 'Additional Purchase' && (
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Existing Folio Number</label>
                <input value={mfFolioPolicyNo} onChange={e=>setMfFolioPolicyNo(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Investment Amount</label>
                <input type="number" inputMode="decimal" value={mfInvestmentAmount} onChange={e=>setMfInvestmentAmount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
          )}

          {investmentType === 'Switch Over' && (
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Switch-out Scheme (AMC)</label>
                <SearchableSelect
                  options={mfIssuerOptions}
                  value={mfOldIssuer}
                  onChange={(v)=>{ setMfOldIssuer(v); setMfOldScheme('') }}
                  placeholder="Select Old AMC"
                />
              </div>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Switch-out Scheme</label>
                <SearchableSelect
                  options={mfOldSchemeOptions}
                  value={mfOldScheme}
                  onChange={setMfOldScheme}
                  placeholder="Select Old scheme"
                  disabled={!mfOldIssuer}
                />
              </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Folio Number</label>
              <input value={mfFolioPolicyNo} onChange={e=>setMfFolioPolicyNo(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
              <div className="col" style={{ flex:'1 1 320px' }}>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Amount</label>
                <input type="number" inputMode="decimal" value={mfInvestmentAmount} onChange={e=>setMfInvestmentAmount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
            </div>
          )}
        </div>
      )}

      {product === 'FD' && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 p-4">
          <h3 className="m-0 mb-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100">Fixed Deposit</h3>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Issuer Company</label>
              <SearchableSelect
                options={nonMfIssuerOptions}
                value={fdIssuer}
                onChange={(v)=>{ setFdIssuer(v); setFdScheme('') }}
                placeholder="Select issuer"
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Issuer Scheme</label>
              <SearchableSelect
                options={fdSchemeOptions}
                value={fdScheme}
                onChange={setFdScheme}
                placeholder="Select scheme/product"
                disabled={!fdIssuer}
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Investment Amount</label>
              <input type="number" inputMode="decimal" value={fdInvestmentAmount} onChange={e=>setFdInvestmentAmount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Application Number</label>
              <input value={fdApplicationNo} onChange={e=>setFdApplicationNo(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Client Category</label>
              <select value={fdClientType} onChange={e=>setFdClientType(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>Individual</option>
                <option>Sr. Citizen</option>
              </select>
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Period of Deposit (Y/M)</label>
              <input value={fdDepositPeriod} onChange={e=>setFdDepositPeriod(e.target.value)} placeholder="e.g., 1Y 6M" className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Interest Rate (%)</label>
              <input type="text" inputMode="decimal" value={fdRoi} onChange={e=>setFdRoi(e.target.value)} placeholder="e.g., 8.25" className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
        </div>
      )}

      {product === 'INS' && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 p-4">
          <h3 className="m-0 mb-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100">Insurance</h3>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Issuer Company</label>
              <SearchableSelect
                options={insIssuerOptions}
                value={insIssuer}
                onChange={(v)=>{ setInsIssuer(v); setInsCategory(''); setInsProduct('') }}
                placeholder="Select insurer"
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Sub-section / Category</label>
              <SearchableSelect
                options={insCategoryOptions}
                value={insCategory}
                onChange={(v)=>{ setInsCategory(v); setInsProduct('') }}
                placeholder="Select category"
                disabled={!insIssuer}
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Product</label>
              <SearchableSelect
                options={insProductOptions}
                value={insProduct}
                onChange={setInsProduct}
                placeholder="Select product"
                disabled={!insCategory}
              />
            </div>
          </div>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Premium Amount</label>
              <input type="number" inputMode="decimal" value={insPremiumAmount} onChange={e=>setInsPremiumAmount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Policy No</label>
              <input value={insPolicyNo} onChange={e=>setInsPolicyNo(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
        </div>
      )}

      {product === 'BOND' && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 p-4">
          <h3 className="m-0 mb-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100">Bonds</h3>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Issuer Company</label>
              <SearchableSelect
                options={nonMfIssuerOptions}
                value={bondIssuer}
                onChange={(v)=>{ setBondIssuer(v); setBondScheme('') }}
                placeholder="Select issuer"
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Issuer Scheme</label>
              <SearchableSelect
                options={bondSchemeOptions}
                value={bondScheme}
                onChange={setBondScheme}
                placeholder="Select scheme/product"
                disabled={!bondIssuer}
              />
            </div>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Investment Amount</label>
              <input type="number" inputMode="decimal" value={bondInvestmentAmount} onChange={e=>setBondInvestmentAmount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div className="col" style={{ flex:'1 1 320px' }}>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1.5">Application Number</label>
              <input value={bondApplicationNo} onChange={e=>setBondApplicationNo(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
        </div>
      )}

      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onBack} className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 bg-white/85 dark:bg-gray-800/85 font-bold text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 transition-colors text-sm sm:text-base">
          Back
        </button>
        <button
          onClick={() => {
            let normalized = {}
            if (product === 'MF') {
              normalized = {
                product_category: 'MF',
                issuerCompany: mfIssuer,
                issuerCategory: 'Mutual Fund',
                schemeName: mfScheme,
                investmentAmount: parseFloat(mfInvestmentAmount) || 0,
                folioPolicyNo: mfFolioPolicyNo,
                txnType: 'Fresh',
                mode: 'Lump Sum',
                schemeOption: 'Growth',
                instrumentType: 'Online Ref',
                instrumentNo: mfFolioPolicyNo || `MF-${Date.now()}`
              }
            } else if (product === 'FD') {
              normalized = {
                product_category: 'FD',
                issuerCompany: fdIssuer,
                issuerCategory: 'Fixed Deposit',
                schemeName: fdScheme,
                investmentAmount: parseFloat(fdInvestmentAmount) || 0,
                folioPolicyNo: fdApplicationNo,
                clientType: fdClientType,
                depositPeriodYM: fdDepositPeriod,
                roi: fdRoi,
                txnType: 'Fresh',
                mode: 'Lump Sum',
                schemeOption: 'Cumulative',
                instrumentType: 'Application',
                instrumentNo: fdApplicationNo || `FD-${Date.now()}`
              }
            } else if (product === 'INS') {
              normalized = {
                product_category: 'INS',
                issuerCompany: insIssuer,
                issuerCategory: insCategory,
                schemeName: insProduct,
                investmentAmount: parseFloat(insPremiumAmount) || 0,
                folioPolicyNo: insPolicyNo,
                txnType: 'Fresh',
                mode: 'Lump Sum',
                schemeOption: 'Annual',
                instrumentType: 'Policy',
                instrumentNo: insPolicyNo || `INS-${Date.now()}`
              }
            } else if (product === 'BOND') {
              normalized = {
                product_category: 'BOND',
                issuerCompany: bondIssuer,
                issuerCategory: 'Bonds',
                schemeName: bondScheme,
                investmentAmount: parseFloat(bondInvestmentAmount) || 0,
                folioPolicyNo: bondApplicationNo,
                txnType: 'Fresh',
                mode: 'Lump Sum',
                schemeOption: 'Cumulative',
                instrumentType: 'Application',
                instrumentNo: bondApplicationNo || `BOND-${Date.now()}`
              }
            }
            onNext(product, normalized)
          }}
          className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 font-bold bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:shadow-md transition-shadow text-sm sm:text-base"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

function StepFinal({ data, onBack, onSave, isSaving, saveError, saveSuccess, supportingDocument, setSupportingDocument }) {
  const [transactionType, setTransactionType] = useState('')
  const [offlineDetails, setOfflineDetails] = useState({
    bankName: '',
    chequeNumber: '',
    chequeDate: '',
    branch: ''
  })
  const [onlineTransactionNumber, setOnlineTransactionNumber] = useState('')
  const [fdDetails, setFdDetails] = useState({
    companyName: '',
    clientCategory: '',
    investAmount: '',
    period: '',
    interestRate: '',
    interestPayable: '',
    transactionType: 'Fresh'
  })

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      
      // Check file type (images and PDFs)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload an image (JPEG, PNG, GIF) or PDF file')
        return
      }
      
      setSupportingDocument(file)
    }
  }

  const removeDocument = () => {
    setSupportingDocument(null)
  }

  const handleSave = () => {
    // Validation
    if (!transactionType) {
      alert('Please select transaction type (Online/Offline)')
      return
    }
    
    if (transactionType === 'Offline') {
      if (!offlineDetails.bankName || !offlineDetails.chequeNumber || !offlineDetails.chequeDate || !offlineDetails.branch) {
        alert('Please fill all offline transaction details')
        return
      }
    } else if (transactionType === 'Online') {
      if (!onlineTransactionNumber) {
        alert('Please enter transaction number')
        return
      }
    }
    
    if (data.productType === 'FD') {
      if (!fdDetails.companyName || !fdDetails.clientCategory || !fdDetails.investAmount || 
          !fdDetails.period || !fdDetails.interestRate || !fdDetails.interestPayable) {
        alert('Please fill all Fixed Deposit details')
        return
      }
    }
    
    if (!supportingDocument) {
      alert('Please upload a supporting document')
      return
    }
    
    // Merge additional data
    const finalData = {
      ...data,
      transactionType,
      ...(transactionType === 'Offline' ? offlineDetails : {}),
      ...(transactionType === 'Online' ? { transactionNumber: onlineTransactionNumber } : {}),
      ...(data.productType === 'FD' ? fdDetails : {})
    }
    
    onSave(finalData)
  }

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '');
  const fmtAmt = (a) => {
    if (a === null || a === undefined || a === '') return '';
    const n = isNaN(Number(a)) ? a : Number(a);
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n); }
    catch { return String(a); }
  };

  const getProductTypeLabel = (type) => {
    switch(type) {
      case 'MF': return 'Mutual Funds';
      case 'INS': return 'Insurance';
      case 'FD': return 'Fixed Deposit';
      case 'BOND': return 'Bonds';
      default: return type;
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Receipt Preview</h3>
        <p className="text-gray-600 dark:text-gray-400">Review your investment details before saving</p>
      </div>

      {/* Receipt Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                <span className="text-red-600 font-bold text-xl">ECS</span>
              </div>
    <div>
                <h1 className="text-2xl font-bold">ECS Financial</h1>
                <p className="text-red-100 text-sm">AMFI Registered Mutual Fund Distributor</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-red-100">Receipt No</div>
              <div className="text-lg font-bold">{data.receiptNo}</div>
              <div className="text-sm text-red-100 mt-1">{fmtDate(data.date)}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Employee & Investor Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Employee Details
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Name:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{data.employeeName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Code:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{data.empCode || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Branch:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{data.branch || '—'}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Investor Details
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">ID:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{data.investorId || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Name:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{data.investorName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">PAN:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{data.pan || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Email:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{data.email || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Investment Details */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
              Investment Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">Product Type</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{getProductTypeLabel(data.productType)}</div>
              </div>
              
              {data.investmentType && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Investment Type</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.investmentType}</div>
                </div>
              )}
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">Transaction</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.txnType || 'Fresh'}</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">Mode</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.mode || 'Lump Sum'}</div>
              </div>
              
              {data.investmentAmount && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Amount</div>
                  <div className="text-lg font-semibold text-green-600 dark:text-green-400">{fmtAmt(data.investmentAmount)}</div>
                </div>
              )}
              
              {data.folioPolicyNo && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Folio/Policy No</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.folioPolicyNo}</div>
                </div>
              )}
            </div>

            {/* Product-specific details */}
            {data.productType === 'MF' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.issuerCompany && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">AMC</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{data.issuerCompany}</div>
                  </div>
                )}
                {data.schemeName && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Scheme</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{data.schemeName}</div>
                  </div>
                )}
                {data.schemeOption && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Option</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{data.schemeOption}</div>
                  </div>
                )}
                {data.period && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Period</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{data.period}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Transaction Type */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
              <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
              Transaction Type *
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <button
                type="button"
                onClick={() => setTransactionType('Online')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  transactionType === 'Online'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">💻</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">Online</div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setTransactionType('Offline')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  transactionType === 'Offline'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">🏦</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">Offline</div>
                </div>
              </button>
            </div>

            {/* Online Transaction Details */}
            {transactionType === 'Online' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Transaction Number *
                </label>
                <input
                  type="text"
                  value={onlineTransactionNumber}
                  onChange={(e) => setOnlineTransactionNumber(e.target.value)}
                  placeholder="Enter transaction number"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Offline Transaction Details */}
            {transactionType === 'Offline' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      value={offlineDetails.bankName}
                      onChange={(e) => setOfflineDetails({...offlineDetails, bankName: e.target.value})}
                      placeholder="Enter bank name"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Cheque Number *
                    </label>
                    <input
                      type="text"
                      value={offlineDetails.chequeNumber}
                      onChange={(e) => setOfflineDetails({...offlineDetails, chequeNumber: e.target.value})}
                      placeholder="Enter cheque number"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Cheque Date *
                    </label>
                    <input
                      type="date"
                      value={offlineDetails.chequeDate}
                      onChange={(e) => setOfflineDetails({...offlineDetails, chequeDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Branch *
                    </label>
                    <input
                      type="text"
                      value={offlineDetails.branch}
                      onChange={(e) => setOfflineDetails({...offlineDetails, branch: e.target.value})}
                      placeholder="Enter branch"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fixed Deposit Details */}
          {data.productType === 'FD' && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                Fixed Deposit Details *
              </h3>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={fdDetails.companyName}
                      onChange={(e) => setFdDetails({...fdDetails, companyName: e.target.value})}
                      placeholder="Enter company name"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Client Category *
                    </label>
                    <select
                      value={fdDetails.clientCategory}
                      onChange={(e) => setFdDetails({...fdDetails, clientCategory: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    >
                      <option value="">Select category</option>
                      <option value="Individual">Individual</option>
                      <option value="Senior Citizen">Senior Citizen</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Investment Amount *
                    </label>
                    <input
                      type="number"
                      value={fdDetails.investAmount}
                      onChange={(e) => setFdDetails({...fdDetails, investAmount: e.target.value})}
                      placeholder="Enter amount"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Period of Deposit *
                    </label>
                    <input
                      type="text"
                      value={fdDetails.period}
                      onChange={(e) => setFdDetails({...fdDetails, period: e.target.value})}
                      placeholder="e.g., 1 Year, 6 Months"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Interest Rate (%) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={fdDetails.interestRate}
                      onChange={(e) => setFdDetails({...fdDetails, interestRate: e.target.value})}
                      placeholder="Enter interest rate"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Interest Payable *
                    </label>
                    <select
                      value={fdDetails.interestPayable}
                      onChange={(e) => setFdDetails({...fdDetails, interestPayable: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    >
                      <option value="">Select type</option>
                      <option value="Non-cumulative">Non-cumulative</option>
                      <option value="Cumulative">Cumulative</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Transaction Type *
                    </label>
                    <select
                      value={fdDetails.transactionType}
                      onChange={(e) => setFdDetails({...fdDetails, transactionType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    >
                      <option value="Fresh">Fresh</option>
                      <option value="Renewal">Renewal</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Supporting Document */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
              <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
              Supporting Document *
            </h3>
        
        {!supportingDocument ? (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
            <FiUpload className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Upload photo proof or supporting document
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
              Supported formats: JPEG, PNG, GIF, PDF (Max 5MB)
            </p>
                <label className="inline-flex items-center px-4 py-2 border border-blue-300 dark:border-blue-600 text-sm font-semibold rounded-lg text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
              <FiUpload className="w-4 h-4 mr-2" />
              Choose File
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        ) : (
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
            <div className="flex items-center">
              <FiFile className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {supportingDocument.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(supportingDocument.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={removeDocument}
              className="inline-flex items-center px-3 py-1.5 border border-red-300 dark:border-red-600 text-xs font-semibold rounded-lg text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/40 hover:bg-red-100 dark:hover:bg-red-900/60 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-all duration-200"
            >
              <FiTrash2 className="w-3 h-3 mr-1" />
              Remove
            </button>
          </div>
        )}
      </div>
        </div>
      </div>
      
      {saveSuccess && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400">
          <div className="flex items-center">
            <FiCheck className="w-5 h-5 mr-2" />
            <span className="font-medium">Success:</span>
            <span className="ml-1">{saveSuccess}</span>
          </div>
        </div>
      )}
      
      {saveError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          <div className="flex items-center">
            <FiAlertCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">Error:</span>
            <span className="ml-1">{saveError}</span>
          </div>
        </div>
      )}
      
      <div className="flex gap-4 justify-center">
        <button 
          onClick={onBack} 
          disabled={isSaving}
          className={`px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Back
        </button>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className={`px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isSaving ? (
            <div className="flex items-center">
              <FiRefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </div>
          ) : (
            'Save Receipt'
          )}
        </button>
      </div>
    </div>
  )
}

export default function MultiStepReceipt() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [empSeed, setEmpSeed] = useState({ empCode: '', employeeName: '', branch: '' })
  const [investorSeed, setInvestorSeed] = useState({ investorId: '', investorInfo: null })
  const [productTypeSeed, setProductTypeSeed] = useState('')
  const [investmentTypeSeed, setInvestmentTypeSeed] = useState('')
  const [finalData, setFinalData] = useState(null)
  const [supportingDocument, setSupportingDocument] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  // Auto-populate employee data from user context
  useEffect(() => {
    if (user && !empSeed.empCode) {
      setEmpSeed({
        empCode: user.emp_code || '',
        employeeName: user.name || '',
        branch: user.branch || ''
      })
    }
  }, [user])

  const buildBase = () => {
    const base = {
      receiptNo: genReceiptNo(),
      date: new Date().toISOString().slice(0, 10),
      branch: empSeed.branch || '',
      employeeName: empSeed.employeeName || '',
      empCode: empSeed.empCode || '',
      investorId: investorSeed.investorId || '',
      investorName: '', investorAddress: '', pinCode: '', pan: '', email: '',
      schemeName: '', investmentAmount: '', folioPolicyNo: '',
      mode: 'Lump Sum', txnType: 'Fresh',
      issuerCompany: ''
    }
    if (investorSeed.investorInfo) {
      base.investorName    = investorSeed.investorInfo.investorName || ''
      base.investorAddress = investorSeed.investorInfo.investorAddress || ''
      base.pinCode         = investorSeed.investorInfo.pinCode || ''
      base.pan             = investorSeed.investorInfo.pan || ''
      base.email           = investorSeed.investorInfo.email || ''
    }
    return base
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
      
      // Navigate to transactions page immediately
      navigate('/transactions')
    } catch (err) {
      console.error('Save error:', err)
      
      // Store error message in localStorage for toast notification
      const errorMessage = err.message || 'Failed to save receipt'
      localStorage.setItem('receipt_error_message', errorMessage)
      localStorage.setItem('receipt_error_timestamp', Date.now().toString())
      localStorage.setItem('receipt_force_refresh', 'true')
      
      // Show error message to user
      setSaveSuccess('')
      
      // Handle specific error types
      if (err.message && err.message.includes('WARN_DATA_TRUNCATED')) {
        setSaveError('Data was too large and was truncated. Please reduce the amount of data or contact support.')
      } else if (err.message && err.message.includes('save_failed')) {
        setSaveError('Failed to save receipt. The data may be too large or contain invalid characters.')
      } else {
        setSaveError(err.message || 'Failed to save receipt')
      }
      
      // Navigate to transactions page even on error to show error toast
      navigate('/transactions')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

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
            // Skip Investment Type step for non-MF products
            if (type === 'MF') {
              setStep(4)
            } else {
              setStep(5) // Skip to product details
            }
          }}
        />
      )}

      {step === 4 && productTypeSeed === 'MF' && (
        <StepInvestmentType
          onBack={() => setStep(3)}
          onNext={type => { setInvestmentTypeSeed(type); setStep(5) }}
          productType={productTypeSeed}
        />
      )}

      {step === 5 && (
        <StepProduct
          onBack={() => setStep(productTypeSeed === 'MF' ? 4 : 3)}
          onNext={(_, normalized) => {
            const base = buildBase()
            const merged = { ...base, ...normalized, investmentType: investmentTypeSeed, productType: productTypeSeed }
            setFinalData(merged)
            setStep(6)
          }}
          investmentType={investmentTypeSeed}
          productType={productTypeSeed}
        />
      )}

      {step === 6 && finalData && (
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