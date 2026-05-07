/**
 * Client-side FD rate slab matching — mirrors backend POST /fd-schemes/calculate-rate
 * ([ECS0-Backend/routes/fd-schemes.js]) for bonus label UX before/during API responses.
 */

export function normalizeTenureUnit(u) {
  const v = String(u || '').trim().toLowerCase()
  if (v === 'day' || v === 'days') return 'days'
  return 'months'
}

function normFreq(x) {
  return String(x ?? '').trim()
}

export function payoutMatches(slabFreq, reqFreq) {
  const a = normFreq(slabFreq)
  const b = normFreq(reqFreq)
  if (!a || !b) return false
  return a === b || a.toLowerCase() === b.toLowerCase()
}

/**
 * @param {object} params
 * @param {Array<object>} params.slabs – scheme.rate_slabs
 * @param {string} [params.tenure_unit] – 'months' | 'days'
 * @param {number|string} [params.tenure_value]
 * @param {string} [params.payout_frequency]
 * @returns {object|null} matching slab or null
 */
export function findMatchingFdSlab({ slabs, tenure_unit, tenure_value, payout_frequency }) {
  if (!Array.isArray(slabs) || slabs.length === 0) return null
  const normalizedUnit = normalizeTenureUnit(tenure_unit)
  const resolvedValue = tenure_value != null ? Number(tenure_value) : NaN
  if (!Number.isFinite(resolvedValue) || resolvedValue <= 0) return null
  if (!payout_frequency) return null

  const resolvedUnit = normalizedUnit

  const slab = slabs.find((s) => {
    if (s.is_active === false) return false
    if (!payoutMatches(s.payout_frequency_type, payout_frequency)) return false
    const slabUnit = normalizeTenureUnit(s.tenure_unit)
    if (slabUnit !== resolvedUnit) return false
    if (resolvedUnit === 'days') {
      const min = Number(s.tenure_min_days)
      const max = Number(s.tenure_max_days)
      if (!Number.isFinite(min) || !Number.isFinite(max)) return false
      return min <= resolvedValue && max >= resolvedValue
    }
    const min = Number(s.tenure_min_months)
    const max = Number(s.tenure_max_months)
    if (!Number.isFinite(min) || !Number.isFinite(max)) return false
    return min <= resolvedValue && max >= resolvedValue
  })

  return slab || null
}

export function effectiveBonusBpsFromSlab(slab, scheme, fieldName) {
  const fromSlab = slab?.[fieldName]
  if (Number.isFinite(fromSlab)) return fromSlab
  const fromScheme = scheme?.[fieldName]
  return Number.isFinite(fromScheme) ? fromScheme : 0
}

/** Effective senior/women/renewal BPS for labels (integer bps). */
export function getEffectiveBonusesBps(slab, scheme) {
  return {
    senior_citizen: effectiveBonusBpsFromSlab(slab, scheme, 'senior_citizen_bonus_bps'),
    women: effectiveBonusBpsFromSlab(slab, scheme, 'women_bonus_bps'),
    renewal: effectiveBonusBpsFromSlab(slab, scheme, 'renewal_bonus_bps')
  }
}
