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
 * Validate customer creation form
 */
export function validateCustomerForm(formData) {
  const errors = []
  
  // Required fields
  const nameValidation = validateRequired(formData.name, 'Customer name')
  if (!nameValidation.valid) errors.push(nameValidation.error)
  
  const emailValidation = validateEmail(formData.email, true)
  if (!emailValidation.valid) errors.push(emailValidation.error)
  
  const mobileValidation = validateMobile(formData.mobile, true)
  if (!mobileValidation.valid) errors.push(mobileValidation.error)
  
  const panValidation = validatePAN(formData.pan, true)
  if (!panValidation.valid) errors.push(panValidation.error)
  
  // Optional fields with format validation
  if (formData.aadhar_number) {
    const aadharValidation = validateAadhar(formData.aadhar_number, false)
    if (!aadharValidation.valid) errors.push(aadharValidation.error)
  }
  
  if (formData.pin) {
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

