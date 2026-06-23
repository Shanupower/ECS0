import { api } from '../../api.js'

/** Canonical analytics report IDs (match backend REPORT_REGISTRY `id`). */
export const REPORT_IDS = [
  'mis-summary',
  'mis-transactions',
  'product-detail',
  'category-summary',
  'mf-fund',
  'sip-report',
  'fd-maturity',
  'pending-receipts',
  'receipt-errors',
  'customer-detail',
  'payment-mode',
  'user-login',
  'user-role-access'
]

export const REPORT_LOADERS = {
  'mis-summary': (token, q) => api.reportsMisSummary(token, q),
  'mis-transactions': (token, q) => api.reportsMisTransactions(token, q),
  'product-detail': (token, q) => api.reportsProductDetail(token, q),
  'category-summary': (token, q) => api.reportsCategorySummary(token, q),
  'mf-fund': (token, q) => api.reportsMfFund(token, q),
  'sip-report': (token, q) => api.reportsSipReport(token, q),
  'fd-maturity': (token, q) => api.reportsFdMaturity(token, q),
  'pending-receipts': (token, q) => api.reportsPendingReceipts(token, q),
  'receipt-errors': (token, q) => api.reportsReceiptErrors(token, q),
  'customer-detail': (token, q) => api.reportsCustomerDetail(token, q),
  'payment-mode': (token, q) => api.reportsPaymentMode(token, q),
  'user-login': (token, q) => api.reportsUserLogin(token, q),
  'user-role-access': (token, q) => api.reportsUserRoleAccess(token, q)
}

/**
 * Normalize route param / registry id / API path tail to a canonical report slug.
 */
export function normalizeReportSlug(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return ''
  const segment = raw.includes('/') ? raw.split('/').filter(Boolean).pop() : raw
  return String(segment || '')
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function registrySlugCandidates(entry) {
  if (!entry || typeof entry !== 'object') return []
  return [entry.id, entry.slug, entry.path].filter(Boolean).map(normalizeReportSlug).filter(Boolean)
}

/**
 * Map URL :slug (or registry entry) to a slug our loaders understand.
 */
export function resolveReportSlug(rawSlug, registryReports = []) {
  const normalized = normalizeReportSlug(rawSlug)
  if (!normalized) return ''
  if (REPORT_LOADERS[normalized]) return normalized

  for (const entry of registryReports) {
    const candidates = registrySlugCandidates(entry)
    if (!candidates.includes(normalized)) continue
    const canonical = normalizeReportSlug(entry.id) || candidates[0]
    if (REPORT_LOADERS[canonical]) return canonical
  }

  return normalized
}

export function isKnownReportSlug(slug) {
  return Boolean(slug && REPORT_LOADERS[slug])
}

export async function fetchReportBySlug(token, slug, query) {
  const loader = REPORT_LOADERS[slug]
  if (!loader) {
    throw new Error(
      `Unknown report "${slug}". Redeploy the frontend if this report was recently added.`
    )
  }
  return loader(token, query)
}
