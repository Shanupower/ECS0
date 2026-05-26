/** Prorate a monthly target across calendar months overlapping [fromStr, toStr] (YYYY-MM-DD, inclusive). */
export function scaleMonthlyTargetToDateRange(monthlyAmount, fromStr, toStr) {
  let m = monthlyAmount
  if (m == null) m = 0
  else if (typeof m !== 'number') {
    const s = String(m).replace(/,/g, '').trim()
    const n = Number(s)
    m = Number.isFinite(n) ? n : 0
  } else if (!Number.isFinite(m)) m = 0
  if (!(m > 0)) return m
  if (!fromStr || !toStr) return m

  const parseLocalNoon = (iso) => {
    const parts = String(iso).split('-').map((x) => parseInt(x, 10))
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null
    const [y, mo, d] = parts
    return new Date(y, mo - 1, d, 12, 0, 0)
  }

  const from = parseLocalNoon(fromStr)
  const to = parseLocalNoon(toStr)
  if (!from || !to || from > to) return 0

  let total = 0
  let cur = new Date(from.getFullYear(), from.getMonth(), 1, 12, 0, 0)
  const lastMonthStart = new Date(to.getFullYear(), to.getMonth(), 1, 12, 0, 0)

  while (cur <= lastMonthStart) {
    const y = cur.getFullYear()
    const monthIdx = cur.getMonth()
    const monthStart = new Date(y, monthIdx, 1, 12, 0, 0)
    const monthEnd = new Date(y, monthIdx + 1, 0, 12, 0, 0)
    const daysInMonth = monthEnd.getDate()
    const rangeStart = from > monthStart ? from : monthStart
    const rangeEnd = to < monthEnd ? to : monthEnd
    if (rangeStart <= rangeEnd) {
      const overlapDays = Math.floor((rangeEnd - rangeStart) / 86400000) + 1
      total += m * (overlapDays / daysInMonth)
    }
    cur.setMonth(cur.getMonth() + 1)
  }
  return total
}

export function toSafeNumber(v) {
  if (v == null) return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const s = String(v).replace(/,/g, '').trim()
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}
