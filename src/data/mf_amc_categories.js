/**
 * MF AMC category ids and labels (minimums come from API: GET /api/schemes/category-minimums).
 */
export const MF_AMC_CATEGORIES = [
  { id: 'MF', label: 'MF' },
  { id: 'SIF', label: 'SIF' },
  { id: 'PMS', label: 'PMS' },
  { id: 'AIF', label: 'AIF' },
  { id: 'GIFT_CITY_FUNDS', label: 'GIFT CITY FUNDS' }
]

export const VALID_AMC_CATEGORY_IDS = MF_AMC_CATEGORIES.map((c) => c.id)

/**
 * @param {Record<string, number|null|undefined>|null|undefined} apiMinimums
 * @returns {Array<{ id: string, label: string, minInvestment: number|null }>}
 */
export function mergeCategoryMinimums(apiMinimums) {
  const m = apiMinimums && typeof apiMinimums === 'object' ? apiMinimums : {}
  return MF_AMC_CATEGORIES.map((c) => ({
    ...c,
    minInvestment:
      m[c.id] !== undefined && m[c.id] !== null && m[c.id] !== ''
        ? Number(m[c.id])
        : null
  }))
}

/**
 * @param {string} id
 * @param {Array<{ id: string, label: string, minInvestment?: number|null }>} [enrichedList] from mergeCategoryMinimums()
 */
export function getAmcCategoryById(id, enrichedList) {
  const list =
    enrichedList ||
    MF_AMC_CATEGORIES.map((c) => ({ ...c, minInvestment: null }))
  return list.find((c) => c.id === id) || list[0]
}

export function formatMinInvestment(minInvestment) {
  if (minInvestment == null) return '—'
  if (minInvestment >= 1_00_00_000) return `${minInvestment / 1_00_00_000} Cr`
  if (minInvestment >= 1_00_000) return `${minInvestment / 1_00_000} Lakhs`
  return `₹${minInvestment.toLocaleString('en-IN')}`
}
