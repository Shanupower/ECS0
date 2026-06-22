/**
 * Copy + filter layout for analytics report routes (`/analytics/reports/:slug`).
 * Aligns titles/descriptions with backend REPORT_REGISTRY (routes/reports.js).
 */

/** @typedef {'fullReceipt' | 'datesSearch' | 'minimal' | 'customerDetail' | 'adminUsers'} ReportFilterProfile */

/**
 * @typedef {{ label: string, value: string }} DateBasisOption
 * @typedef {{ title: string, description: string, filterProfile: ReportFilterProfile, defaultDateBasis?: string, dateBasisOptions?: DateBasisOption[], defaultFutureMonths?: number }} ReportMeta
 */

export const DEFAULT_DATE_BASIS_OPTIONS = [
  { value: 'receipt', label: 'Receipt date' },
  { value: 'transaction', label: 'Transaction date' }
]

/** @type {Record<string, ReportMeta>} */
export const REPORT_META = {
  'mis-summary': {
    title: 'MIS Summary',
    description: 'Product totals, MF categories, and issuer sales.',
    filterProfile: 'fullReceipt'
  },
  'mis-transactions': {
    title: 'Detailed Transaction MIS',
    description: 'Line-level receipts with optional grouping by product, AMC, branch, or RM.',
    filterProfile: 'fullReceipt'
  },
  'product-detail': {
    title: 'Product-wise Detail',
    description: 'Product, scheme, client, date, branch, RM, CC, and amount detail.',
    filterProfile: 'fullReceipt'
  },
  'category-summary': {
    title: 'Category-wise Summary',
    description: 'All product categories grouped by scheme and type, including FD cumulative type.',
    filterProfile: 'fullReceipt'
  },
  'mf-fund': {
    title: 'Fund-wise Mutual Fund',
    description: 'MF totals grouped by scheme or fund name.',
    filterProfile: 'fullReceipt'
  },
  'sip-report': {
    title: 'SIP Due / End',
    description: 'SIP receipts with product, scheme, client, period, month, and end date.',
    filterProfile: 'fullReceipt',
    defaultDateBasis: 'sip_due',
    defaultFutureMonths: 6,
    dateBasisOptions: [
      { value: 'sip_due', label: 'Next due date' },
      { value: 'sip_end', label: 'SIP end date' },
      ...DEFAULT_DATE_BASIS_OPTIONS
    ]
  },
  'fd-maturity': {
    title: 'Maturity Report',
    description: 'All product maturity report with product category, scheme, client, and due dates.',
    filterProfile: 'fullReceipt',
    defaultDateBasis: 'fd_maturity',
    defaultFutureMonths: 6,
    dateBasisOptions: [
      { value: 'fd_maturity', label: 'Maturity date' },
      ...DEFAULT_DATE_BASIS_OPTIONS
    ]
  },
  'pending-receipts': {
    title: 'Pending Receipts',
    description: 'Receipts not yet completed, with days pending.',
    filterProfile: 'fullReceipt'
  },
  'customer-detail': {
    title: 'Customer Detail Report',
    description:
      'Browse customers by branch or product, select individuals or include a whole branch, then view breakdowns for the filtered period.',
    filterProfile: 'customerDetail'
  },
  'receipt-errors': {
    title: 'Duplicate / Error Report',
    description:
      'Duplicate transactions, receipt numbers, and data-quality issues (missing PAN, mobile, reference, invalid amount).',
    filterProfile: 'fullReceipt'
  },
  'payment-mode': {
    title: 'Payment Mode for Receipts',
    description: 'Receipt totals and detail grouped by payment mode (Online, Offline, Others).',
    filterProfile: 'fullReceipt'
  },
  'user-login': {
    title: 'User Login Report',
    description: 'Login history with employee, branch, role, IP address, and session type.',
    filterProfile: 'adminUsers',
    roles: ['admin']
  },
  'user-role-access': {
    title: 'User Role & Access Report',
    description: 'Users with role, branch, analytics scope, and access capabilities.',
    filterProfile: 'adminUsers',
    roles: ['admin']
  }
}

export const USER_ROLE_FILTER_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'branch', label: 'Branch' },
  { value: 'employee', label: 'Employee' }
]

export const RECEIPT_ERROR_TYPE_OPTIONS = [
  { value: 'duplicate_transaction', label: 'Duplicate transaction' },
  { value: 'duplicate_receipt_number', label: 'Duplicate receipt #' },
  { value: 'missing_pan', label: 'Missing PAN' },
  { value: 'missing_mobile', label: 'Missing mobile' },
  { value: 'blank_reference', label: 'Blank reference' },
  { value: 'invalid_amount', label: 'Invalid amount' }
]

export const RECEIPT_ERROR_TYPE_LABELS = Object.fromEntries(
  RECEIPT_ERROR_TYPE_OPTIONS.map((opt) => [opt.value, opt.label])
)

function toLocalYmd(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function defaultDateRange() {
  const to = new Date()
  const from = new Date(to.getFullYear(), 0, 1)
  return {
    from: toLocalYmd(from),
    to: toLocalYmd(to)
  }
}

export function defaultFutureDateRange(months = 6) {
  const from = new Date()
  const to = new Date(from)
  to.setMonth(to.getMonth() + months)
  return {
    from: toLocalYmd(from),
    to: toLocalYmd(to)
  }
}

export function getInitialReportFilters(slug, { viewMode = '' } = {}) {
  const meta = getReportMeta(slug)
  const dateRange = meta.defaultFutureMonths ? defaultFutureDateRange(meta.defaultFutureMonths) : defaultDateRange()
  return {
    ...dateRange,
    dateBasis: meta.defaultDateBasis || 'receipt',
    branchCodes: [],
    empCodes: [],
    productCategories: [],
    schemeCategories: [],
    issuerNames: [],
    schemeNames: [],
    investorIds: [],
    search: '',
    groupBy: '',
    includePending: true,
    hideCc: false,
    hideSi: false,
    viewMode: viewMode || '',
    errorTypes: [],
    customerSearch: '',
    customerSort: 'name:asc',
    fundSearch: '',
    roleFilters: [],
    activeOnly: false,
    includeImpersonation: false
  }
}

/**
 * @param {string | undefined} slug
 * @returns {ReportMeta}
 */
export function getReportMeta(slug) {
  if (slug && REPORT_META[slug]) return REPORT_META[slug]
  const label = slug
    ? slug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : 'Report'
  return {
    title: label,
    description: 'Analytics report.',
    filterProfile: 'fullReceipt',
    dateBasisOptions: DEFAULT_DATE_BASIS_OPTIONS
  }
}
