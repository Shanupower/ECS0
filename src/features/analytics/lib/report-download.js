const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
export const EXPORT_COMPANY_NAME = 'ECS Financial'
const EXPORT_TIMEZONE = 'Asia/Kolkata'

function formatDisplayDate(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const d = new Date(`${raw}T00:00:00`)
  if (Number.isNaN(d.getTime())) return raw
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(d)
}

export function formatDateRange(from, to) {
  const fromLabel = formatDisplayDate(from)
  const toLabel = formatDisplayDate(to)
  if (fromLabel && toLabel) return `From Date: ${fromLabel} – To Date: ${toLabel}`
  if (fromLabel) return `From Date: ${fromLabel}`
  if (toLabel) return `To Date: ${toLabel}`
  return 'All records'
}

export function formatExportTimestamp(date = new Date()) {
  const formatted = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: EXPORT_TIMEZONE
  }).format(date)
  return `Exported: ${formatted} IST`
}

function normalizeReportTitle(title) {
  const base = String(title || 'Report').trim() || 'Report'
  return /report$/i.test(base) ? base : `${base} Report`
}

/**
 * @param {{ reportTitle?: string, from?: string, to?: string, exportedAt?: Date }} meta
 * @returns {string[]}
 */
export function buildReportCsvHeader(meta) {
  if (!meta?.reportTitle) return []
  return [
    EXPORT_COMPANY_NAME,
    normalizeReportTitle(meta.reportTitle),
    formatDateRange(meta.from, meta.to),
    formatExportTimestamp(meta.exportedAt)
  ]
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * @param {string} token
 * @param {string} path - e.g. mis-transactions
 * @param {Record<string,string>} query
 * @param {'csv'|'xlsx'|'pdf'} format
 */
export function filenameFromContentDisposition(header) {
  if (!header) return null
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1].trim())
    } catch {
      return utf8[1].trim()
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header)
  if (quoted) return quoted[1]
  const plain = /filename=([^;]+)/i.exec(header)
  return plain ? plain[1].trim() : null
}

export async function downloadReportFile(token, path, query, format) {
  const qs = new URLSearchParams({ ...query, format }).toString()
  const res = await fetch(`${BASE}/api/reports/${path}?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
  if (!res.ok) throw new Error(await res.text())
  const blob = await res.blob()
  const ext = format === 'xlsx' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv'
  const fromHeader = filenameFromContentDisposition(res.headers.get('Content-Disposition'))
  downloadBlob(blob, fromHeader || `${path}.${ext}`)
}

/**
 * @param {string} token
 * @param {'users' | 'branches'} kind
 */
export async function downloadExportFile(token, kind) {
  const res = await fetch(`${BASE}/api/export/${kind}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
  if (!res.ok) throw new Error(await res.text())
  const blob = await res.blob()
  const fromHeader = filenameFromContentDisposition(res.headers.get('Content-Disposition'))
  downloadBlob(blob, fromHeader || `${kind}-export.csv`)
}

export function rowsToCsv(headers, rows, meta) {
  const esc = (v) => {
    if (v == null || v === '') return ''
    const s = String(v)
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = []
  for (const line of buildReportCsvHeader(meta)) {
    lines.push(esc(line))
  }
  if (lines.length) lines.push('')
  lines.push(headers.map(esc).join(','))
  for (const row of rows) lines.push(row.map(esc).join(','))
  return '\uFEFF' + lines.join('\n')
}

export function rowsFromObjects(rows, cols) {
  const headers = cols.map((c) => c.label)
  const dataRows = rows.map((r) =>
    cols.map((c) => {
      const v = r[c.key]
      if (v == null) return ''
      return v
    })
  )
  return { headers, dataRows }
}

export function downloadCsvClient(filename, headers, rows, meta) {
  const csv = rowsToCsv(headers, rows, meta)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`)
}
