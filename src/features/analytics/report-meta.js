/**
 * Copy + filter layout for analytics report routes (`/analytics/reports/:slug`).
 * Aligns titles/descriptions with backend REPORT_REGISTRY (routes/reports.js).
 */

/** @typedef {'fullReceipt' | 'datesSearch' | 'minimal'} ReportFilterProfile */

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
    description: 'Product totals, MF categories, issuer sales, and previous-month comparison.',
    filterProfile: 'fullReceipt'
  },
  'mis-transactions': {
    title: 'Detailed Transaction MIS',
    description: 'Line-level receipts with optional grouping by product, AMC, branch, or RM.',
    filterProfile: 'fullReceipt'
  },
  'product-sales': {
    title: 'Product-wise Sales',
    description: 'Applications and amounts grouped by product category.',
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
  'mf-category': {
    title: 'Category-wise Mutual Fund',
    description: 'MF totals grouped by scheme category.',
    filterProfile: 'fullReceipt'
  },
  'mf-fund': {
    title: 'Fund-wise Mutual Fund',
    description: 'MF totals grouped by scheme or fund name.',
    filterProfile: 'fullReceipt'
  },
  'sip-report': {
    title: 'SIP Due / End',
    description: 'SIP receipts with product, scheme, client, next due date, and end date.',
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
  cashflow: {
    title: 'Cash Flow',
    description: 'Purchase, SIP, switches, and redemptions with net flow by issuer.',
    filterProfile: 'fullReceipt'
  },
  'pending-receipts': {
    title: 'Pending Receipts',
    description: 'Receipts not yet completed, with days pending.',
    filterProfile: 'fullReceipt'
  }
}

export function defaultDateRange() {
  const to = new Date()
  const from = new Date(to.getFullYear() - 2, to.getMonth(), 1)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10)
  }
}

export function defaultFutureDateRange(months = 6) {
  const from = new Date()
  const to = new Date(from)
  to.setMonth(to.getMonth() + months)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10)
  }
}

export function getInitialReportFilters(slug) {
  const meta = getReportMeta(slug)
  const dateRange = meta.defaultFutureMonths ? defaultFutureDateRange(meta.defaultFutureMonths) : defaultDateRange()
  return {
    ...dateRange,
    dateBasis: meta.defaultDateBasis || 'receipt',
    branchCodes: [],
    empCodes: [],
    productCategories: [],
    schemeCategories: [],
    investorIds: [],
    search: '',
    groupBy: '',
    includePending: true,
    hideCc: false,
    hideSi: false,
    viewMode: ''
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
