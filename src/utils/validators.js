// Frontend validation utilities

// Validation regex patterns
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MOBILE_REGEX = /^[6-9][0-9]{9}$/
const AADHAR_REGEX = /^[0-9]{12}$/
const PIN_REGEX = /^[0-9]{6}$/

/**
 * Validate PAN card number
 * Format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)
 */
export function validatePAN(pan, required = false) {
  if (!pan || pan.trim() === '') {
    return required 
      ? { valid: false, error: 'PAN is required' }
      : { valid: true, value: null }
  }
  
  const trimmed = pan.trim().toUpperCase()
  
  if (!PAN_REGEX.test(trimmed)) {
    return { 
      valid: false, 
      error: 'Invalid PAN format. Expected: ABCDE1234F (5 letters, 4 digits, 1 letter)' 
    }
  }
  
  return { valid: true, value: trimmed }
}

/**
 * Validate email address
 */
export function validateEmail(email, required = false) {
  if (!email || email.trim() === '') {
    return required 
      ? { valid: false, error: 'Email is required' }
      : { valid: true, value: null }
  }
  
  const trimmed = email.trim().toLowerCase()
  
  if (!EMAIL_REGEX.test(trimmed)) {
    return { 
      valid: false, 
      error: 'Invalid email format' 
    }
  }
  
  return { valid: true, value: trimmed }
}

/**
 * Validate mobile number
 * Format: 10 digits starting with 6-9
 */
export function validateMobile(mobile, required = false) {
  if (!mobile || mobile.trim() === '') {
    return required 
      ? { valid: false, error: 'Mobile number is required' }
      : { valid: true, value: null }
  }
  
  const trimmed = mobile.trim().replace(/\s+/g, '')
  
  if (!MOBILE_REGEX.test(trimmed)) {
    return { 
      valid: false, 
      error: 'Invalid mobile number. Must be 10 digits starting with 6-9' 
    }
  }
  
  return { valid: true, value: trimmed }
}

/**
 * Validate Aadhar number
 * Format: 12 digits
 */
export function validateAadhar(aadhar, required = false) {
  if (!aadhar || aadhar.trim() === '') {
    return required 
      ? { valid: false, error: 'Aadhar number is required' }
      : { valid: true, value: null }
  }
  
  const trimmed = aadhar.trim().replace(/\s+/g, '')
  
  if (!AADHAR_REGEX.test(trimmed)) {
    return { 
      valid: false, 
      error: 'Invalid Aadhar number. Must be 12 digits' 
    }
  }
  
  return { valid: true, value: trimmed }
}

/**
 * Validate PIN code
 * Format: 6 digits
 */
export function validatePIN(pin, required = false) {
  if (!pin || pin.trim() === '') {
    return required 
      ? { valid: false, error: 'PIN code is required' }
      : { valid: true, value: null }
  }
  
  const trimmed = pin.trim()
  
  if (!PIN_REGEX.test(trimmed)) {
    return { 
      valid: false, 
      error: 'Invalid PIN code. Must be 6 digits' 
    }
  }
  
  return { valid: true, value: trimmed }
}

/**
 * Validate required field
 */
export function validateRequired(value, fieldName) {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return { 
      valid: false, 
      error: `${fieldName} is required` 
    }
  }
  
  return { valid: true, value: typeof value === 'string' ? value.trim() : value }
}

/**
 * Helper function to normalize values for comparison
 */
function normalizeValue(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    // Sort arrays for consistent comparison
    const sorted = value.map(v => normalizeValue(v)).filter(v => v !== '').sort()
    return sorted.join(',')
  }
  return String(value)
}

/**
 * Normalize branch data for comparison (handles relationship_manager field)
 */
function normalizeBranchForComparison(branches, originalRelationshipManager) {
  // Normalize form branches (array)
  const formBranches = Array.isArray(branches) 
    ? branches.map(b => normalizeValue(b)).filter(b => b !== '').sort()
    : []
  
  // Normalize original relationship_manager (could be string or array)
  const originalBranches = originalRelationshipManager
    ? (Array.isArray(originalRelationshipManager)
        ? originalRelationshipManager.map(b => normalizeValue(b)).filter(b => b !== '').sort()
        : [normalizeValue(originalRelationshipManager)].filter(b => b !== ''))
    : []
  
  return {
    form: formBranches.join(','),
    original: originalBranches.join(',')
  }
}

/**
 * Check if a field value has changed
 */
function hasFieldChanged(newValue, oldValue) {
  return normalizeValue(newValue) !== normalizeValue(oldValue)
}

/**
 * Validate customer creation form
 * @param {Object} formData - The form data to validate
 * @param {boolean} isEdit - Whether this is an edit operation
 * @param {Object} originalData - Original customer data (for edit mode, to detect changes)
 */
export function validateCustomerForm(formData, isEdit = false, originalData = null) {
  const errors = []
  
  // For edits, only validate fields that have actually changed
  // For creates, validate required fields
  
  // Name validation
  if (isEdit && originalData) {
    // For edit: only validate if name has changed AND has a value
    if (hasFieldChanged(formData.name, originalData.name)) {
      // Only validate if the new value is not empty
      if (formData.name && formData.name.trim()) {
        const nameValidation = validateRequired(formData.name, 'Customer name')
        if (!nameValidation.valid) errors.push(nameValidation.error)
      }
      // If changed to empty, that's okay - we don't validate empty fields on edit
    }
  } else if (isEdit) {
    // For edit without original data: only validate if name is provided
    if (formData.name && formData.name.trim()) {
      const nameValidation = validateRequired(formData.name, 'Customer name')
      if (!nameValidation.valid) errors.push(nameValidation.error)
    }
  } else {
    // For create: name is required
    const nameValidation = validateRequired(formData.name, 'Customer name')
    if (!nameValidation.valid) errors.push(nameValidation.error)
  }
  
  // Email validation
  if (isEdit && originalData) {
    // For edit: only validate if email has changed AND has a value
    if (hasFieldChanged(formData.email, originalData.email)) {
      // Only validate if the new value is not empty
      if (formData.email && formData.email.trim()) {
        const emailValidation = validateEmail(formData.email, false)
        if (!emailValidation.valid) errors.push(emailValidation.error)
      }
      // If changed to empty, that's okay - we don't validate empty fields on edit
    }
  } else if (isEdit) {
    // For edit without original data: only validate if email is provided
    if (formData.email && formData.email.trim()) {
      const emailValidation = validateEmail(formData.email, false)
      if (!emailValidation.valid) errors.push(emailValidation.error)
    }
  } else {
    // For create: email is required
    const emailValidation = validateEmail(formData.email, true)
    if (!emailValidation.valid) errors.push(emailValidation.error)
  }
  
  // Mobile validation
  if (isEdit && originalData) {
    // For edit: only validate if mobile has changed AND has a value
    if (hasFieldChanged(formData.mobile, originalData.mobile)) {
      // Only validate if the new value is not empty
      if (formData.mobile && formData.mobile.trim()) {
        const mobileValidation = validateMobile(formData.mobile, false)
        if (!mobileValidation.valid) errors.push(mobileValidation.error)
      }
      // If changed to empty, that's okay - we don't validate empty fields on edit
    }
  } else if (isEdit) {
    // For edit without original data: only validate if mobile is provided
    if (formData.mobile && formData.mobile.trim()) {
      const mobileValidation = validateMobile(formData.mobile, false)
      if (!mobileValidation.valid) errors.push(mobileValidation.error)
    }
  } else {
    // For create: mobile is required
    const mobileValidation = validateMobile(formData.mobile, true)
    if (!mobileValidation.valid) errors.push(mobileValidation.error)
  }
  
  // PAN validation
  if (isEdit && originalData) {
    // For edit: only validate if PAN has changed AND has a value
    if (hasFieldChanged(formData.pan, originalData.pan)) {
      // Only validate if the new value is not empty
      if (formData.pan && formData.pan.trim()) {
        const panValidation = validatePAN(formData.pan, false)
        if (!panValidation.valid) errors.push(panValidation.error)
      }
      // If changed to empty, that's okay - we don't validate empty fields on edit
    }
  } else if (isEdit) {
    // For edit without original data: only validate if PAN is provided
    if (formData.pan && formData.pan.trim()) {
      const panValidation = validatePAN(formData.pan, false)
      if (!panValidation.valid) errors.push(panValidation.error)
    }
  } else {
    // For create: PAN is required
    const panValidation = validatePAN(formData.pan, true)
    if (!panValidation.valid) errors.push(panValidation.error)
  }
  
  // Optional fields with format validation (only validate if changed and provided)
  if (isEdit && originalData) {
    // Only validate if aadhar has changed
    if (hasFieldChanged(formData.aadhar_number, originalData.aadhar_number)) {
      if (formData.aadhar_number && formData.aadhar_number.trim()) {
        const aadharValidation = validateAadhar(formData.aadhar_number, false)
        if (!aadharValidation.valid) errors.push(aadharValidation.error)
      }
    }
  } else if (formData.aadhar_number && formData.aadhar_number.trim()) {
    const aadharValidation = validateAadhar(formData.aadhar_number, false)
    if (!aadharValidation.valid) errors.push(aadharValidation.error)
  }
  
  if (isEdit && originalData) {
    // Only validate if pin has changed
    if (hasFieldChanged(formData.pin, originalData.pin)) {
      if (formData.pin && formData.pin.trim()) {
        const pinValidation = validatePIN(formData.pin, false)
        if (!pinValidation.valid) errors.push(pinValidation.error)
      }
    }
  } else if (formData.pin && formData.pin.trim()) {
    const pinValidation = validatePIN(formData.pin, false)
    if (!pinValidation.valid) errors.push(pinValidation.error)
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get validation pattern for HTML input
 */
export function getPattern(type) {
  switch (type) {
    case 'pan':
      return '[A-Z]{5}[0-9]{4}[A-Z]{1}'
    case 'mobile':
      return '[6-9][0-9]{9}'
    case 'aadhar':
      return '[0-9]{12}'
    case 'pin':
      return '[0-9]{6}'
    default:
      return null
  }
}

/**
 * Get validation title for HTML input
 */
export function getTitle(type) {
  switch (type) {
    case 'pan':
      return 'PAN should be 10 characters: 5 uppercase letters, 4 digits, 1 uppercase letter (e.g., ABCDE1234F)'
    case 'mobile':
      return 'Mobile number should be 10 digits starting with 6-9'
    case 'aadhar':
      return 'Aadhar should be 12 digits'
    case 'pin':
      return 'PIN code should be 6 digits'
    default:
      return ''
  }
}
