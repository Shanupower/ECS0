// Shared utilities for the Branch Manager Power Tool widgets.

export function todayISO() {
  const d = new Date()
  return toISODate(d)
}

export function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function yearStartISO() {
  const d = new Date()
  return `${d.getFullYear()}-01-01`
}

export function yearEndISO() {
  const d = new Date()
  return `${d.getFullYear()}-12-31`
}

export function monthStartISO(d = new Date()) {
  const date = new Date(d)
  date.setDate(1)
  return toISODate(date)
}

export function monthEndISO(d = new Date()) {
  const date = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return toISODate(date)
}

export function daysBetween(from, to) {
  const a = new Date(from)
  const b = new Date(to)
  const ms = b.getTime() - a.getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24))) + 1
}

// Returns a previous-period range of the same length as [from, to].
export function previousPeriod(from, to) {
  const len = daysBetween(from, to)
  const prevTo = new Date(from)
  prevTo.setDate(prevTo.getDate() - 1)
  const prevFrom = new Date(prevTo)
  prevFrom.setDate(prevFrom.getDate() - (len - 1))
  return { from: toISODate(prevFrom), to: toISODate(prevTo) }
}

export function formatINR(n) {
  const num = Number(n || 0)
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number.isFinite(num) ? num : 0
  )
}

export function formatCompactINR(n) {
  const num = Number(n || 0)
  if (!Number.isFinite(num)) return '₹0'
  const abs = Math.abs(num)
  if (abs >= 10_000_000) return `₹${(num / 10_000_000).toFixed(2)} Cr`
  if (abs >= 100_000) return `₹${(num / 100_000).toFixed(2)} L`
  if (abs >= 1_000) return `₹${(num / 1_000).toFixed(1)} K`
  return `₹${Math.round(num)}`
}

export function formatNumber(n) {
  const num = Number(n || 0)
  return new Intl.NumberFormat('en-IN').format(Number.isFinite(num) ? num : 0)
}

export function formatPct(n, digits = 1) {
  const num = Number(n || 0)
  if (!Number.isFinite(num)) return '0%'
  return `${num.toFixed(digits)}%`
}

export function deltaPercent(current, previous) {
  const cur = Number(current || 0)
  const prev = Number(previous || 0)
  if (!Number.isFinite(prev) || prev === 0) {
    if (cur === 0) return 0
    return cur > 0 ? 100 : -100
  }
  return ((cur - prev) / Math.abs(prev)) * 100
}

// Chart color tokens - resolve to theme CSS variables at runtime.
// Recharts needs real colors, not CSS vars, so we read them at render time.
export function getChartColors() {
  // Accent palette (both light + dark mode friendly) with good contrast.
  return {
    accent: '#0071e3',
    accent2: '#5e5ce6',
    success: '#34c759',
    warn: '#ff9500',
    error: '#ff3b30',
    teal: '#00c7be',
    pink: '#ff2d55',
    indigo: '#5856d6',
    orange: '#ff9500',
    mint: '#30d158',
    brown: '#a2845e',
    grey: '#8e8e93',
  }
}

export const PALETTE = [
  '#0071e3',
  '#5e5ce6',
  '#34c759',
  '#ff9500',
  '#ff2d55',
  '#00c7be',
  '#5856d6',
  '#ff3b30',
  '#a2845e',
  '#af52de',
  '#30d158',
  '#ffd60a',
]

export function colorFor(index) {
  return PALETTE[index % PALETTE.length]
}

// Build chart tooltip style that honors the app theme tokens.
export const tooltipStyle = {
  backgroundColor: 'var(--card-bg-opaque)',
  border: '1px solid var(--stroke)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  fontSize: 12,
  boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
}

// Robust field readers shared across widgets.
export function receiptAmount(r) {
  return Number(
    r?.investment_amount ||
      r?.fd_deposit_amount ||
      r?.transaction?.amount ||
      r?.product_details?.fd?.deposit?.amount ||
      r?.service_price ||
      0
  )
}

export function receiptCC(r) {
  const total = Number(r?.total_cc || 0)
  if (total) return total
  const parts = Number(r?.cc_amount || 0) + Number(r?.additional_cc || 0)
  if (parts) return parts
  return Number(r?.collection_credit || r?.cc || r?.calculations?.collection_credit || r?.calculations?.cc || 0)
}

export function receiptSI(r) {
  const total = Number(r?.total_si || 0)
  if (total) return total
  const parts = Number(r?.si_amount || 0) + Number(r?.additional_si || 0)
  if (parts) return parts
  return Number(r?.service_income || r?.si || r?.calculations?.service_income || r?.calculations?.si || 0)
}

export function receiptCustomerName(r, fallback = 'Unknown') {
  const name =
    r?.investor?.name ||
    r?.investor_name ||
    r?.customer_name ||
    r?.customer?.name ||
    r?.client_name ||
    r?.client?.name ||
    ''
  return String(name).trim() || fallback
}

export function receiptCustomerKey(r) {
  return (
    r?.investor?.id ||
    r?.investor_id ||
    r?.customer_id ||
    r?.customer?.id ||
    r?.customer_key ||
    r?.investor?.pan ||
    r?.pan ||
    receiptCustomerName(r, '')
  )
}

export function receiptCategory(r) {
  return (
    r?.product?.category ||
    r?.product_category ||
    r?.category ||
    'Other'
  )
}

export function receiptEmpCode(r) {
  return r?.emp_code || r?.employee_code || r?.employee?.emp_code || ''
}

export function receiptDate(r) {
  return (
    r?.date ||
    r?.transaction?.date ||
    r?.receipt_date ||
    (r?.created_at ? String(r.created_at).slice(0, 10) : '')
  )
}

// Simple in-memory cache keyed by stable JSON string.
export function makeCache() {
  const map = new Map()
  const key = (obj) => {
    try {
      return JSON.stringify(obj)
    } catch {
      return String(obj)
    }
  }
  return {
    get: (k) => map.get(key(k)),
    set: (k, v) => {
      map.set(key(k), v)
      return v
    },
    clear: () => map.clear(),
  }
}

export function classNames(...xs) {
  return xs.filter(Boolean).join(' ')
}

// Date presets for the filter bar.
export function getPresetRange(preset) {
  const now = new Date()
  switch (preset) {
    case 'today': {
      const t = toISODate(now)
      return { from: t, to: t }
    }
    case 'wtd': {
      const d = new Date(now)
      const day = d.getDay() || 7
      d.setDate(d.getDate() - (day - 1))
      return { from: toISODate(d), to: toISODate(now) }
    }
    case 'mtd':
      return { from: monthStartISO(now), to: toISODate(now) }
    case 'last7': {
      const d = new Date(now)
      d.setDate(d.getDate() - 6)
      return { from: toISODate(d), to: toISODate(now) }
    }
    case 'last30': {
      const d = new Date(now)
      d.setDate(d.getDate() - 29)
      return { from: toISODate(d), to: toISODate(now) }
    }
    case 'last90': {
      const d = new Date(now)
      d.setDate(d.getDate() - 89)
      return { from: toISODate(d), to: toISODate(now) }
    }
    case 'qtd': {
      const q = Math.floor(now.getMonth() / 3)
      const start = new Date(now.getFullYear(), q * 3, 1)
      return { from: toISODate(start), to: toISODate(now) }
    }
    case 'ytd':
      return { from: yearStartISO(), to: toISODate(now) }
    case 'year':
      return { from: yearStartISO(), to: yearEndISO() }
    default:
      return null
  }
}
