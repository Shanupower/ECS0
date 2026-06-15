/** Roles allowed to access Business Analytics. Keep in sync with backend constants/report-access.js */
export const ANALYTICS_ROLES = ['admin', 'manager', 'branch', 'employee']

export function canAccessAnalytics(role) {
  return ANALYTICS_ROLES.includes(String(role || '').trim())
}

export function defaultReportViewMode(role) {
  const r = String(role || '').trim()
  if (r === 'employee') return 'personal'
  if (r === 'manager' || r === 'branch') return 'branch'
  return ''
}

export function allowedReportFilters(role) {
  const r = String(role || '').trim()
  if (r === 'admin') return ['branch_codes', 'emp_codes']
  if (r === 'manager' || r === 'branch') return ['emp_codes']
  return []
}

export function scopeLabelForRole(role) {
  const r = String(role || '').trim()
  if (r === 'employee') return 'Showing your receipts'
  if (r === 'manager' || r === 'branch') return 'Showing your branch'
  return 'All branches'
}

/** @param {{ view_mode?: string, label?: string, allowed_filters?: string[] } | null | undefined} scope */
export function resolveAnalyticsScope(scope, role) {
  return {
    viewMode: scope?.view_mode || defaultReportViewMode(role),
    label: scope?.label || scopeLabelForRole(role),
    allowedFilters: scope?.allowed_filters || allowedReportFilters(role)
  }
}

export function canUseReportFilter(allowedFilters, filterKey) {
  return (allowedFilters || []).includes(filterKey)
}
