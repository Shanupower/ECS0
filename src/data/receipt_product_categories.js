/**
 * Receipt `product_category` values used in filters and intake settings.
 * Keep in sync with receipt wizard / System Settings intake rows.
 */
export const RECEIPT_PRODUCT_CATEGORY_FILTER_OPTIONS = [
  { value: 'MF', label: 'Mutual Funds' },
  { value: 'FD', label: 'Fixed Deposit' },
  { value: 'GOVT_FD', label: 'Government Schemes' },
  { value: 'INS', label: 'Insurance' },
  { value: 'BOND', label: 'Bonds (BOND)' },
  { value: 'NCD', label: 'Bonds/NCD (NCD)' },
  { value: 'MISC', label: 'Misc Services' },
  { value: 'Other', label: 'Other' }
]

export const RECEIPT_PRODUCT_CATEGORY_KEYS = new Set(RECEIPT_PRODUCT_CATEGORY_FILTER_OPTIONS.map((o) => o.value))
