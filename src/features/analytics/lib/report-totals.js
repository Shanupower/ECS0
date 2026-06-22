const MONEY_FIELDS = new Set([
  'amount',
  'collection_credit',
  'incentive_amount',
  'incentive_paid',
  'investment_amount',
  'maturity_amount',
  'net_flow',
  'purchase',
  'redemption',
  'sip',
  'sip_amount',
  'switch_in',
  'switch_out'
])

export function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function sumNumericFields(rows, fields) {
  return fields.reduce((totals, field) => {
    let seen = false
    let sum = 0
    for (const row of rows || []) {
      const value = toFiniteNumber(row?.[field])
      if (value === null) continue
      seen = true
      sum += value
    }
    totals[field] = seen ? sum : null
    return totals
  }, {})
}

export function buildReportTotalRows({ rows, fields, filteredTotals }) {
  if (!fields?.length) return []

  const pageTotals = sumNumericFields(rows, fields)
  if (filteredTotals) {
    return [
      { label: 'Page total', values: pageTotals },
      { label: 'Filtered total', values: filteredTotals }
    ]
  }

  return [{ label: 'Total', values: pageTotals }]
}

export function formatReportTotalValue(field, value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  const number = Number(value)
  try {
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: MONEY_FIELDS.has(field) ? 0 : 2
    }).format(number)
  } catch {
    return String(value)
  }
}
