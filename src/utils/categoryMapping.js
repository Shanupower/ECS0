import { getAmcCategoryById } from '../data/mf_amc_categories'

/**
 * Map product category codes to display names
 */
export const categoryDisplayNames = {
  MF: 'Mutual Funds',
  SIF: 'Mutual Funds',
  PMS: 'Mutual Funds',
  AIF: 'Mutual Funds',
  GIFT_CITY_FUNDS: 'Mutual Funds',
  FD: 'Fixed Deposit',
  INS: 'Insurance',
  BOND: 'Bonds/NCD',
  NCD: 'Bonds/NCD',
  GOVT_FD: 'Government Schemes',
  MISC: 'Misc Transactions',
  Other: 'Other',
}

const MF_FAMILY = new Set(['MF', 'SIF', 'PMS', 'AIF', 'GIFT_CITY_FUNDS'])

/**
 * Get display name for a category code
 * @param {string} categoryCode - The category code (MF, FD, INS, BOND, NCD, GOVT_FD, MISC)
 * @returns {string} The display name
 */
export function getCategoryDisplayName(categoryCode) {
  if (!categoryCode) return 'N/A'
  return categoryDisplayNames[categoryCode] || categoryCode
}

/**
 * Product line for history / preview when mf_amc_category refines regulatory bucket (AIF, SIF, etc.).
 * @param {Record<string, unknown>|null|undefined} receipt
 */
export function getReceiptProductCategoryLabel(receipt) {
  if (!receipt) return 'N/A'
  const pc = receipt.product_category
  const sub =
    receipt.mf_amc_category ??
    receipt.mf_details?.amc_category ??
    receipt.product_details?.mf?.amc_category ??
    null
  if (MF_FAMILY.has(String(pc)) && sub && sub !== 'MF') {
    return `Mutual Funds (${getAmcCategoryById(sub).label})`
  }
  if (MF_FAMILY.has(String(pc))) {
    return 'Mutual Funds'
  }
  return getCategoryDisplayName(pc)
}

