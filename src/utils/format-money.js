/** Full Indian currency (₹5,21,32,745). */
export function formatINR(n) {
  const num = Number(n || 0)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number.isFinite(num) ? num : 0)
}

function formatIndianUnit(num, unit) {
  const abs = Math.abs(num)
  let digits = 2
  if (abs >= 100) digits = 0
  else if (abs >= 10) digits = 1
  const formatted = abs.toFixed(digits).replace(/\.?0+$/, '')
  const label = unit === 'crore' || unit === 'lakh' ? unit : unit
  return { formatted, label }
}

/** Compact K suffix (1.5K, 27.5K, 150K). */
function formatKUnit(num) {
  const k = Math.abs(num) / 1_000
  const digits = k >= 100 ? 0 : 1
  return k.toFixed(digits).replace(/\.?0+$/, '')
}

/** Short Indian words: ₹32 crore, ₹7.17 lakh, ₹12.5K. */
export function formatIndianWordsINR(n) {
  const num = Number(n || 0)
  if (!Number.isFinite(num)) return '₹0'
  const abs = Math.abs(num)
  const prefix = num < 0 ? '-' : ''
  if (abs >= 10_000_000) {
    const { formatted, label } = formatIndianUnit(num / 10_000_000, 'crore')
    return `${prefix}₹${formatted} ${label}`
  }
  if (abs >= 100_000) {
    const { formatted, label } = formatIndianUnit(num / 100_000, 'lakh')
    return `${prefix}₹${formatted} ${label}`
  }
  if (abs >= 1_000) {
    return `${prefix}₹${formatKUnit(num)}K`
  }
  return formatINR(num)
}

/** Short count: 27.5K, 1.52 lakh. */
export function formatIndianWordsCount(n) {
  const num = Number(n || 0)
  if (!Number.isFinite(num)) return '0'
  const abs = Math.abs(num)
  const prefix = num < 0 ? '-' : ''
  if (abs >= 10_000_000) {
    const { formatted, label } = formatIndianUnit(num / 10_000_000, 'crore')
    return `${prefix}${formatted} ${label}`
  }
  if (abs >= 100_000) {
    const { formatted, label } = formatIndianUnit(num / 100_000, 'lakh')
    return `${prefix}${formatted} ${label}`
  }
  if (abs >= 1_000) {
    return `${prefix}${formatKUnit(num)}K`
  }
  return new Intl.NumberFormat('en-IN').format(Math.round(num))
}

export const COMPACT_MONEY_THRESHOLD = 100_000
/** Counts from 1,000+ use K / lakh / crore; hover shows exact count. */
export const COMPACT_COUNT_THRESHOLD = 1_000

/** @deprecated use formatIndianWordsINR */
export function formatCompactINR(n) {
  return formatIndianWordsINR(n)
}

/** @deprecated use formatIndianWordsCount */
export function formatCompactNumber(n) {
  return formatIndianWordsCount(n)
}
