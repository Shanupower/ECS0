/**
 * Copy + filter layout for analytics report routes (`/analytics/reports/:slug`).
 * Aligns titles/descriptions with backend REPORT_REGISTRY (routes/reports.js).
 */

/** @typedef {'fullReceipt' | 'datesSearch' | 'minimal'} ReportFilterProfile */

/**
 * @typedef {{ title: string, description: string, filterProfile: ReportFilterProfile }} ReportMeta
 */

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
    title: 'SIP / Systematic',
    description: 'SIP-tagged receipts with schedule and amount fields.',
    filterProfile: 'fullReceipt'
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

export function getInitialReportFilters() {
  return {
    ...defaultDateRange(),
    dateBasis: 'receipt',
    branchCode: '',
    empCode: '',
    category: '',
    search: '',
    groupBy: '',
    includePending: true,
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
    filterProfile: 'fullReceipt'
  }
}
