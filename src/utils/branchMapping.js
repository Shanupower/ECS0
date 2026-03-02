// Branch name mapping utility to handle inconsistencies between employee list and database

export const BRANCH_MAPPINGS = {
  // Employee list → Database mapping
  'AMEER PET': 'AMEERPET',
  'CHEMBUR - MUMBAI': 'CHEMBUR', 
  'CHENNAI - MADIPAKKAM': 'MADIPAKKAM',
  'CHENNAI RO': 'CHENNAI',
  'KUKAT PALLY': 'KUKATPALLY',
  'GAJUWAKA': 'VIZAG', // GAJUWAKA is VIZAG
  'VIZAG': 'VIZAG', // Keep VIZAG mapping for consistency
  'RAJAHMUNDRY': 'RAJAHMUNDRY', // Missing in DB - needs to be added
  'YAPRAL': 'YAPRAL', // Missing in DB - needs to be added
  
  // Reverse mapping for database → employee list
  'AMEERPET': 'AMEER PET',
  'CHEMBUR': 'CHEMBUR - MUMBAI',
  'MADIPAKKAM': 'CHENNAI - MADIPAKKAM', 
  'CHENNAI': 'CHENNAI RO',
  'TINDIVANAM': 'TINDIVANAM - TAMIL NADU',
  'KUKATPALLY': 'KUKAT PALLY',
  'VIZAG': 'GAJUWAKA', // Database VIZAG maps to employee GAJUWAKA
}

// API Branch mapping - maps from user branch names to API-expected branch names
// Based on actual employee data fetched from the system (24 unique branches)
export const API_BRANCH_MAPPINGS = {
  // Exact matches from employee data
  'AMEER PET': 'AMEERPET',
  'BAGH AMBERPET': 'BAGH AMBERPET',
  'BASHEERBAGH': 'BASHEERBAGH',
  'CHEMBUR - MUMBAI': 'CHEMBUR',
  'CHENNAI - MADIPAKKAM': 'MADIPAKKAM',
  'CHENNAI RO': 'CHENNAI',
  'COIMBATORE': 'COIMBATORE',
  'DILSUKHNAGAR': 'DILSUKHNAGAR',
  'GAJUWAKA': 'GAJUWAKA',
  'H.O': 'HO',
  'HABSIGUDA': 'HABSIGUDA',
  'JAYANAGAR': 'JAYANAGAR',
  'KUKAT PALLY': 'KUKATPALLY',
  'MADHAPUR': 'MADHAPUR',
  'MALKAJGIRI': 'MALKAJGIRI',
  'MALLESWARAM': 'MALLESWARAM',
  'Main Branch': 'HO', // Map to HO as it's likely the main office
  'RAJAHMUNDRY': 'RAJAHMUNDRY',
  'SUCHITRA': 'SUCHITRA',
  'TRIMULGHERRY': 'TRIMULGHERRY',
  'VIJAYAWADA': 'VIJAYAWADA',
  'VIZAG': 'GAJUWAKA', // VIZAG maps to GAJUWAKA
  'WARANGAL': 'WARANGAL',
  'YAPRAL': 'YAPRAL',
  
  // Standardized versions for API calls
  'AMEERPET': 'AMEERPET',
  'CHEMBUR': 'CHEMBUR',
  'CHENNAI': 'CHENNAI',
  'HEADOFFICE': 'HO',
  'HO': 'HO',
  'KUKATPALLY': 'KUKATPALLY',
  'MADIPAKKAM': 'MADIPAKKAM',
  
  // Handle variations and aliases from branches.json
  'BANGALORE_JAYANAGAR': 'JAYANAGAR',
  'BANGALORE-INDIRA NAGAR': 'JAYANAGAR',
  'BANGALORE-MALLESWARAM': 'MALLESWARAM',
  'CHENNAI - R.O.': 'CHENNAI',
  'CHENNAI - ANNA NAGAR': 'CHENNAI',
  'CHENNAI - TAMBARAM': 'CHENNAI',
  'CHENNAI-ROYAPETTAH': 'CHENNAI',
  'CHENNAI - T.NAGAR': 'CHENNAI',
  'VELACHERY': 'CHENNAI',
  'MEHDIPATNAM': 'HABSIGUDA',
  'VANASTHALIPURAM': 'DILSUKHNAGAR',
  'TINDIVANAM - TAMIL NADU': 'TINDIVANAM',
  'TINDIVANAM': 'TINDIVANAM',
  'Thindivam branch': 'TINDIVANAM',
  'KOLKATA': 'CHENNAI',
  'CHANDA NAGAR': 'HABSIGUDA',
  'NELLORE': 'VIJAYAWADA',
  'GUNTUR': 'VIJAYAWADA',
  'SECUNDERABAD': 'SECUNDERABAD',
  'REGD -  HEAD OFFICE': 'HO',
  'HEAD OFFICE Capital Marketing': 'HO',
  'HEAD OFFICE Marketing R.O.T.S.': 'HO',
  'HEAD OFFICE Mutual Funds': 'HO',
  'H.O(WFH)': 'HO',
  'JAYANAGAR(WFH)': 'JAYANAGAR',
  'HEAD-OFFICE': 'HO',
  'HEAD-OFFICE(INSURACE)': 'HO',
  'WFH-(INSURACE)': 'HO',
  
  // Handle specific user input variations
  'madipakkam chennai branch': 'MADIPAKKAM',
  'madipakkam chennai': 'MADIPAKKAM',
  'MADIPAKKAM CHENNAI': 'MADIPAKKAM',
  'chennai madipakkam': 'MADIPAKKAM',
  'main branch': 'HO',
  'head office': 'HO',
  'headoffice': 'HO'
}

// Normalize branch name from employee list to database format
export function normalizeBranchForDB(branchName) {
  if (!branchName) return branchName
  return BRANCH_MAPPINGS[branchName] || branchName
}

// Convert database branch name to employee list format
export function normalizeBranchForEmployee(branchName) {
  if (!branchName) return branchName
  
  // First try BRANCH_MAPPINGS reverse lookup
  const entry = Object.entries(BRANCH_MAPPINGS).find(([key, value]) => value === branchName)
  if (entry) return entry[0]
  
  // Try API_BRANCH_MAPPINGS reverse lookup (more comprehensive)
  // Find all entries where the value matches the DB format
  // This handles cases like SECUNDERABAD -> HABSIGUDA, MEHDIPATNAM -> HABSIGUDA, etc.
  // We check ALL mappings first, even if branchName is in valid branches,
  // to preserve the original selection (e.g., SECUNDERABAD instead of HABSIGUDA)
  const apiEntries = Object.entries(API_BRANCH_MAPPINGS).filter(([key, value]) => 
    value === branchName
  )
  
  if (apiEntries.length > 0) {
    // Filter out entries where key equals value (like HABSIGUDA: HABSIGUDA)
    // when there are other mappings, to prefer more specific ones
    const specificEntries = apiEntries.filter(([key, value]) => key !== value)
    const entriesToUse = specificEntries.length > 0 ? specificEntries : apiEntries
    
    // Prefer entries that are in valid branches list
    const validEntries = entriesToUse.filter(([key]) => getAllValidBranches().includes(key))
    if (validEntries.length > 0) {
      // If multiple valid mappings exist, prefer the one that matches the branchName exactly (case-insensitive)
      const exactMatch = validEntries.find(([key]) => key.toLowerCase() === branchName.toLowerCase())
      if (exactMatch) return exactMatch[0]
      // Otherwise return the first valid mapping (this preserves selections like SECUNDERABAD)
      return validEntries[0][0]
    }
    // If no valid entries, return the first specific mapping (preserves aliases like SECUNDERABAD)
    if (entriesToUse.length > 0) {
      return entriesToUse[0][0]
    }
    // Fallback to first entry if no specific mappings
    return apiEntries[0][0]
  }
  
  // If the branchName is already in employee format, return it
  if (getAllValidBranches().includes(branchName)) {
    return branchName
  }
  
  // Try case-insensitive match in valid branches
  const lowerBranchName = branchName.toLowerCase()
  const validBranch = getAllValidBranches().find(branch => {
    const normalized = normalizeBranchForAPI(branch)
    return normalized.toLowerCase() === lowerBranchName
  })
  if (validBranch) return validBranch
  
  // Fallback: return as-is
  return branchName
}

// Normalize branch name for API calls - maps user branch to API-expected branch name
export function normalizeBranchForAPI(branchName) {
  if (!branchName) return branchName
  
  // First try exact match
  if (API_BRANCH_MAPPINGS[branchName]) {
    return API_BRANCH_MAPPINGS[branchName]
  }
  
  // Try case-insensitive match
  const lowerBranchName = branchName.toLowerCase()
  const entry = Object.entries(API_BRANCH_MAPPINGS).find(([key, value]) => 
    key.toLowerCase() === lowerBranchName
  )
  
  if (entry) {
    return entry[1]
  }
  
  // Try partial matching for common patterns
  // Check if the input contains any of the key branch names
  for (const [key, value] of Object.entries(API_BRANCH_MAPPINGS)) {
    const keyLower = key.toLowerCase()
    if (lowerBranchName.includes(keyLower) || keyLower.includes(lowerBranchName)) {
      return value
    }
  }
  
  // Special handling for common patterns based on actual employee data
  if (lowerBranchName.includes('thindivanam') || lowerBranchName.includes('thindivam')) {
    return 'TINDIVANAM'
  }
  if (lowerBranchName.includes('madipakkam')) {
    return 'MADIPAKKAM'
  }
  if (lowerBranchName.includes('ameerpet') || lowerBranchName.includes('ameer pet')) {
    return 'AMEERPET'
  }
  if (lowerBranchName.includes('chennai') && !lowerBranchName.includes('madipakkam')) {
    return 'CHENNAI'
  }
  if (lowerBranchName.includes('kukatpally') || lowerBranchName.includes('kukat pally')) {
    return 'KUKATPALLY'
  }
  if (lowerBranchName.includes('dilsukhnagar')) {
    return 'DILSUKHNAGAR'
  }
  if (lowerBranchName.includes('habsiguda')) {
    return 'HABSIGUDA'
  }
  if (lowerBranchName.includes('jayanagar')) {
    return 'JAYANAGAR'
  }
  if (lowerBranchName.includes('vijayawada')) {
    return 'VIJAYAWADA'
  }
  if (lowerBranchName.includes('malkajgiri')) {
    return 'MALKAJGIRI'
  }
  if (lowerBranchName.includes('basheerbagh')) {
    return 'BASHEERBAGH'
  }
  if (lowerBranchName.includes('trimulgherry')) {
    return 'TRIMULGHERRY'
  }
  if (lowerBranchName.includes('madhapur')) {
    return 'MADHAPUR'
  }
  if (lowerBranchName.includes('suchitra')) {
    return 'SUCHITRA'
  }
  if (lowerBranchName.includes('warangal')) {
    return 'WARANGAL'
  }
  if (lowerBranchName.includes('coimbatore')) {
    return 'COIMBATORE'
  }
  if (lowerBranchName.includes('chembur')) {
    return 'CHEMBUR'
  }
  if (lowerBranchName.includes('gajuwaka')) {
    return 'GAJUWAKA'
  }
  if (lowerBranchName.includes('malleswaram')) {
    return 'MALLESWARAM'
  }
  if (lowerBranchName.includes('bagh amberpet')) {
    return 'BAGH AMBERPET'
  }
  if (lowerBranchName.includes('rajahemundry') || lowerBranchName.includes('rajahmundry')) {
    return 'RAJAHMUNDRY'
  }
  if (lowerBranchName.includes('yapral')) {
    return 'YAPRAL'
  }
  if (lowerBranchName.includes('vizag')) {
    return 'GAJUWAKA' // VIZAG maps to GAJUWAKA
  }
  if (lowerBranchName.includes('main branch') || lowerBranchName.includes('headoffice') || lowerBranchName.includes('head office') || lowerBranchName.includes('ho')) {
    return 'HO'
  }
  
  // If no mapping found, return the original name
  return branchName
}

// Get all valid branch names for validation
export function getAllValidBranches() {
  return [
    // Employee list branches
    'AMEER PET',
    'BAGH AMBERPET', 
    'BASHEERBAGH',
    'CHEMBUR - MUMBAI',
    'CHENNAI - MADIPAKKAM',
    'CHENNAI RO',
    'COIMBATORE',
    'DILSUKHNAGAR',
    'GAJUWAKA',
    'H.O',
    'HABSIGUDA',
    'HO',
    'JAYANAGAR',
    'KUKAT PALLY',
    'MADHAPUR',
    'MALKAJGIRI',
    'MALLESWARAM',
    'RAJAHMUNDRY',
    'SECUNDERABAD',
    'SUCHITRA',
    'TINDIVANAM - TAMIL NADU',
    'TRIMULGHERRY',
    'VIJAYAWADA',
    'VIZAG',
    'WARANGAL',
    'YAPRAL'
  ]
}

// Validate if branch exists in either employee list or database
export function isValidBranch(branchName) {
  if (!branchName) return false
  const normalized = normalizeBranchForDB(branchName)
  return getAllValidBranches().includes(branchName) || getAllValidBranches().includes(normalized)
}
