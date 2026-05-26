const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

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
 * @param {'csv'|'xlsx'} format
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
  const ext = format === 'xlsx' ? 'xlsx' : 'csv'
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

export function rowsToCsv(headers, rows) {
  const esc = (v) => {
    if (v == null || v === '') return ''
    const s = String(v)
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [headers.map(esc).join(',')]
  for (const row of rows) lines.push(row.map(esc).join(','))
  return '\uFEFF' + lines.join('\n')
}

export function downloadCsvClient(filename, headers, rows) {
  const csv = rowsToCsv(headers, rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`)
}
