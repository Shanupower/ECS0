/**
 * Map product category codes to display names
 */
export const categoryDisplayNames = {
  'MF': 'Mutual Funds',
  'FD': 'Fixed Deposit',
  'INS': 'Insurance',
  'BOND': 'Bonds',
  'Other': 'Other'
}

/**
 * Get display name for a category code
 * @param {string} categoryCode - The category code (MF, FD, INS, BOND)
 * @returns {string} The display name
 */
export function getCategoryDisplayName(categoryCode) {
  if (!categoryCode) return 'N/A'
  return categoryDisplayNames[categoryCode] || categoryCode
}

