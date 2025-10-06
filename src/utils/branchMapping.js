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
  'KUKATPALLY': 'KUKAT PALLY',
  'VIZAG': 'GAJUWAKA', // Database VIZAG maps to employee GAJUWAKA
}

// Normalize branch name from employee list to database format
export function normalizeBranchForDB(branchName) {
  if (!branchName) return branchName
  return BRANCH_MAPPINGS[branchName] || branchName
}

// Convert database branch name to employee list format
export function normalizeBranchForEmployee(branchName) {
  if (!branchName) return branchName
  // Find the key that maps to this value
  const entry = Object.entries(BRANCH_MAPPINGS).find(([key, value]) => value === branchName)
  return entry ? entry[0] : branchName
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
    'SUCHITRA',
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
