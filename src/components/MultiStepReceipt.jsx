import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PrintReceipt from './PrintReceipt.jsx'
import SearchableSelect from './SearchableSelect.jsx'
import ReportIssueModal from './ReportIssueModal.jsx'
import { Card, Button } from './ui'
import { useToast } from './ui/Toast.jsx'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { FiPlus, FiX, FiUpload, FiFile, FiTrash2, FiAlertCircle, FiHelpCircle, FiSave } from 'react-icons/fi'
import { validateCustomerForm, getPattern, getTitle } from '../utils/validators'
import StepMFScheme from './receipt-steps/StepMFScheme.jsx'
import StepInvestmentType from './receipt-steps/StepInvestmentType.jsx'
import StepTransactionDetails from './receipt-steps/StepTransactionDetails.jsx'
import StepFDIssuer from './receipt-steps/StepFDIssuer.jsx'
import StepFDScheme from './receipt-steps/StepFDScheme.jsx'
import StepFDDetails from './receipt-steps/StepFDDetails.jsx'
import StepNCDBondIssuer from './receipt-steps/StepNCDBondIssuer.jsx'
import StepNCDBondDetails from './receipt-steps/StepNCDBondDetails.jsx'
import StepInsuranceIssuer from './receipt-steps/StepInsuranceIssuer.jsx'
import StepInsuranceProduct from './receipt-steps/StepInsuranceProduct.jsx'
import StepInsuranceDetails from './receipt-steps/StepInsuranceDetails.jsx'
import StepMiscDetails from './receipt-steps/StepMiscDetails.jsx'
import StepProductType from './receipt-steps/StepProductType.jsx'
import StepProduct from './receipt-steps/StepProduct.jsx'
import StepFinal from './receipt-steps/StepFinal.jsx'
import DatePickerInput from './ui/DatePickerInput.jsx'
import { getAmcCategoryById, mergeCategoryMinimums } from '../data/mf_amc_categories'
import { getReceiptProductCategoryLabel } from '../utils/categoryMapping'

// import investorsData from '../data/investors.json' // Removed - too large, using optimized loading instead
// import empData from '../data/empdata.json' // Removed - using backend API instead
import mfSchemes from '../data/mf_schemes.json'
import nonMfIssuers from '../data/non_mf_issuers.json'
import insuranceIssuers from '../data/insurance_issuers.json'

function genReceiptNo({ branch, empCode } = {}) {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  const branchCode = String(branch || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6) || 'NA'
  const emp = String(empCode || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8) || 'EMP'
  return `ECS-${branchCode}-${emp}-${y}${m}${day}-${rand}`
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
        mobile: customer.mobile || '',
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
async function loadInvestorsFromAPIPaginated(token, page = 1, limit = 50) {
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
        mobile: customer.mobile || '',
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
async function searchInvestorsFromAPI(token, query, limit = 50, page = 1) {
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
        
        const rawQuery = (query || '').trim().toLowerCase()

        // Transform customers to expected format
        let transformedCustomers = customers.map(customer => {
          const investorName = customer.name || ''
          const pan = customer.pan || ''
          const investorId = customer.investor_id

          // Local ranking to further prioritize exact PAN/name matches in UI
          let localScore = 0
          const nameLower = investorName.toLowerCase()
          const panLower = pan.toLowerCase()

          if (rawQuery && panLower && panLower === rawQuery) {
            localScore += 100
          }
          if (rawQuery && nameLower && nameLower === rawQuery) {
            localScore += 80
          }

          return {
            investorId,
            investorName,
            mobile: customer.mobile || '',
            investorAddress: `${customer.address1 || ''} ${customer.address2 || ''} ${customer.address3 || ''}`.trim() || customer.investor_address || '',
            pinCode: customer.pin || customer.pin_code || '',
            pan,
            email: customer.email || '',
            isMinor: false,
            parentName: null,
            parentInvestorId: null,
            hasMinors: customer.has_minors || (Array.isArray(customer.minors) && customer.minors.length > 0),
            minorsCount: typeof customer.minors_count === 'number'
              ? customer.minors_count
              : (Array.isArray(customer.minors) ? customer.minors.length : 0),
            localScore
          }
        })

        // Sort by localScore (desc) as a safety net on top of backend ranking
        if (rawQuery) {
          transformedCustomers = transformedCustomers.sort((a, b) => {
            if ((b.localScore || 0) !== (a.localScore || 0)) {
              return (b.localScore || 0) - (a.localScore || 0)
            }
            return String(a.investorName || '').localeCompare(String(b.investorName || ''))
          })
        }
        
        // Helper to transform a minor to the expected format (parent can be customer object for nested minors)
        const transformMinor = (minor, parentCustomer) => {
          const parent = parentCustomer || customers.find(c => c.investor_id === minor.parent_investor_id)
          const useSameAddress = minor.use_same_address !== false
          let address = ''
          if (useSameAddress && parent) {
            address = `${parent.address1 || ''} ${parent.address2 || ''} ${parent.address3 || ''}`.trim()
          } else {
            address = `${minor.address1 || ''} ${minor.address2 || ''} ${minor.address3 || ''}`.trim()
          }
          return {
            investorId: minor.investor_id,
            investorName: `${minor.name} (Minor - ${minor.relationship_type === 'child' ? 'Child' : 'Ward'})`,
            investorAddress: address,
            pinCode: useSameAddress && parent ? (parent.pin || minor.pin || '') : (minor.pin || ''),
            pan: minor.pan || '',
            email: '',
            mobile: (parent && parent.mobile) || minor.mobile || '',
            isMinor: true,
            parentName: parent ? (parent.name || minor.parent_name || '') : (minor.parent_name || ''),
            parentInvestorId: parent ? parent.investor_id : minor.parent_investor_id
          }
        }

        // Transform minors from API (minors that matched the search directly)
        const transformedMinorsFromApi = minors.map(minor => transformMinor(minor, null))

        // Also add minors nested under each customer so they are selectable when searching by major
        const seenMinorIds = new Set(transformedMinorsFromApi.map(m => m.investorId))
        const minorsFromCustomers = []
        for (const customer of customers) {
          const nestedMinors = customer.minors || []
          for (const minor of nestedMinors) {
            if (minor.investor_id != null && !seenMinorIds.has(minor.investor_id)) {
              seenMinorIds.add(minor.investor_id)
              minorsFromCustomers.push(transformMinor(
                { ...minor, parent_investor_id: customer.investor_id, parent_name: customer.name },
                customer
              ))
            }
          }
        }

        const allMinors = [...transformedMinorsFromApi, ...minorsFromCustomers]

        // Combine customers and minors (majors first, then all minors as selectable rows)
        const transformedResults = [...transformedCustomers, ...allMinors]
        
        if (transformedResults.length > 0) {
          const totalFromApi = searchResults.pagination?.total ?? transformedResults.length
          const hasNext = searchResults.pagination?.hasNext ?? false
          return {
            results: transformedResults.slice(0, limit),
            pagination: {
              page,
              limit,
              total: totalFromApi,
              hasMore: hasNext
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
    const paginatedInvestors = await loadInvestorsFromAPIPaginated(token, page, limit)
    
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
function validateDataSize(data, maxSizeBytes = 10 * 1024 * 1024) { // 10MB — JSON payload only; files upload separately after save
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
        ['Scheme', 4],
        ['Investment Type', 5],
        ['Details', 6],
        ['Preview', 7],
      ]
    } else if (productType === 'FD' || productType === 'GOVT_FD') {
      return [
        ['Employee', 1],
        ['Investor', 2],
        ['Product Type', 3],
        ['Issuer', 4],
        ['Scheme', 5],
        ['Details', 6],
        ['Preview', 7],
      ]
    } else if (productType === 'BOND' || productType === 'NCD') {
      return [
        ['Employee', 1],
        ['Investor', 2],
        ['Product Type', 3],
        ['Scheme', 4],
        ['Details', 5],
        ['Preview', 6],
      ]
    } else if (productType === 'INS') {
      return [
        ['Employee', 1],
        ['Investor', 2],
        ['Product Type', 3],
        ['Issuer', 4],
        ['Product', 5],
        ['Details', 6],
        ['Preview', 7],
      ]
    } else if (productType === 'MISC') {
      return [
        ['Employee', 1],
        ['Investor', 2],
        ['Product Type', 3],
        ['Details', 4],
        ['Preview', 5],
      ]
    } else {
      return [
        ['Employee', 1],
        ['Investor', 2],
        ['Product Type', 3],
        ['Details', 4],
        ['Preview', 5],
      ]
    }
  }

  const stepLabels = getStepLabels()
  const totalSteps = stepLabels.length

  // Progress bar: avoid "resetting" when moving from steps 1–3 (no product) to step 4+ (product-specific).
  // Before product type is chosen we use 7 as denominator (longest flow); after, use actual totalSteps.
  const getStepProgress = () => {
    const currentStepIndex = stepLabels.findIndex(([_, stepNumber]) => stepNumber === step)
    if (currentStepIndex === -1) return 0
    const completed = currentStepIndex + 1
    // Steps 1–3: show progress out of longest flow (7) so bar doesn't jump backward when product changes
    const denominator = !productType && step <= 3 ? 7 : totalSteps
    return Math.min(100, (completed / denominator) * 100)
  }

  const pct = getStepProgress()
  const currentMeta = stepLabels.find(([_, stepNumber]) => stepNumber === step)
  const currentLabel = currentMeta ? currentMeta[0] : '—'

  return (
    <div className="mb-4 min-w-0 space-y-3">
      {/* Narrow viewports: single row — no clipped horizontal stepper */}
      <div className="rounded-xl border-2 border-[var(--dashboard-border)] bg-[var(--dashboard-card)] p-3 shadow-[var(--dashboard-shadow)] lg:hidden">
        <div className="flex items-center justify-between gap-3 min-w-0">
          <span className="text-caption sm:text-sm font-medium text-[var(--dashboard-muted)] shrink-0 tabular-nums">
            Step {step} / {totalSteps}
          </span>
          <span className="text-sm sm:text-base font-semibold text-[var(--dashboard-text)] truncate text-right min-w-0" title={currentLabel}>
            {currentLabel}
          </span>
        </div>
      </div>

      {/* Desktop: full pill stepper (scrolls if needed on smaller laptops) */}
      <div className="hidden lg:block overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 -mx-1 px-1 touch-pan-x">
        <div className="inline-flex flex-nowrap items-center gap-0.5 rounded-xl border-2 border-[var(--dashboard-border)] bg-[var(--dashboard-card)] p-1 min-h-[44px] shadow-[var(--dashboard-shadow)]">
          {stepLabels.map(([label, stepNumber], i) => (
            <React.Fragment key={`${label}-${stepNumber}`}>
              <div
                className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all duration-200 flex-shrink-0 ${
                  step === stepNumber
                    ? 'bg-[var(--dashboard-primary)] text-white border-2 border-[var(--dashboard-primary)] shadow-md'
                    : 'text-[var(--dashboard-muted)] bg-transparent border-2 border-transparent hover:bg-[var(--dashboard-border)]/50 hover:text-[var(--dashboard-text)]'
                }`}
              >
                <span className={`w-6 h-6 rounded-full grid place-items-center text-xs font-bold flex-shrink-0 ${
                  step === stepNumber ? 'bg-white/25 text-white border border-white/30' : 'bg-[var(--dashboard-border)] text-[var(--dashboard-text)] border border-[var(--dashboard-border)]'
                }`}>
                  {stepNumber}
                </span>
                <span className={`text-xs font-semibold whitespace-nowrap ${step === stepNumber ? 'text-white' : 'text-[var(--dashboard-text)]'}`}>{label}</span>
              </div>
              {i < stepLabels.length - 1 && <div className="w-px h-5 bg-[var(--dashboard-border)] flex-shrink-0 mx-0.5" aria-hidden />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="h-2 w-full rounded-full bg-[var(--dashboard-border)] overflow-hidden">
        <div className="h-full rounded-full bg-[var(--dashboard-primary)] transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const PRODUCT_TYPE_LABELS = { MF: 'Mutual Funds', INS: 'Insurance', FD: 'Fixed Deposit', BOND: 'Bonds', GOVT_FD: 'Government Schemes', MISC: 'Misc Services', NCD: 'NCD' }

function isBondNcdProductType(productType) {
  return productType === 'BOND' || productType === 'NCD'
}

function getReceiptPreviewStep(productType) {
  if (isBondNcdProductType(productType)) return 6
  if (productType === 'MISC') return 5
  return 7
}

function isOnReceiptPreviewStep(step, productType, hasFinalData) {
  if (!hasFinalData || !productType) return false
  return step === getReceiptPreviewStep(productType)
}

function normalizeBondDraftStep(step, draftData) {
  const pt = draftData.productTypeSeed
  if (!isBondNcdProductType(pt)) return step
  if (step === 7) return 6
  if (step === 6) return draftData.finalData ? 6 : 5
  if (step === 5) return draftData.ncdBondSchemeSeed ? 5 : 4
  return step
}

function getAllowedMfTxnTypesByCategory(amcCategory) {
  if (amcCategory === 'SIF') return ['Lumpsum', 'SIP']
  if (amcCategory === 'PMS' || amcCategory === 'AIF' || amcCategory === 'GIFT_CITY_FUNDS') return ['Lumpsum']
  return ['Lumpsum', 'SIP', 'SWP', 'STP', 'Switch Over']
}

function LivePreview({ empSeed, investorSeed, productTypeSeed, mfSchemeSeed, fdIssuerSeed, fdSchemeSeed, ncdBondIssuerSeed, ncdBondSchemeSeed, insuranceIssuerSeed, insuranceProductSeed, finalData, receiptNo = null, draftId = null }) {
  const [collapsed, setCollapsed] = useState(true)
  const rawProduct = productTypeSeed || finalData?.product_category || ''
  const productLabel = rawProduct
    ? getReceiptProductCategoryLabel({
        product_category: rawProduct,
        mf_amc_category: finalData?.mf_amc_category || mfSchemeSeed?.selectedAmcCategory?.id,
        mf_details: finalData?.mf_details,
        product_details: finalData?.product_details
      })
    : (PRODUCT_TYPE_LABELS[rawProduct] || '')

  const normalizeTxnTypeToModeDisplay = (raw) => {
    const v = String(raw || '').trim()
    if (!v) return ''
    const upper = v.toUpperCase()
    if (upper === 'SWITCHOVER' || v === 'Switch Over') return 'Switch Over'
    if (v === 'Lumpsum' || v === 'LumpSum' || v === 'Lump Sum') return 'Lump Sum'
    return v // SIP / SWP / STP
  }

  const modeDisplay =
    finalData?.product_category === 'MF'
      ? (() => {
          const cat = finalData?.mf_amc_category || mfSchemeSeed?.selectedAmcCategory?.id || 'MF'
          const requested = normalizeTxnTypeToModeDisplay(finalData?.txn_type || finalData?.txnType) || finalData?.mode || ''
          const allowed = getAllowedMfTxnTypesByCategory(cat)
          return allowed.includes(requested) ? requested : (allowed[0] || '')
        })()
      : ''

  const summary = {
    receipt: receiptNo != null ? String(receiptNo) : (draftId != null ? `#${String(draftId).padStart(7, '0')}` : ''),
    employee: empSeed.employeeName || empSeed.empCode || '',
    investor: investorSeed.investorInfo?.investorName || investorSeed.investorId || '',
    product: productLabel,
    mode: modeDisplay,
    issuer: finalData?.issuer_company || finalData?.issuerCompany ||
      fdIssuerSeed?.short_name || ncdBondIssuerSeed?.short_name || insuranceIssuerSeed?.short_name ||
      mfSchemeSeed?.selectedAmc?.amc_name || '',
    scheme: (finalData?.scheme_name || finalData?.schemeName ||
      fdSchemeSeed?.scheme_name || ncdBondSchemeSeed?.scheme_name || insuranceProductSeed?.product_name ||
      mfSchemeSeed?.selectedScheme?.scheme_name || finalData?.service_name || '') +
      (productTypeSeed === 'MF' && (finalData?.mf_amc_category || mfSchemeSeed?.selectedAmcCategory?.id) && (finalData?.mf_amc_category || mfSchemeSeed?.selectedAmcCategory?.id) !== 'MF'
        ? ` (${getAmcCategoryById(finalData?.mf_amc_category || mfSchemeSeed?.selectedAmcCategory?.id).label})`
        : ''),
    amount: finalData?.investment_amount || finalData?.investmentAmount || finalData?.fd_deposit_amount || finalData?.service_price || ''
  }
  const amountNum = typeof summary.amount === 'number' ? summary.amount : (typeof summary.amount === 'string' && summary.amount !== '' ? parseFloat(summary.amount.replace(/[^0-9.-]/g, '')) : NaN)
  const totalDisplay = !isNaN(amountNum) && amountNum > 0 ? `₹ ${Number(amountNum).toLocaleString('en-IN')}` : (summary.amount != null && summary.amount !== '' ? (typeof summary.amount === 'number' ? `₹ ${Number(summary.amount).toLocaleString('en-IN')}` : summary.amount) : '₹ 0')
  const amountDisplay = summary.amount != null && summary.amount !== '' ? (typeof summary.amount === 'number' ? `₹${Number(summary.amount).toLocaleString('en-IN')}` : summary.amount) : '—'

  if (!summary.employee && !summary.investor && !summary.product && summary.receipt === '') return null

  const rowClass = 'flex justify-between items-baseline gap-4 py-3.5 border-b border-[var(--stroke)]/80 text-body'
  const labelClass = 'text-helper text-[var(--text-muted)] flex-shrink-0'
  const valueClass = 'text-[var(--text-primary)] font-medium text-right min-w-0 break-words'

  const content = (
    <div className="flex flex-col gap-0">
      {summary.receipt !== '' && (
        <div className={rowClass}>
          <span className={labelClass}>Receipt</span>
          <span className={`${valueClass} truncate max-w-[75%]`} title={summary.receipt}>{summary.receipt}</span>
        </div>
      )}
      <div className={rowClass}>
        <span className={labelClass}>Employee</span>
        <span className={`${valueClass} truncate max-w-[75%]`} title={summary.employee || undefined}>{summary.employee || '—'}</span>
      </div>
      <div className={rowClass}>
        <span className={labelClass}>Investor</span>
        <span className={`${valueClass} max-w-[75%] whitespace-normal break-words`} title={summary.investor || undefined}>{summary.investor || '—'}</span>
      </div>
      <div className={rowClass}>
        <span className={labelClass}>Product</span>
        <span className={valueClass}>{summary.product || '—'}</span>
      </div>
      <div className={rowClass}>
        <span className={labelClass}>Issuer</span>
        <span className={`${valueClass} truncate max-w-[75%]`} title={summary.issuer || undefined}>{summary.issuer || '—'}</span>
      </div>
      <div className={rowClass}>
        <span className={labelClass}>Scheme</span>
        <span className={`${valueClass} truncate max-w-[75%]`} title={summary.scheme || undefined}>{summary.scheme || '—'}</span>
      </div>
      <div className={rowClass}>
        <span className={labelClass}>Amount</span>
        <span className={valueClass}>{amountDisplay}</span>
      </div>
      <div className={`${rowClass} border-b-0 pb-0`}>
        <span className={labelClass}>Total</span>
        <span className="text-[var(--text-primary)] font-semibold">{totalDisplay}</span>
      </div>
    </div>
  )

  return (
    <Card padding="lg" className="mb-4 min-w-0 max-w-full overflow-hidden shadow-glow border border-[var(--stroke)] bg-[var(--card-bg)]/90 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2 mb-5">
        <span className="text-section-title text-[var(--text-primary)] tracking-tight">Live Preview</span>
        <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          className="lg:hidden rounded-full px-3 py-1.5 text-caption font-medium text-[var(--accent)] hover:bg-[var(--link-hover-bg)] hover:text-[var(--link-hover)] transition-colors"
        >
          {collapsed ? 'Show' : 'Hide'}
        </button>
      </div>
      <div className="hidden lg:block">{content}</div>
      {!collapsed && <div className="lg:hidden">{content}</div>}
    </Card>
  )
}

function StepEmployee({ user, onNext }) {
  // Auto-populate from user context (API may send branch as id; prefer branch_name / branch_code for display)
  const code = user?.emp_code || ''
  const employeeName = user?.name || ''
  const branchDisplay = user?.branch_name || user?.branch_code || user?.branch || ''
  const branch = branchDisplay

  const isValidEmployee = code && employeeName

  return (
    <div className="space-y-6">
      <Card padding="lg" hover={false} className="border-0 shadow-none bg-transparent">
        <h3 className="text-section-title text-[var(--text-primary)] mt-0 mb-1">Employee</h3>
        <p className="text-helper text-[var(--text-muted)] mb-6">Confirm your details from your login.</p>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="text-label text-[var(--text-secondary)] block mb-1.5">Employee code</label>
            <input
              value={code}
              readOnly
              placeholder="e.g. ECS497"
              className="w-full rounded-input border border-[var(--stroke)] bg-[var(--card-hover)] px-4 py-3 text-body text-[var(--text-primary)] placeholder:text-[var(--placeholder)] cursor-not-allowed"
            />
            <p className="text-helper text-[var(--text-muted)] mt-1.5">Auto-filled from your login credentials.</p>
          </div>
        </div>

        {code && (
          <div className="mt-6 pt-6 border-t border-[var(--stroke)]">
            <h4 className="text-card-title text-[var(--text-primary)] mb-4">Preview</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-helper text-[var(--text-muted)]">Name</span>
                <p className="text-body font-medium text-[var(--text-primary)] mt-0.5">{employeeName || '—'}</p>
              </div>
              <div>
                <span className="text-helper text-[var(--text-muted)]">Branch</span>
                <p className="text-body font-medium text-[var(--text-primary)] mt-0.5">{branch || '—'}</p>
              </div>
              <div>
                <span className="text-helper text-[var(--text-muted)]">Email</span>
                <p className="text-body font-medium text-[var(--text-primary)] mt-0.5 truncate">{user?.email || '—'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 mt-8">
          <Button
            variant="primary"
            onClick={() => onNext({
              empCode: code || '',
              employeeName: employeeName || '',
              branch: branch || '',
              branch_name: user?.branch_name || '',
              branch_code: user?.branch_code || ''
            })}
            disabled={!code}
          >
            Continue
          </Button>
        </div>
      </Card>
    </div>
  )
}

function StepInvestor({ onBack, onFound, token, user, recentInvestors = [] }) {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(null)
  const [selectedMajorWithMinors, setSelectedMajorWithMinors] = useState(null) // full major customer with minors, when selected is major
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false)
  const selectedCardRef = useRef(null)
  const continueButtonsRef = useRef(null)
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
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`)
        return false
      }
      
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File ${file.name} has an unsupported format. Please upload images or PDF files.`)
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

  // Fetch full customer details when clicked (minors: use search result; majors: fetch from API)
  const handleSelectCustomer = async (customer) => {
    // Minors are nested under majors in the backend; GET /customers/:id only returns majors. Use search result as-is.
    if (customer.isMinor) {
      setSelected({
        investorId: customer.investorId,
        investorName: customer.investorName,
        investorAddress: customer.investorAddress || '',
        pinCode: customer.pinCode || '',
        pan: customer.pan || '',
        email: customer.email || '',
        mobile: customer.mobile || ''
      })
      setSelectedMajorWithMinors(null)
      return
    }
    setIsLoadingCustomer(true)
    try {
      // Fetch full customer details from the API (majors only)
      const fullCustomerData = await api.getCustomer(token, customer.investorId)
      
      console.log('Full customer data fetched:', fullCustomerData)
      
      // Transform the full customer data to match expected format
      const transformedCustomer = {
        investorId: fullCustomerData.investor_id,
        investorName: fullCustomerData.name || fullCustomerData.investor_name || 'Unknown',
        investorAddress: `${fullCustomerData.address1 || ''} ${fullCustomerData.address2 || ''} ${fullCustomerData.address3 || ''}`.trim() || fullCustomerData.investor_address || '',
        pinCode: fullCustomerData.pin || fullCustomerData.pin_code || '',
        pan: fullCustomerData.pan || '',
        email: fullCustomerData.email || '',
        mobile: fullCustomerData.mobile != null && fullCustomerData.mobile !== '' ? String(fullCustomerData.mobile) : ''
      }
      
      console.log('Transformed selected customer:', transformedCustomer)
      setSelected(transformedCustomer)
      setSelectedMajorWithMinors(fullCustomerData)
    } catch (error) {
      console.error('Error fetching customer details:', error)
      // Fallback to using the search result data if API call fails
      setSelected(customer)
      setSelectedMajorWithMinors(null)
      toast.error('Could not fetch complete customer details. Using available data.')
    } finally {
      setIsLoadingCustomer(false)
    }
  }

  // Auto-scroll to the bottom so Continue button is visible when a customer is selected
  useEffect(() => {
    if (!selected) return
    const id = setTimeout(() => {
      continueButtonsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, 100)
    return () => clearTimeout(id)
  }, [selected])

  const handleCreateCustomer = async () => {
    // Validate form
    const validation = validateCustomerForm(newCustomer)
    if (!validation.valid) {
      toast.error('Please fix the following errors:\n\n' + validation.errors.join('\n'))
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
      
      // Add attachment files (backend expects field name 'files' for uploadMultiple)
      mediaFiles.forEach((file) => {
        formDataToSend.append('files', file)
      })
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/customers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
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
        email: newCustomer.email || '',
        mobile: newCustomer.mobile || ''
      }
      
      // Select the newly created customer
      setSelected(createdCustomer)
      setSelectedMajorWithMinors(null)
      setShowCreateForm(false)
      resetCustomerForm()
      
      toast.success(`Customer created successfully! ${result.media_files > 0 ? `(${result.media_files} files uploaded)` : ''}`)
      
      // Refresh the search results to include the new customer
      if (q && q.length >= 2) {
        const searchResponse = await searchInvestorsFromAPI(token, q, 50, 1)
        setResults(searchResponse.results)
        setAllResults(searchResponse.results)
        setPagination(searchResponse.pagination)
      }
      
    } catch (err) {
      toast.error('Failed to create customer: ' + err.message)
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
  const PAGE_SIZE = 4

  // Use useEffect to handle async search with debouncing (always fetches page 1)
  useEffect(() => {
    const performSearch = async () => {
      if (!q || q.length < 2) {
        setResults([])
        setPagination({
          page: 1,
          limit: PAGE_SIZE,
          total: 0,
          hasMore: false
        })
        return
      }

      setIsSearching(true)
      try {
        const searchResponse = await searchInvestorsFromAPI(token, q, PAGE_SIZE, 1)
        setResults(searchResponse.results || [])
        const pag = searchResponse.pagination || {}
        const total = pag.total ?? (searchResponse.results?.length || 0)
        setPagination({
          page: 1,
          limit: PAGE_SIZE,
          total,
          hasMore: pag.hasMore ?? (1 * PAGE_SIZE < total)
        })
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
        setPagination({
          page: 1,
          limit: PAGE_SIZE,
          total: 0,
          hasMore: false
        })
      } finally {
        setIsSearching(false)
      }
    }

    const debounceTimer = setTimeout(performSearch, 300)
    return () => clearTimeout(debounceTimer)
  }, [q, token])

  // Go to a specific page (prev/next)
  const goToPage = async (pageNum) => {
    if (!q || q.length < 2 || pageNum < 1 || isSearching) return
    const totalPages = Math.ceil((pagination.total || 0) / PAGE_SIZE) || 1
    if (pageNum > totalPages) return

    setIsSearching(true)
    try {
      const searchResponse = await searchInvestorsFromAPI(token, q, PAGE_SIZE, pageNum)
      setResults(searchResponse.results || [])
      const pag = searchResponse.pagination || {}
      const total = pag.total ?? pagination.total
      setPagination({
        page: pageNum,
        limit: PAGE_SIZE,
        total: total ?? 0,
        hasMore: pag.hasMore ?? (pageNum * PAGE_SIZE < total)
      })
    } catch (error) {
      console.error('Page change error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card padding="lg" hover={false} className="border-0 shadow-none bg-transparent">
        <h3 className="text-section-title text-[var(--text-primary)] mt-0 mb-1">Investor</h3>
        <p className="text-helper text-[var(--text-muted)] mb-6">Search and select the investor or create a new customer.</p>

      {recentInvestors.length > 0 && (
        <div className="mb-6">
          <span className="text-label text-[var(--text-secondary)] block mb-2">Recent investors</span>
          <div className="flex flex-wrap gap-2">
            {recentInvestors.map(inv => (
              <button
                key={inv.investorId}
                type="button"
                onClick={() => handleSelectCustomer(inv)}
                className="rounded-pill border border-[var(--stroke)] bg-[var(--card-bg)] px-3 py-1.5 text-caption font-medium text-[var(--text-primary)] hover:bg-[var(--card-hover)] hover:border-[var(--accent)]/40 transition-colors"
              >
                {inv.investorName || inv.investorId}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <label className="text-label text-[var(--text-secondary)] block">Search by ID, name, address, PAN or email</label>
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setSelected(null); setSelectedMajorWithMinors(null) }}
          placeholder="Type to search…"
          className="w-full rounded-input border border-[var(--stroke)] bg-[var(--card-bg-opaque)] px-4 py-3 text-body text-[var(--text-primary)] placeholder:text-[var(--placeholder)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--canvas)]"
        />
        <p className="text-helper text-[var(--text-muted)]">
          {q && q.length >= 2 && pagination.total > 0
            ? `Page ${pagination.page} of ${Math.ceil(pagination.total / PAGE_SIZE) || 1} (${pagination.total} results)`
            : q && q.length >= 2
              ? 'Search with at least 2 characters'
              : 'Type to search…'}
        </p>
      </div>

      {/* Create New Customer Button */}
      <div className="mb-6">
        <Button
          variant="secondary"
          icon={<FiPlus className="w-4 h-4" />}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'Create new customer'}
        </Button>
      </div>

      {/* Enhanced Create New Customer Form */}
      {showCreateForm && (
        <div className="mb-6 rounded-card border border-[var(--stroke)] bg-[var(--card-hover)]/50 p-6">
          <h4 className="text-card-title text-[var(--text-primary)] mb-4">Create new customer</h4>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[var(--dashboard-muted)] font-semibold mb-1.5">Title</label>
                <select
                  value={newCustomer.title}
                  onChange={e => setNewCustomer(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-transparent"
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
                <label className="text-sm text-[var(--dashboard-muted)] font-semibold mb-1.5">Customer Name *</label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={e => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter customer name"
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] text-[var(--dashboard-text)] placeholder-[var(--dashboard-muted)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[var(--dashboard-muted)] font-semibold mb-1.5">PAN Number *</label>
                <input
                  type="text"
                  value={newCustomer.pan}
                  onChange={e => setNewCustomer(prev => ({ ...prev, pan: e.target.value.toUpperCase() }))}
                  placeholder="ABCDE1234F"
                  pattern={getPattern('pan')}
                  maxLength="10"
                  title={getTitle('pan')}
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] text-[var(--dashboard-text)] placeholder-[var(--dashboard-muted)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-[var(--dashboard-muted)] font-semibold mb-1.5">Email *</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={e => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] text-[var(--dashboard-text)] placeholder-[var(--dashboard-muted)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[var(--dashboard-muted)] font-semibold mb-1.5">Mobile *</label>
                <input
                  type="tel"
                  value={newCustomer.mobile}
                  onChange={e => setNewCustomer(prev => ({ ...prev, mobile: e.target.value.replace(/\D/g, '') }))}
                  placeholder="9876543210"
                  pattern={getPattern('mobile')}
                  maxLength="10"
                  title={getTitle('mobile')}
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] text-[var(--dashboard-text)] placeholder-[var(--dashboard-muted)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-[var(--dashboard-muted)] font-semibold mb-1.5">Date of Birth</label>
                <DatePickerInput
                  value={newCustomer.date_of_birth}
                  onChange={(v) => setNewCustomer(prev => ({ ...prev, date_of_birth: v }))}
                  inputClassName="w-full px-4 py-3 rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-transparent"
                />
              </div>
            </div>

            {/* PIN Code with lookup */}
            <div className="relative">
              <label className="text-sm text-[var(--dashboard-muted)] font-semibold mb-1.5">PIN Code (Enter to auto-fill location)</label>
              <input
                type="text"
                value={newCustomer.pin}
                onChange={e => handlePincodeChange(e.target.value.replace(/\D/g, ''))}
                placeholder="110001"
                pattern={getPattern('pin')}
                maxLength="6"
                title={getTitle('pin')}
                className="w-full px-4 py-3 rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] text-[var(--dashboard-text)] placeholder-[var(--dashboard-muted)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-transparent"
              />
              
              {/* Loading indicator */}
              {pincodeLoading && (
                <div className="absolute right-3 top-8">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--dashboard-primary)]"></div>
                </div>
              )}
              
              {/* Pincode suggestions dropdown */}
              {showPincodeDropdown && pincodeSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-[var(--dashboard-card)] border border-[var(--dashboard-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {pincodeSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectPincodeSuggestion(suggestion)}
                      className="w-full px-3 py-2.5 text-left text-[var(--text-primary)] hover:bg-[var(--card-hover)] focus:bg-[var(--card-hover)] focus:outline-none transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-[var(--dashboard-text)]">
                            {suggestion.pincode}
                          </div>
                          <div className="text-sm text-[var(--dashboard-muted)]">
                            {suggestion.city}, {suggestion.state}
                          </div>
                        </div>
                        <div className="text-xs text-[var(--dashboard-muted)]">
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
                <label className="text-sm text-[var(--dashboard-muted)] font-semibold mb-1.5">Address Line 1</label>
                <input
                  type="text"
                  value={newCustomer.address1}
                  onChange={e => setNewCustomer(prev => ({ ...prev, address1: e.target.value }))}
                  placeholder="Enter address line 1"
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] text-[var(--dashboard-text)] placeholder-[var(--dashboard-muted)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-[var(--dashboard-muted)] font-semibold mb-1.5">Address Line 2</label>
                <input
                  type="text"
                  value={newCustomer.address2}
                  onChange={e => setNewCustomer(prev => ({ ...prev, address2: e.target.value }))}
                  placeholder="Enter address line 2"
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] text-[var(--dashboard-text)] placeholder-[var(--dashboard-muted)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-[var(--dashboard-muted)] font-semibold mb-1.5">Address Line 3</label>
                <input
                  type="text"
                  value={newCustomer.address3}
                  onChange={e => setNewCustomer(prev => ({ ...prev, address3: e.target.value }))}
                  placeholder="Enter address line 3"
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] text-[var(--dashboard-text)] placeholder-[var(--dashboard-muted)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-[var(--dashboard-muted)] font-semibold mb-1.5">City *</label>
                <input
                  type="text"
                  value={newCustomer.city}
                  onChange={e => setNewCustomer(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Enter city"
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] text-[var(--dashboard-text)] placeholder-[var(--dashboard-muted)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-[var(--dashboard-muted)] font-semibold mb-1.5">State *</label>
                <input
                  type="text"
                  value={newCustomer.state}
                  onChange={e => setNewCustomer(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="Enter state"
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] text-[var(--dashboard-text)] placeholder-[var(--dashboard-muted)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-[var(--dashboard-muted)] font-semibold mb-1.5">Country *</label>
                <input
                  type="text"
                  value={newCustomer.country || 'India'}
                  onChange={e => setNewCustomer(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:border-transparent"
                />
              </div>
            </div>

            {/* Media Upload Section */}
            <div className="space-y-2">
              <label className="text-sm text-[var(--dashboard-muted)] font-semibold">Supporting Documents</label>
              <div className="border-2 border-dashed border-[var(--dashboard-border)] rounded-lg p-4 text-center hover:border-[var(--dashboard-primary)]/60 transition-colors">
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
                  className="inline-flex items-center px-4 py-2.5 rounded-full border border-[var(--stroke)] text-body font-semibold text-[var(--text-primary)] bg-[var(--card-bg)] hover:bg-[var(--card-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 transition-all duration-200 cursor-pointer shadow-sm"
                >
                  📎 Upload Documents
                </label>
                <p className="text-xs text-[var(--dashboard-muted)] mt-1">
                  Supported formats: JPEG, PNG, GIF, WebP, PDF (Max 10MB each)
                </p>
              </div>

              {/* Display uploaded files */}
              {mediaFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-[var(--dashboard-text)]">
                    Uploaded Files ({mediaFiles.length})
                  </h4>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {mediaFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-[var(--dashboard-bg)] rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{getFileIcon(file)}</span>
                          <div>
                            <p className="text-xs font-medium text-[var(--dashboard-text)] truncate max-w-32">
                              {file.name}
                            </p>
                            <p className="text-xs text-[var(--dashboard-muted)]">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMediaFile(index)}
                          className="text-[var(--error)] hover:text-[var(--error)] hover:bg-[var(--error-muted)] text-caption"
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
                className="inline-flex items-center px-4 py-2.5 rounded-full border border-[var(--success)]/50 text-body font-semibold text-[var(--success)] bg-[var(--success-muted)] hover:bg-[var(--success)]/20 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create Customer'}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  resetCustomerForm()
                }}
                className="inline-flex items-center px-4 py-2.5 rounded-full border border-[var(--stroke)] text-body font-semibold text-[var(--text-primary)] bg-[var(--card-bg)] hover:bg-[var(--card-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 transition-all duration-200 shadow-sm"
              >
                <FiX className="w-4 h-4 mr-2" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-h-[65vh] overflow-auto rounded-card border border-[var(--stroke)] bg-[var(--card-bg)]">
        {isLoadingCustomer && (
          <div className="absolute inset-0 bg-[var(--card-bg)]/90 flex items-center justify-center z-10 rounded-card">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--stroke)] border-t-[var(--accent)]" />
              <p className="mt-2 text-body text-[var(--text-muted)]">Loading customer details…</p>
            </div>
          </div>
        )}
        {isSearching ? (
          <div className="p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--stroke)] border-t-[var(--accent)]" />
            <p className="mt-2 text-body text-[var(--text-muted)]">Searching investors…</p>
          </div>
        ) : results.length === 0 && q && q.length >= 2 ? (
          <div className="p-8 text-center">
            <p className="text-body text-[var(--text-muted)]">No investors found matching your search.</p>
          </div>
        ) : (
          <>
          <table className="w-full border-collapse text-body min-w-0 table-fixed">
            <thead>
              <tr className="bg-[var(--card-hover)]">
                <th className="text-left px-4 py-3 border-b border-[var(--stroke)] text-table-header w-[120px]">ID</th>
                <th className="text-left px-4 py-3 border-b border-[var(--stroke)] text-table-header">Name</th>
                <th className="text-left px-4 py-3 border-b border-[var(--stroke)] text-table-header w-[7.5rem] min-w-[7.5rem]">PAN</th>
              </tr>
            </thead>
            <tbody>
              {results.map((it, i) => {
                const isSel = selected && String(selected.investorId) === String(it.investorId)
                return (
                  <tr
                    key={`${it.investorId}-${i}`}
                    onClick={() => handleSelectCustomer(it)}
                    className={`cursor-pointer border-b border-[var(--stroke)] transition-colors ${isSel ? 'bg-[var(--accent-muted)]' : i % 2 === 0 ? 'bg-[var(--canvas)] hover:bg-[var(--card-hover)]' : 'bg-[var(--card-hover)]/50 hover:bg-[var(--card-hover)]'}`}
                  >
                    <td className="px-4 py-3 text-[var(--text-primary)] truncate" title={String(it.investorId ?? '')}>{it.investorId ?? ''}</td>
                    <td className="px-4 py-3 text-[var(--text-primary)] min-w-0 truncate" title={it.investorName ?? ''}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{it.investorName ?? ''}</span>
                        {it.hasMinors && it.minorsCount > 0 && (
                          <span className="inline-flex flex-shrink-0 items-center rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent-strong)]">
                            Minors: {it.minorsCount}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-primary)] whitespace-nowrap" title={it.pan ?? ''}>{it.pan ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          {/* Pagination: Prev | Page X of Y | Next */}
          {q && q.length >= 2 && pagination.total > 0 && (
            <div className="flex items-center justify-center gap-3 p-4 border-t border-[var(--dashboard-border)]">
              <button
                type="button"
                onClick={() => goToPage(pagination.page - 1)}
                disabled={isSearching || pagination.page <= 1}
                className="px-3 py-2 rounded-lg text-body font-medium border border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--card-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-body text-[var(--text-muted)]">
                Page {pagination.page} of {Math.ceil(pagination.total / PAGE_SIZE) || 1}
              </span>
              <button
                type="button"
                onClick={() => goToPage(pagination.page + 1)}
                disabled={isSearching || !pagination.hasMore}
                className="px-3 py-2 rounded-lg text-body font-medium border border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--card-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
          </>
        )}
      </div>

      {selected && (
        <div ref={selectedCardRef} className="mt-4">
          <Card padding="md" hover={false}>
          <h4 className="text-card-title text-[var(--text-primary)] mb-4">Selected investor</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <span className="text-helper text-[var(--text-muted)]">ID</span>
              <p className="text-body font-medium text-[var(--text-primary)] mt-0.5">{selected.investorId || '—'}</p>
            </div>
            <div>
              <span className="text-helper text-[var(--text-muted)]">Name</span>
              <p className="text-body font-medium text-[var(--text-primary)] mt-0.5">{selected.investorName || '—'}</p>
            </div>
            <div>
              <span className="text-helper text-[var(--text-muted)]">PAN</span>
              <p className="text-body font-medium text-[var(--text-primary)] mt-0.5">{selected.pan || '—'}</p>
            </div>
            <div>
              <span className="text-helper text-[var(--text-muted)]">Email</span>
              <p className="text-body font-medium text-[var(--text-primary)] mt-0.5 truncate">{selected.email || '—'}</p>
            </div>
            <div>
              <span className="text-helper text-[var(--text-muted)]">PIN</span>
              <p className="text-body font-medium text-[var(--text-primary)] mt-0.5">{selected.pinCode || '—'}</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <span className="text-helper text-[var(--text-muted)]">Address</span>
              <p className="text-body font-medium text-[var(--text-primary)] mt-0.5 whitespace-pre-wrap break-words">{selected.investorAddress || '—'}</p>
            </div>
          </div>

          {/* Minors under this major: show as selectable when selected is the major */}
          {selectedMajorWithMinors && selected && String(selected.investorId) === String(selectedMajorWithMinors.investor_id) && selectedMajorWithMinors.minors && selectedMajorWithMinors.minors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--stroke)]">
              <p className="text-helper text-[var(--text-muted)] mb-2">Or select a minor for this receipt:</p>
              <div className="flex flex-wrap gap-2">
                {selectedMajorWithMinors.minors.map((minor) => {
                  const useSameAddress = minor.use_same_address !== false
                  const address = useSameAddress
                    ? `${selectedMajorWithMinors.address1 || ''} ${selectedMajorWithMinors.address2 || ''} ${selectedMajorWithMinors.address3 || ''}`.trim()
                    : `${minor.address1 || ''} ${minor.address2 || ''} ${minor.address3 || ''}`.trim()
                  const minorAsSelected = {
                    investorId: minor.investor_id,
                    investorName: `${minor.name} (Minor - ${minor.relationship_type === 'child' ? 'Child' : 'Ward'})`,
                    investorAddress: address,
                    pinCode: useSameAddress ? (selectedMajorWithMinors.pin || minor.pin || '') : (minor.pin || ''),
                    pan: minor.pan || '',
                    email: minor.email || ''
                  }
                  return (
                    <button
                      key={minor.investor_id}
                      type="button"
                      onClick={() => setSelected(minorAsSelected)}
                      className="rounded-pill border border-[var(--stroke)] bg-[var(--card-bg)] px-3 py-2 text-caption font-medium text-[var(--text-primary)] hover:bg-[var(--card-hover)] hover:border-[var(--accent)]/40 transition-colors"
                    >
                      {minor.name} (Minor)
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* When selected is a minor and we have the parent, offer to switch back to major */}
          {selectedMajorWithMinors && selected && String(selected.investorId) !== String(selectedMajorWithMinors.investor_id) && (
            <div className="mt-4 pt-4 border-t border-[var(--stroke)]">
              <button
                type="button"
                onClick={() => {
                  setSelected({
                    investorId: selectedMajorWithMinors.investor_id,
                    investorName: selectedMajorWithMinors.name || selectedMajorWithMinors.investor_name || '—',
                    investorAddress: `${selectedMajorWithMinors.address1 || ''} ${selectedMajorWithMinors.address2 || ''} ${selectedMajorWithMinors.address3 || ''}`.trim() || '—',
                    pinCode: selectedMajorWithMinors.pin || '',
                    pan: selectedMajorWithMinors.pan || '',
                    email: selectedMajorWithMinors.email || '',
                    mobile: selectedMajorWithMinors.mobile != null && selectedMajorWithMinors.mobile !== '' ? String(selectedMajorWithMinors.mobile) : ''
                  })
                }}
                className="text-caption font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]"
              >
                Use parent ({selectedMajorWithMinors.name || selectedMajorWithMinors.investor_id}) instead
              </button>
            </div>
          )}
          </Card>
        </div>
      )}

      <div ref={continueButtonsRef} className="flex flex-wrap gap-3 mt-6">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button
          variant="primary"
          onClick={() => onFound({ investorId: selected ? selected.investorId : '', info: selected || null })}
          disabled={!selected}
        >
          Continue
        </Button>
      </div>
      </Card>
    </div>
  )
}

// StepProductType, StepProduct, and StepFinal components have been moved to separate files in receipt-steps/ folder

export default function MultiStepReceipt({ draftData = null, draftId = null }) {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState(1)
  const [empSeed, setEmpSeed] = useState({ empCode: '', employeeName: '', branch: '', branch_name: '', branch_code: '' })
  const [investorSeed, setInvestorSeed] = useState({ investorId: '', investorInfo: null })
  const [productTypeSeed, setProductTypeSeed] = useState('')
  const [mfSchemeSeed, setMfSchemeSeed] = useState(null) // Stores selectedAmc, selectedScheme, hasExistingFolio, folioNumber
  const [investmentTypeSeed, setInvestmentTypeSeed] = useState('')
  const [fdIssuerSeed, setFdIssuerSeed] = useState(null)
  const [fdSchemeSeed, setFdSchemeSeed] = useState(null)
  const [ncdBondIssuerSeed, setNcdBondIssuerSeed] = useState(null)
  const [ncdBondSchemeSeed, setNcdBondSchemeSeed] = useState(null)
  const [insuranceIssuerSeed, setInsuranceIssuerSeed] = useState(null)
  const [insuranceProductSeed, setInsuranceProductSeed] = useState(null)
  const [transactionDetailsSeed, setTransactionDetailsSeed] = useState(null)
  const [fdDetailsSeed, setFdDetailsSeed] = useState(null)
  const [bondDetailsSeed, setBondDetailsSeed] = useState(null)
  const [insuranceDetailsSeed, setInsuranceDetailsSeed] = useState(null)
  const [miscDetailsSeed, setMiscDetailsSeed] = useState(null)
  const [finalData, setFinalData] = useState(null)
  const [supportingDocuments, setSupportingDocuments] = useState([])
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
  const [failureDraftId, setFailureDraftId] = useState(null)
  const [hasAppliedDraft, setHasAppliedDraft] = useState(false)
  const [recentReceipts, setRecentReceipts] = useState([])
  const [recentLoading, setRecentLoading] = useState(false)
  const [receiptPresets, setReceiptPresets] = useState({})
  const [usePreset, setUsePreset] = useState(true)
  const [presetPaymentMode, setPresetPaymentMode] = useState('')
  const [duplicateOverrideKey, setDuplicateOverrideKey] = useState(null)
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftSavedMessage, setDraftSavedMessage] = useState('')

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

  const presetsStorageKey = useMemo(() => {
    const emp = user?.emp_code || user?.id || 'unknown'
    const branch = (user?.branch || user?.branch_name || 'branch').toString().replace(/\s+/g, '_')
    return `receipt_presets_${emp}_${branch}`
  }, [user])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(presetsStorageKey)
      setReceiptPresets(raw ? JSON.parse(raw) : {})
    } catch {
      setReceiptPresets({})
    }
  }, [presetsStorageKey])

  const savePreset = useCallback((preset) => {
    if (!preset?.productType) return
    const next = { ...receiptPresets, [preset.productType]: preset }
    setReceiptPresets(next)
    localStorage.setItem(presetsStorageKey, JSON.stringify(next))
  }, [receiptPresets, presetsStorageKey])

  useEffect(() => {
    if (!token) return
    const loadRecent = async () => {
      setRecentLoading(true)
      try {
        const result = await api.getRecentReceipts(token, 10)
        setRecentReceipts(Array.isArray(result.items) ? result.items : [])
      } catch (err) {
        console.error('Failed to load recent receipts:', err)
        setRecentReceipts([])
      } finally {
        setRecentLoading(false)
      }
    }
    loadRecent()
  }, [token])

  const recentInvestors = useMemo(() => {
    const map = new Map()
    recentReceipts.forEach(r => {
      if (r.investor_id && !map.has(r.investor_id)) {
        map.set(r.investor_id, { investorId: r.investor_id, investorName: r.investor_name })
      }
    })
    return Array.from(map.values())
  }, [recentReceipts])

  const recentIssuersByType = useMemo(() => {
    const result = { MF: [], FD: [], BOND: [], INS: [] }
    const seen = { MF: new Set(), FD: new Set(), BOND: new Set(), INS: new Set() }
    recentReceipts.forEach(r => {
      if (r.product_category === 'MF' && r.amc_code && !seen.MF.has(r.amc_code)) {
        seen.MF.add(r.amc_code)
        result.MF.push({ amc_code: r.amc_code, amc_name: r.amc_name })
      }
      if (r.product_category === 'FD' && r.fd_issuer_key && !seen.FD.has(r.fd_issuer_key)) {
        seen.FD.add(r.fd_issuer_key)
        result.FD.push({ _key: r.fd_issuer_key, short_name: r.fd_issuer_name })
      }
      if (r.product_category === 'BOND' && r.bond_issuer_key && !seen.BOND.has(r.bond_issuer_key)) {
        seen.BOND.add(r.bond_issuer_key)
        result.BOND.push({ _key: r.bond_issuer_key, short_name: r.bond_issuer_name })
      }
      if (r.product_category === 'INS' && r.insurance_issuer_key && !seen.INS.has(r.insurance_issuer_key)) {
        seen.INS.add(r.insurance_issuer_key)
        result.INS.push({ _key: r.insurance_issuer_key, short_name: r.issuer_company || r.issuerCompany })
      }
    })
    return result
  }, [recentReceipts])

  const recentSchemesByType = useMemo(() => {
    const result = { MF: [], FD: [], BOND: [], INS: [] }
    const seen = { MF: new Set(), FD: new Set(), BOND: new Set(), INS: new Set() }
    recentReceipts.forEach(r => {
      if (r.product_category === 'MF' && r.scheme_code && !seen.MF.has(r.scheme_code)) {
        seen.MF.add(r.scheme_code)
        result.MF.push({ scheme_code: r.scheme_code, scheme_name: r.scheme_name })
      }
      if (r.product_category === 'FD' && r.fd_scheme_id && !seen.FD.has(r.fd_scheme_id)) {
        seen.FD.add(r.fd_scheme_id)
        result.FD.push({ scheme_id: r.fd_scheme_id, scheme_name: r.fd_scheme_name })
      }
      if (r.product_category === 'BOND' && r.bond_scheme_id && !seen.BOND.has(r.bond_scheme_id)) {
        seen.BOND.add(r.bond_scheme_id)
        result.BOND.push({
          scheme_id: r.bond_scheme_id,
          scheme_name: r.bond_scheme_name,
          issuer_key: r.bond_issuer_key
        })
      }
      if (r.product_category === 'INS' && r.insurance_product_id && !seen.INS.has(r.insurance_product_id)) {
        seen.INS.add(r.insurance_product_id)
        result.INS.push({ product_id: r.insurance_product_id, product_name: r.scheme_name })
      }
    })
    return result
  }, [recentReceipts])

  useEffect(() => {
    if (!draftData || hasAppliedDraft) return

    setEmpSeed(draftData.empSeed || empSeed)
    setInvestorSeed(draftData.investorSeed || investorSeed)
    setProductTypeSeed(draftData.productTypeSeed || '')
    setMfSchemeSeed(
      draftData.mfSchemeSeed
        ? {
            ...draftData.mfSchemeSeed,
            selectedAmcCategory: getAmcCategoryById(
              draftData.mfSchemeSeed.selectedAmcCategory?.id || 'MF',
              mergeCategoryMinimums({})
            )
          }
        : null
    )
    ;(async () => {
      try {
        const data = await api.getCategoryMinimums()
        const m = data?.minimums && typeof data.minimums === 'object' ? data.minimums : {}
        const enriched = mergeCategoryMinimums(m)
        setMfSchemeSeed((prev) => {
          if (!prev?.selectedAmcCategory?.id) return prev
          return {
            ...prev,
            selectedAmcCategory: getAmcCategoryById(prev.selectedAmcCategory.id, enriched)
          }
        })
      } catch (_) { /* keep draft category without refreshed mins */ }
    })()
    setInvestmentTypeSeed(draftData.investmentTypeSeed || '')
    setFdIssuerSeed(draftData.fdIssuerSeed || null)
    setFdSchemeSeed(draftData.fdSchemeSeed || null)
    setNcdBondIssuerSeed(draftData.ncdBondIssuerSeed || null)
    setNcdBondSchemeSeed(draftData.ncdBondSchemeSeed || null)
    setInsuranceIssuerSeed(draftData.insuranceIssuerSeed || null)
    setInsuranceProductSeed(draftData.insuranceProductSeed || null)
    setFinalData(draftData.finalData || null)
    setFailureDraftId(draftId || null)

    let nextStep =
      draftData.step != null
        ? draftData.step
        : draftData.finalData
          ? getReceiptPreviewStep(draftData.productTypeSeed)
          : 1
    nextStep = normalizeBondDraftStep(nextStep, draftData)
    setStep(nextStep)
    setHasAppliedDraft(true)
  }, [draftData, draftId, hasAppliedDraft, empSeed, investorSeed])

  // Monitor for stuck users - show popup after 2 minutes on same step
  useEffect(() => {
    const previewStep = getReceiptPreviewStep(productTypeSeed || '')
    if (step > 1 && step < previewStep) {
      if (stuckTimer) {
        clearTimeout(stuckTimer)
      }

      const timer = setTimeout(() => {
        setShowFailurePopup(true)
      }, 120000)

      setStuckTimer(timer)

      return () => {
        clearTimeout(timer)
      }
    } else {
      if (stuckTimer) {
        clearTimeout(stuckTimer)
        setStuckTimer(null)
      }
      setShowFailurePopup(false)
    }
  }, [step, productTypeSeed])

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
      receipt_no: genReceiptNo({ branch: empSeed.branch_code || empSeed.branch_name || empSeed.branch, empCode: empSeed.empCode }),
      date: new Date().toISOString().slice(0, 10),
      
      // Employee information
      branch: (empSeed.branch_name || empSeed.branch_code || empSeed.branch || '').toString().trim(),
      branch_name: empSeed.branch_name || null,
      branch_code: empSeed.branch_code || null,
      employee_name: empSeed.employeeName || '',
      emp_code: empSeed.empCode || '',
      
      // Investor information
      investor_id: investorSeed.investorId || '',
      investor_name: '',
      investor_address: '',
      pin_code: '',
      pan: '',
      email: '',
      mobile: ''
    }
    
    // Populate investor info if available
    if (investorSeed.investorInfo) {
      base.investor_name = investorSeed.investorInfo.investorName || ''
      base.investor_address = investorSeed.investorInfo.investorAddress || ''
      base.pin_code = investorSeed.investorInfo.pinCode || ''
      base.pan = investorSeed.investorInfo.pan || ''
      base.email = investorSeed.investorInfo.email || ''
      base.mobile = investorSeed.investorInfo.mobile != null && investorSeed.investorInfo.mobile !== ''
        ? String(investorSeed.investorInfo.mobile).replace(/\D/g, '')
        : ''
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
    const mfCategory = mfSchemeSeed.selectedAmcCategory?.id || 'MF'
    const requestedTxnType = transactionData.txn_type || (investmentTypeSeed === 'Switch Over' ? 'Switch Over' : investmentTypeSeed) || null
    const allowedTxnTypes = getAllowedMfTxnTypesByCategory(mfCategory)
    const safeTxnType = allowedTxnTypes.includes(requestedTxnType) ? requestedTxnType : allowedTxnTypes[0]
    
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
      
      // MF AMC category (SIF, PMS, AIF, GIFT CITY FUNDS; default MF)
      mf_amc_category: mfCategory,
      mf_amc_category_min_investment:
        mfSchemeSeed.selectedScheme?.min_investment != null && mfSchemeSeed.selectedScheme?.min_investment !== ''
          ? Number(mfSchemeSeed.selectedScheme.min_investment)
          : mfSchemeSeed.selectedAmcCategory?.minInvestment ?? null,
      
      // Investment details
      investment_amount: transactionData.investment_amount || transactionData.investmentAmount || null,
      txn_type: safeTxnType,
      
      // Folio information
      has_existing_folio: mfSchemeSeed.hasExistingFolio || false,
      folio_number: mfSchemeSeed.folioNumber || null,
      folio_policy_no: mfSchemeSeed.folioNumber || null,
      
      // SIP fields (if applicable)
      ...(safeTxnType === 'SIP' && {
        sip_frequency: transactionData.sip_frequency || null,
        sip_start_date: transactionData.sip_start_date || null,
        sip_end_date: transactionData.sip_end_date || null,
        sip_is_perpetual: transactionData.sip_is_perpetual || false
      }),
      
      // SWP fields (if applicable)
      ...(safeTxnType === 'SWP' && {
        swp_frequency: transactionData.swp_frequency || null,
        swp_start_date: transactionData.swp_start_date || null,
        swp_amount: transactionData.swp_amount || null
      }),
      
      // STP fields (if applicable)
      ...(safeTxnType === 'STP' && {
        stp_target_scheme_code: transactionData.stp_target_scheme_code || null,
        stp_target_scheme_name: transactionData.stp_target_scheme_name || null,
        stp_frequency: transactionData.stp_frequency || null,
        stp_start_date: transactionData.stp_start_date || null,
        stp_amount: transactionData.stp_amount || null,
        stp_original_amount: transactionData.stp_original_amount || null
      }),
      
      // Switch Over fields (if applicable)
      ...(safeTxnType === 'Switch Over' && {
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
      fd_maturity_date: fdData.fd_maturity_date || null,
      
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
      bond_category: bondData.bond_category || null,
      bond_sub_category: bondData.bond_sub_category || null,
      scheme_name: bondData.bond_scheme_name || null,
      bond_isin: bondData.bond_isin || null,
      bond_coupon_rate: bondData.bond_coupon_rate || null,
      bond_face_value: bondData.bond_face_value || null,
      bond_issue_date: bondData.bond_issue_date || null,
      bond_maturity_date: bondData.bond_maturity_date || null,
      bond_tenure_months:
        bondData.bond_tenure_months != null && bondData.bond_tenure_months !== ''
          ? Number(bondData.bond_tenure_months)
          : null,
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

  const saveToServer = async (dataToSave) => {
    if (!token) {
      setSaveError('Not authenticated')
      return
    }

    // Use the payload passed from StepFinal (includes payment fields); fallback to state finalData
    const payload = dataToSave != null ? dataToSave : finalData
    if (!payload) {
      setSaveError('No data to save')
      return
    }

    setIsSaving(true)
    setSaveError('')

    try {
      // Validate and sanitize data before sending
      const validation = validateDataSize(payload)
      if (!validation.isValid) {
        setSaveError(`Data validation failed: ${validation.error}`)
        return
      }

      // Sanitize data to prevent field truncation
      const sanitizedData = sanitizeReceiptData(payload)
      
      console.log(`Sending data size: ${(validation.sizeInBytes / 1024).toFixed(2)}KB`)

      // Duplicate check (allow second attempt to proceed)
      const duplicateKey = [
        sanitizedData.investor_id,
        sanitizedData.product_category,
        sanitizedData.investment_amount,
        sanitizedData.date
      ].join('|')
      if (duplicateOverrideKey !== duplicateKey) {
        try {
          const duplicateCheck = await api.checkReceiptDuplicate(token, {
            investor_id: sanitizedData.investor_id,
            product_category: sanitizedData.product_category,
            investment_amount: sanitizedData.investment_amount,
            date: sanitizedData.date,
            scheme_code: sanitizedData.scheme_code,
            scheme_name: sanitizedData.scheme_name,
            issuer_company: sanitizedData.issuer_company,
            fd_issuer_key: sanitizedData.fd_issuer_key,
            fd_scheme_id: sanitizedData.fd_scheme_id,
            bond_issuer_key: sanitizedData.bond_issuer_key,
            bond_scheme_id: sanitizedData.bond_scheme_id,
            insurance_issuer_key: sanitizedData.insurance_issuer_key,
            insurance_product_id: sanitizedData.insurance_product_id
          })
          if (duplicateCheck?.duplicate) {
            setSaveError('Possible duplicate found for today. Click Save again to confirm.')
            setDuplicateOverrideKey(duplicateKey)
            return
          }
        } catch (dupError) {
          console.warn('Duplicate check failed:', dupError)
        }
      }
      
      const files = Array.isArray(supportingDocuments) ? supportingDocuments : (supportingDocuments ? [supportingDocuments] : [])
      
      // First, create the receipt without uploading files to avoid large multipart payload issues
      let result
      if (user?.role === 'branch' && user?.branch_code) {
        // Branch users can use branch-specific endpoint
        result = await api.createBranchReceipt(token, user.branch_code, sanitizedData)
      } else {
        // All other users (employees, admins) use regular receipt creation
        result = await api.createReceipt(token, sanitizedData)
      }
      
      const receiptId = result.id || result.receiptNo || result.receipt_id || result._key || 'Unknown'

      // Upload supporting documents only after the receipt exists (sequential, like Drive: save then attach)
      if (files.length > 0 && receiptId && receiptId !== 'Unknown') {
        try {
          toast.info(`Uploading ${files.length} file(s)…`)
          const uploadResult = await api.uploadReceiptMedia(token, receiptId, files)
          // Backend returns { message, files: [...] }; use files.length; if shape is missing, assume all saved
          const uploadedCount = (uploadResult && Array.isArray(uploadResult.files))
            ? uploadResult.files.length
            : files.length

          if (uploadedCount < files.length) {
            console.warn('Not all supporting documents were saved for receipt', {
              receiptId,
              attempted: files.length,
              saved: uploadedCount
            })
            localStorage.setItem(
              'receipt_upload_error',
              `Some supporting documents may not have been saved (saved ${uploadedCount} of ${files.length}).`
            )
          }
        } catch (uploadErr) {
          console.error('Supporting document upload failed:', uploadErr)
          // Keep receipt saved; show a non-blocking warning message alongside success toast
          localStorage.setItem('receipt_upload_error', uploadErr.message || 'Failed to upload supporting documents')
        }
      }
      
      // Show success message and store in localStorage for toast
      const successId = receiptId
      const successMessage = `Receipt saved successfully! Receipt ID: ${successId}`
      
      // Store success message in localStorage for toast notification
      localStorage.setItem('receipt_success_message', successMessage)
      localStorage.setItem('receipt_success_timestamp', Date.now().toString())
      localStorage.setItem('receipt_force_refresh', 'true')
      
      // Reset form after successful save
      localStorage.removeItem('failed_receipt_draft_id')
      setDuplicateOverrideKey(null)
      setStep(1)
      setEmpSeed({ empCode: '', employeeName: '', branch: '', branch_name: '', branch_code: '' })
      setInvestorSeed({ investorId: '', investorInfo: null })
      setProductTypeSeed('')
      setInvestmentTypeSeed('')
      setInsuranceIssuerSeed(null)
      setInsuranceProductSeed(null)
      setFinalData(null)
      setSupportingDocuments([])
      setSaveError('')
      setSaveErrorObj(null)
      setFailureScreenshot(null)
      setFailureDetails(null)
      setFailureDraftId(null)
      
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

      // Save failed receipt draft to server for recovery
      try {
        const draftPayload = {
          draft_data: {
            draft_version: 1,
            step,
            productTypeSeed,
            empSeed,
            investorSeed,
            mfSchemeSeed,
            investmentTypeSeed,
            fdIssuerSeed,
            fdSchemeSeed,
            ncdBondIssuerSeed,
            ncdBondSchemeSeed,
            insuranceIssuerSeed,
            insuranceProductSeed,
            finalData
          },
          source: 'failed_receipt',
          error_message: errorMessage
        }
        const draftResult = await api.createReceiptDraft(token, draftPayload)
        const draftId = draftResult?.draft_id || draftResult?.id || null
        if (draftId) {
          setFailureDraftId(draftId)
          localStorage.setItem('failed_receipt_draft_id', draftId)
        }
      } catch (draftError) {
        console.error('Failed to save receipt draft:', draftError)
        try {
          localStorage.setItem('failed_receipt_draft_local', JSON.stringify({
            draft_payload: {
              draft_data: {
                draft_version: 1,
                step,
                productTypeSeed,
                empSeed,
                investorSeed,
                mfSchemeSeed,
                investmentTypeSeed,
                fdIssuerSeed,
                fdSchemeSeed,
                ncdBondIssuerSeed,
                ncdBondSchemeSeed,
                insuranceIssuerSeed,
                insuranceProductSeed,
                finalData
              },
              source: 'failed_receipt',
              error_message: errorMessage
            },
            saved_at: new Date().toISOString()
          }))
        } catch (localError) {
          console.error('Failed to store local receipt draft:', localError)
        }
      }
      
      // Show error message to user
      setSaveSuccess('')
      
      // Show failure popup instead of navigating immediately
      setShowFailurePopup(true)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveToDraft = async () => {
    if (!token) return
    setSavingDraft(true)
    setDraftSavedMessage('')
    try {
      const draftPayload = {
        draft_data: {
          draft_version: 1,
          step,
          productTypeSeed,
          empSeed,
          investorSeed,
          mfSchemeSeed,
          investmentTypeSeed,
          fdIssuerSeed,
          fdSchemeSeed,
          ncdBondIssuerSeed,
          ncdBondSchemeSeed,
          insuranceIssuerSeed,
          insuranceProductSeed,
          finalData
        },
        source: 'manual_save',
        error_message: null
      }
      const result = await api.createReceiptDraft(token, draftPayload)
      const draftId = result?.draft_id || result?.id || null
      if (draftId) {
        localStorage.setItem('failed_receipt_draft_id', draftId)
        setDraftSavedMessage('Draft saved. You can resume from Transaction History anytime.')
        localStorage.setItem('receipt_force_refresh', 'true')
      }
    } catch (err) {
      console.error('Save to draft failed:', err)
      setDraftSavedMessage('Failed to save draft: ' + (err.message || 'Please try again.'))
    } finally {
      setSavingDraft(false)
    }
  }

  return (
    <div className="relative w-full min-w-0 max-w-6xl mx-auto">
      {/* Failure Popup */}
      {showFailurePopup && (
        <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 px-0 sm:px-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="rounded-card shadow-glow border border-[var(--stroke)] bg-[var(--card-bg)] p-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  saveError ? 'bg-[var(--error-muted)]' : 'bg-[var(--accent-muted)]'
                }`}>
                  <FiAlertCircle className={`w-5 h-5 ${saveError ? 'text-[var(--error)]' : 'text-[var(--accent)]'}`} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-body font-semibold text-[var(--text-primary)] mb-1">
                  {saveError ? 'Receipt Creation Failed' : 'Feeling Stuck?'}
                </h3>
                <p className="text-caption text-[var(--text-muted)] mb-3">
                  {saveError 
                    ? (failureDraftId 
                        ? 'Your progress has been saved as a draft. Resume from Transaction History or Create Receipt later.'
                        : 'We encountered an issue while creating your receipt. Would you like to report this problem?')
                    : 'It looks like you\'ve been on this step for a while. Are you having trouble understanding what to do next or unable to proceed? We\'re here to help!'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {saveError && failureDraftId && (
                    <button
                      onClick={() => {
                        setShowFailurePopup(false)
                        navigate(`/receipts?draftId=${failureDraftId}`)
                      }}
                      className="px-3 py-2 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-caption font-medium transition-colors"
                    >
                      Resume later
                    </button>
                  )}
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
                          setFailureDetails({ ...failureInfo, receipt_draft_id: failureDraftId })
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
                          setFailureDetails({ ...failureInfo, receipt_draft_id: failureDraftId })
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
                    className="flex-1 px-3 py-2 rounded-full bg-[var(--error)] hover:bg-[var(--error)]/90 disabled:opacity-50 text-white text-caption font-medium flex items-center justify-center space-x-1 disabled:cursor-not-allowed transition-colors"
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
                    className="px-3 py-2 rounded-full border border-[var(--stroke)] text-[var(--text-primary)] text-caption font-medium hover:bg-[var(--card-hover)] transition-colors"
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
                className="flex-shrink-0 p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)] transition-colors"
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
          screenshot: failureScreenshot,
          receipt_draft_id: failureDetails.receipt_draft_id || null
        } : null}
      />

      {step < 999 && (
        <StepHeader step={step} productType={productTypeSeed} />
      )}

      {/* Main column has min width; preview grows to use remaining space (no empty strip on the right) */}
      <div className="lg:grid lg:grid-cols-[minmax(560px,1fr)_minmax(200px,16rem)] lg:gap-6 lg:items-start">
        <div
          className={`space-y-4 ${isOnReceiptPreviewStep(step, productTypeSeed, !!finalData) ? 'lg:col-span-2' : ''}`}
        >
      {!isOnReceiptPreviewStep(step, productTypeSeed, !!finalData) && (
        <div className="lg:hidden">
        <LivePreview
          empSeed={empSeed}
          investorSeed={investorSeed}
          productTypeSeed={productTypeSeed}
          mfSchemeSeed={mfSchemeSeed}
          fdIssuerSeed={fdIssuerSeed}
          fdSchemeSeed={fdSchemeSeed}
          ncdBondIssuerSeed={ncdBondIssuerSeed}
          ncdBondSchemeSeed={ncdBondSchemeSeed}
          insuranceIssuerSeed={insuranceIssuerSeed}
          insuranceProductSeed={insuranceProductSeed}
          finalData={finalData}
          draftId={draftId}
        />
        </div>
      )}

      {/* Save to draft - shown during receipt creation (before preview step) */}
      {step >= 2 && step < getReceiptPreviewStep(productTypeSeed || '') && (
        <Card padding="sm" className="mb-2 border-0 shadow-none bg-transparent">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-caption text-[var(--text-muted)]">
              Save your progress and resume later from Transaction History.
            </p>
            <div className="flex items-center gap-2">
              {draftSavedMessage && (
                <span className="text-caption text-[var(--success)]">{draftSavedMessage}</span>
              )}
              <Button
                variant="secondary"
                icon={<FiSave className="w-4 h-4" />}
                onClick={handleSaveToDraft}
                disabled={savingDraft}
              >
                {savingDraft ? 'Saving...' : 'Save to draft'}
              </Button>
            </div>
          </div>
        </Card>
      )}

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
          recentInvestors={recentInvestors}
        />
      )}

      {step === 3 && (
        <StepProductType
          onBack={() => setStep(2)}
          usePreset={usePreset}
          onTogglePreset={setUsePreset}
          presetsByType={receiptPresets}
          initialType={productTypeSeed}
          onNext={async (type) => { 
            if (type !== productTypeSeed) {
              setTransactionDetailsSeed(null)
              setFdDetailsSeed(null)
              setBondDetailsSeed(null)
              setInsuranceDetailsSeed(null)
              setMiscDetailsSeed(null)
              setFinalData(null)
            }
            setProductTypeSeed(type)
            const preset = receiptPresets[type]
            if (usePreset && preset) {
              if (preset.productType === 'MF') {
                let mins = {}
                try {
                  const data = await api.getCategoryMinimums()
                  mins = data?.minimums && typeof data.minimums === 'object' ? data.minimums : {}
                } catch (_) { /* use empty → mergeCategoryMinimums fills nulls */ }
                const enriched = mergeCategoryMinimums(mins)
                const mfAmcCat = getAmcCategoryById(preset.mf_amc_category || 'MF', enriched)
                setMfSchemeSeed({
                  selectedAmcCategory: mfAmcCat,
                  selectedAmc: { amc_code: preset.amc_code, amc_name: preset.amc_name },
                  selectedScheme: { scheme_code: preset.scheme_code, scheme_name: preset.scheme_name, display_name: preset.scheme_name },
                  hasExistingFolio: false,
                  folioNumber: null
                })
              } else if (preset.productType === 'FD') {
                setFdIssuerSeed({ _key: preset.issuer_key, issuer_key: preset.issuer_key, short_name: preset.issuer_name, legal_name: preset.issuer_name })
                setFdSchemeSeed({ scheme_id: preset.scheme_id, scheme_name: preset.scheme_name })
              } else if (preset.productType === 'BOND') {
                setNcdBondIssuerSeed({ _key: preset.issuer_key, issuer_key: preset.issuer_key, short_name: preset.issuer_name, legal_name: preset.issuer_name })
                setNcdBondSchemeSeed({ scheme_id: preset.scheme_id, scheme_name: preset.scheme_name })
              } else if (preset.productType === 'INS') {
                setInsuranceIssuerSeed({ _key: preset.issuer_key, short_name: preset.issuer_name, legal_name: preset.issuer_name })
                setInsuranceProductSeed({ product_id: preset.product_id, product_name: preset.product_name })
              }
              setPresetPaymentMode(preset.payment_mode || '')
            } else {
              setPresetPaymentMode('')
            }
            // MF, FD, GOVT_FD, BOND, INS, and MISC go through special flows
            if (type === 'MF') {
              setStep(4)
            } else if (type === 'FD') {
              setStep(4) // FD also starts at step 4 (FD Issuer selection; excludes Government Schemes)
            } else if (type === 'GOVT_FD') {
              setFdIssuerSeed(null)
              setFdSchemeSeed(null)
              setStep(4) // Government Schemes: step 4 = Government issuer selection
            } else if (type === 'BOND') {
              setStep(4) // BOND also starts at step 4 (NCD/Bond Issuer selection)
            } else if (type === 'INS') {
              setStep(4) // INS also starts at step 4 (Insurance Product selection)
            } else if (type === 'MISC') {
              setStep(4) // MISC starts at step 4 (Misc Details)
            } else {
              setStep(999) // Skip to old flow for other types
            }
          }}
        />
      )}

      {/* FD Flow (excludes Government Schemes) */}
      {step === 4 && productTypeSeed === 'FD' && (
        <StepFDIssuer
          onBack={() => setStep(3)}
          onNext={(issuer) => {
            setFdIssuerSeed(issuer)
            setStep(5)
          }}
          token={token}
          governmentOnly={false}
          initialIssuerKey={fdIssuerSeed?._key || fdIssuerSeed?.issuer_key || receiptPresets.FD?.issuer_key || ''}
          recentIssuers={recentIssuersByType.FD}
        />
      )}

      {/* Government Schemes Flow (only Government/Post Office issuers from FD Scheme Management) */}
      {step === 4 && productTypeSeed === 'GOVT_FD' && (
        <StepFDIssuer
          onBack={() => setStep(3)}
          onNext={(issuer) => {
            setFdIssuerSeed(issuer)
            setStep(5)
          }}
          token={token}
          governmentOnly={true}
          initialIssuerKey={fdIssuerSeed?._key || fdIssuerSeed?.issuer_key || ''}
          recentIssuers={[]}
        />
      )}

      {step === 5 && (productTypeSeed === 'FD' || productTypeSeed === 'GOVT_FD') && fdIssuerSeed && (
        <StepFDScheme
          onBack={() => setStep(4)}
          onNext={(scheme) => {
            setFdSchemeSeed(scheme)
            setStep(6)
          }}
          token={token}
          issuer={fdIssuerSeed}
          initialSchemeId={fdSchemeSeed?.scheme_id || (productTypeSeed === 'FD' ? receiptPresets.FD?.scheme_id : '') || ''}
          recentSchemes={productTypeSeed === 'GOVT_FD' ? [] : recentSchemesByType.FD}
        />
      )}

      {step === 6 && (productTypeSeed === 'FD' || productTypeSeed === 'GOVT_FD') && fdSchemeSeed && (
        <StepFDDetails
          onBack={() => setStep(5)}
          onNext={(fdData) => {
            setFdDetailsSeed(fdData._formState || null)
            const cleanReceipt = buildFDReceipt(fdData)
            setFinalData(cleanReceipt)
            setStep(7)
          }}
          token={token}
          issuer={fdIssuerSeed}
          scheme={fdSchemeSeed}
          isGovtScheme={productTypeSeed === 'GOVT_FD'}
          initialData={fdDetailsSeed}
        />
      )}

      {/* NCD/Bond Flow */}
      {step === 4 && productTypeSeed === 'BOND' && (
        <StepNCDBondIssuer
          onBack={() => setStep(3)}
          onNext={(issuer, scheme) => {
            setNcdBondIssuerSeed(issuer)
            setNcdBondSchemeSeed(scheme)
            setStep(5)
          }}
          token={token}
          initialIssuerKey={ncdBondIssuerSeed?._key || ncdBondIssuerSeed?.issuer_key || receiptPresets.BOND?.issuer_key || ''}
          initialSchemeId={ncdBondSchemeSeed?.scheme_id || receiptPresets.BOND?.scheme_id || ''}
          recentSchemes={recentSchemesByType.BOND}
        />
      )}

      {step === 5 && productTypeSeed === 'BOND' && ncdBondIssuerSeed && ncdBondSchemeSeed && (
        <StepNCDBondDetails
          onBack={() => setStep(4)}
          onNext={(bondData) => {
            setBondDetailsSeed(bondData._formState || null)
            const cleanReceipt = buildNCDBondReceipt(bondData)
            setFinalData(cleanReceipt)
            setStep(6)
          }}
          token={token}
          issuer={ncdBondIssuerSeed}
          scheme={ncdBondSchemeSeed}
          initialData={bondDetailsSeed}
        />
      )}

      {/* Insurance Flow */}
      {step === 4 && productTypeSeed === 'INS' && (
        <StepInsuranceIssuer
          onBack={() => setStep(3)}
          onNext={(issuer) => {
            setInsuranceIssuerSeed(issuer)
            setInsuranceProductSeed(null)
            setStep(5)
          }}
          token={token}
          initialIssuerKey={insuranceIssuerSeed?._key || receiptPresets.INS?.issuer_key || ''}
          initialCategory={insuranceProductSeed?.category || receiptPresets.INS?.category || ''}
          recentIssuers={recentIssuersByType.INS}
        />
      )}

      {step === 5 && productTypeSeed === 'INS' && insuranceIssuerSeed && (
        <StepInsuranceProduct
          onBack={() => setStep(4)}
          onNext={(product) => {
            setInsuranceProductSeed(product)
            setStep(6)
          }}
          token={token}
          issuer={insuranceIssuerSeed}
          initialProductId={insuranceProductSeed?.product_id || receiptPresets.INS?.product_id || ''}
          recentProducts={recentSchemesByType.INS}
        />
      )}

      {step === 6 && productTypeSeed === 'INS' && insuranceIssuerSeed && insuranceProductSeed && (
        <StepInsuranceDetails
          onBack={() => setStep(5)}
          onNext={(normalized) => {
            setInsuranceDetailsSeed(normalized._formState || null)
            const { _formState, ...cleanNormalized } = normalized
            const base = buildBase()
            const insuranceAmount = cleanNormalized?.investment_amount ?? cleanNormalized?.investmentAmount ?? null
            const merged = {
              ...base,
              ...cleanNormalized,
              product_category: 'INS',
              investment_amount: insuranceAmount
            }
            setFinalData(merged)
            setStep(7)
          }}
          token={token}
          issuer={insuranceIssuerSeed}
          product={insuranceProductSeed}
          initialData={insuranceDetailsSeed}
        />
      )}

      {step === 4 && productTypeSeed === 'MISC' && (
        <StepMiscDetails
          onBack={() => setStep(3)}
          onNext={(miscData) => {
            setMiscDetailsSeed(miscData._formState || null)
            const { _formState, ...cleanMiscData } = miscData
            const base = buildBase()
            const merged = {
              ...base,
              ...cleanMiscData,
              product_category: 'MISC',
              service_name: miscData.service_name,
              service_price: miscData.service_price,
              investment_amount: miscData.service_price,
              cc: miscData.cc,
              si: miscData.si
            }
            setFinalData(merged)
            setStep(5)
          }}
          token={token}
          initialData={miscDetailsSeed}
        />
      )}

      {step === 4 && productTypeSeed === 'MF' && (
        <StepMFScheme
          onBack={() => setStep(3)}
          onNext={mfData => { 
            setMfSchemeSeed(mfData)
            setStep(5)
          }}
          token={token}
          initialAmcCategoryId={mfSchemeSeed?.selectedAmcCategory?.id || receiptPresets.MF?.mf_amc_category || 'MF'}
          initialAmcCode={mfSchemeSeed?.selectedAmc?.amc_code || receiptPresets.MF?.amc_code || ''}
          initialSchemeCode={mfSchemeSeed?.selectedScheme?.scheme_code || receiptPresets.MF?.scheme_code || ''}
          initialHasExistingFolio={mfSchemeSeed?.hasExistingFolio}
          initialFolioNumber={mfSchemeSeed?.folioNumber || ''}
          recentAmcs={recentIssuersByType.MF}
          recentSchemes={recentSchemesByType.MF}
        />
      )}

      {step === 5 && productTypeSeed === 'MF' && mfSchemeSeed && (
        <StepInvestmentType
          onBack={() => setStep(4)}
          onNext={type => { 
            const mfCat = mfSchemeSeed?.selectedAmcCategory?.id || 'MF'
            const allowed = getAllowedMfTxnTypesByCategory(mfCat)
            if (!allowed.includes(type)) {
              alert(`"${type}" is not allowed for ${mfCat}.`)
              return
            }
            setInvestmentTypeSeed(type)
            setStep(6)
          }}
          productType={productTypeSeed}
          hasExistingFolio={mfSchemeSeed.hasExistingFolio}
          amcCategory={mfSchemeSeed?.selectedAmcCategory?.id || 'MF'}
          initialType={investmentTypeSeed}
        />
      )}

      {step === 6 && productTypeSeed === 'MF' && mfSchemeSeed && investmentTypeSeed && (
        <StepTransactionDetails
          onBack={() => setStep(5)}
          onNext={transactionData => {
            const mfCat = mfSchemeSeed?.selectedAmcCategory?.id || 'MF'
            const allowed = getAllowedMfTxnTypesByCategory(mfCat)
            const effectiveTxnType = transactionData.txn_type || investmentTypeSeed
            if (!allowed.includes(effectiveTxnType)) {
              alert(`"${effectiveTxnType}" is not allowed for ${mfCat}.`)
              setStep(5)
              return
            }
            setTransactionDetailsSeed(transactionData._formState || null)
            const cleanReceipt = buildMFReceipt(transactionData)
            setFinalData(cleanReceipt)
            setStep(7)
          }}
          investmentType={investmentTypeSeed}
          selectedScheme={mfSchemeSeed.selectedScheme}
          selectedAmc={mfSchemeSeed.selectedAmc}
          selectedAmcCategory={mfSchemeSeed.selectedAmcCategory}
          minInvestment={mfSchemeSeed?.selectedScheme?.min_investment ?? mfSchemeSeed?.selectedAmcCategory?.minInvestment ?? null}
          token={token}
          initialData={transactionDetailsSeed}
        />
      )}

      {step === 5 && productTypeSeed === 'MISC' && finalData && (
        <StepFinal 
          data={finalData} 
          onBack={() => setStep(4)} 
          onSave={saveToServer}
          onSavePreset={savePreset}
          presetPaymentMode={presetPaymentMode}
          isSaving={isSaving}
          saveError={saveError}
          saveSuccess={saveSuccess}
          supportingDocuments={supportingDocuments}
          setSupportingDocuments={setSupportingDocuments}
        />
      )}

      {step === 5 && productTypeSeed && productTypeSeed !== 'MF' && productTypeSeed !== 'FD' && productTypeSeed !== 'GOVT_FD' && productTypeSeed !== 'BOND' && productTypeSeed !== 'NCD' && productTypeSeed !== 'INS' && productTypeSeed !== 'MISC' && (
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

      {finalData &&
        ((isBondNcdProductType(productTypeSeed) && step === 6) ||
          (!isBondNcdProductType(productTypeSeed) && step === 7)) && (
        <StepFinal 
          data={finalData} 
          onBack={() => {
            if (isBondNcdProductType(productTypeSeed)) {
              setStep(5)
              return
            }
            const needsDetailsStep = ['MF', 'FD', 'GOVT_FD', 'BOND', 'INS', 'NCD'].includes(productTypeSeed)
            setStep(needsDetailsStep ? 6 : 5)
          }} 
          onSave={saveToServer}
          onSavePreset={savePreset}
          presetPaymentMode={presetPaymentMode}
          isSaving={isSaving}
          saveError={saveError}
          saveSuccess={saveSuccess}
          supportingDocuments={supportingDocuments}
          setSupportingDocuments={setSupportingDocuments}
        />
      )}
        </div>
        {!isOnReceiptPreviewStep(step, productTypeSeed, !!finalData) && (
          <aside className="hidden lg:block lg:sticky lg:top-24 w-full min-w-0">
            <LivePreview
              empSeed={empSeed}
              investorSeed={investorSeed}
              productTypeSeed={productTypeSeed}
              mfSchemeSeed={mfSchemeSeed}
              fdIssuerSeed={fdIssuerSeed}
              fdSchemeSeed={fdSchemeSeed}
              ncdBondIssuerSeed={ncdBondIssuerSeed}
              ncdBondSchemeSeed={ncdBondSchemeSeed}
              insuranceIssuerSeed={insuranceIssuerSeed}
              insuranceProductSeed={insuranceProductSeed}
              finalData={finalData}
              draftId={draftId}
            />
          </aside>
        )}
      </div>
    </div>
  )
}