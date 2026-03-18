/**
 * MF AMC Categories with minimum investment amounts.
 * Used in receipt creation and Scheme Management.
 * All existing schemes default to "MF".
 */
export const MF_AMC_CATEGORIES = [
  { id: 'MF', label: 'MF', minInvestment: null },
  { id: 'SIF', label: 'SIF', minInvestment: 10_00_000 },           // 10 lakhs
  { id: 'PMS', label: 'PMS', minInvestment: 50_00_000 },           // 50 Lakhs
  { id: 'AIF', label: 'AIF', minInvestment: 1_00_00_000 },        // 1 Cr
  { id: 'GIFT_CITY_FUNDS', label: 'GIFT CITY FUNDS', minInvestment: 10_00_00_000 }  // 10 Cr
]

export const VALID_AMC_CATEGORY_IDS = MF_AMC_CATEGORIES.map(c => c.id)

export function getAmcCategoryById(id) {
  return MF_AMC_CATEGORIES.find(c => c.id === id) || MF_AMC_CATEGORIES[0]
}

export function formatMinInvestment(minInvestment) {
  if (minInvestment == null) return '—'
  if (minInvestment >= 1_00_00_000) return `${minInvestment / 1_00_00_000} Cr`
  if (minInvestment >= 1_00_000) return `${minInvestment / 1_00_000} Lakhs`
  return `₹${minInvestment.toLocaleString('en-IN')}`
}
