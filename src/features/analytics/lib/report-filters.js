/** Map analytics filter state to report/export API query params. */
export function filtersToReportQuery(f, { page = 1, pageSize = 25, allowedFilters } = {}) {
  const q = { page: String(page), page_size: String(pageSize) }
  if (f.from?.trim()) q.from = f.from.trim()
  if (f.to?.trim()) q.to = f.to.trim()
  if (f.includePending === false) q.include_pending = '0'
  if (f.dateBasis) q.date_basis = f.dateBasis
  const canBranch = !allowedFilters || allowedFilters.includes('branch_codes')
  const canEmp = !allowedFilters || allowedFilters.includes('emp_codes')
  if (canBranch && Array.isArray(f.branchCodes) && f.branchCodes.length) {
    q.branch_codes = f.branchCodes.join(',')
  }
  if (canEmp && Array.isArray(f.empCodes) && f.empCodes.length) {
    q.emp_codes = f.empCodes.join(',')
  }
  if (Array.isArray(f.productCategories) && f.productCategories.length) {
    q.product_categories = f.productCategories.join(',')
  }
  if (Array.isArray(f.schemeCategories) && f.schemeCategories.length) {
    q.scheme_categories = f.schemeCategories.join(',')
  }
  if (Array.isArray(f.issuerNames) && f.issuerNames.length) {
    q.issuer_names = f.issuerNames.join(',')
  }
  if (Array.isArray(f.schemeNames) && f.schemeNames.length) {
    q.scheme_names = f.schemeNames.join(',')
  }
  if (Array.isArray(f.investorIds) && f.investorIds.length) {
    q.investor_ids = f.investorIds.join(',')
  } else if (f.search?.trim()) {
    q.search = f.search.trim()
  }
  if (f.groupBy) q.group_by = f.groupBy
  if (f.viewMode) q.view_mode = f.viewMode
  if (f.hideCc) q.hide_cc = '1'
  if (f.hideSi) q.hide_si = '1'
  if (Array.isArray(f.errorTypes) && f.errorTypes.length) q.error_type = f.errorTypes.join(',')
  if (Array.isArray(f.roleFilters) && f.roleFilters.length) q.roles = f.roleFilters.join(',')
  if (f.activeOnly) q.active_only = '1'
  if (f.includeImpersonation) q.include_impersonation = '1'
  return q
}

/** Customer Detail Report — paginated customer picker list. */
export function filtersToCustomerListQuery(f, { customerPage = 1, customerPageSize = 50, skipCount = false, allowedFilters } = {}) {
  const q = filtersToReportQuery(f, { page: 1, pageSize: 25, allowedFilters })
  delete q.page
  delete q.page_size
  delete q.search
  q.customer_page = String(customerPage)
  q.customer_page_size = String(customerPageSize)
  if (f.customerSearch?.trim()) q.customer_search = f.customerSearch.trim()
  if (f.customerSort?.trim()) q.customer_sort = f.customerSort.trim()
  if (skipCount) q.skip_count = '1'
  return q
}

export function canRunCustomerDetailReport(f) {
  if ((f.investorIds || []).length > 0) return true
  if ((f.branchCodes || []).length > 0) return true
  if ((f.productCategories || []).length > 0) return true
  return false
}

export function buildRmOptions(users = []) {
  return (Array.isArray(users) ? users : [])
    .map((u) => {
      const value = String(u?.emp_code || '').trim()
      if (!value) return null
      const label = String(u?.name || u?.employee_name || value).trim() || value
      const email = String(u?.email || '').trim()
      const role = String(u?.role || '').trim()
      return {
        value,
        label,
        email,
        role,
        searchText: [label, value, email, role].filter(Boolean).join(' ').toLowerCase()
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function filterRmOptions(options = [], query = '') {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return options
  return (Array.isArray(options) ? options : []).filter((option) => option.searchText.includes(q))
}

export function formatRmOptionLabel(option) {
  if (!option) return ''
  return option.label && option.label !== option.value ? `${option.label} (${option.value})` : option.value
}

export function buildBranchOptions(branches = []) {
  return (Array.isArray(branches) ? branches : [])
    .map((b) => {
      const value = String(b?.branch_code || b?.code || '').trim()
      if (!value) return null
      const label = String(b?.branch_name || b?.name || b?.branch || value).trim() || value
      const type = String(b?.branch_type || b?.type || '').trim()
      const aliases = [b?._key, b?.id, b?.branch, b?.branch_id].filter(Boolean).map((x) => String(x).trim())
      return {
        value,
        label,
        type,
        aliases,
        searchText: [label, value, type, ...aliases].filter(Boolean).join(' ').toLowerCase()
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function filterBranchOptions(options = [], query = '') {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return options
  return (Array.isArray(options) ? options : []).filter((option) => option.searchText.includes(q))
}

export function formatBranchOptionLabel(option) {
  if (!option) return ''
  return option.label && option.label !== option.value ? `${option.label} (${option.value})` : option.value
}

export function buildIssuerOptions(issuers = []) {
  const list = Array.isArray(issuers) ? issuers : []
  const seen = new Set()
  return list
    .map((v) => {
      const name = String(v ?? '').trim()
      if (!name || seen.has(name)) return null
      seen.add(name)
      return { value: name, label: name, searchText: name.toLowerCase() }
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function filterIssuerOptions(options = [], query = '') {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return options
  return (Array.isArray(options) ? options : []).filter((option) => option.searchText.includes(q))
}

export function formatIssuerOptionLabel(option) {
  if (!option) return ''
  return option.label && option.label !== option.value ? `${option.label} (${option.value})` : option.value
}

export function buildSchemeOptions(schemes = []) {
  const list = Array.isArray(schemes) ? schemes : []
  const seen = new Set()
  return list
    .map((v) => {
      const name = String(v ?? '').trim()
      if (!name || seen.has(name)) return null
      seen.add(name)
      return { value: name, label: name, searchText: name.toLowerCase() }
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function filterSchemeOptions(options = [], query = '') {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return options
  return (Array.isArray(options) ? options : []).filter((option) => option.searchText.includes(q))
}

export function formatSchemeOptionLabel(option) {
  if (!option) return ''
  return option.label && option.label !== option.value ? `${option.label} (${option.value})` : option.value
}

export function buildInvestorOptions(result = {}) {
  const rows = Array.isArray(result)
    ? result
    : [
        ...(Array.isArray(result?.customers) ? result.customers : []),
        ...(Array.isArray(result?.minors) ? result.minors : [])
      ]
  const seen = new Set()
  return rows
    .map((investor) => {
      const value = String(investor?.investor_id || investor?.id || '').trim()
      if (!value || seen.has(value)) return null
      seen.add(value)
      const label = String(investor?.name || investor?.investor_name || value).trim() || value
      const pan = String(investor?.pan || '').trim()
      const mobile = String(investor?.mobile || '').trim()
      const parentName = String(investor?.parent_name || '').trim()
      const isMinor = investor?.is_minor === true
      return {
        value,
        label,
        pan,
        mobile,
        parentName,
        isMinor,
        searchText: [label, value, pan, mobile, parentName].filter(Boolean).join(' ').toLowerCase()
      }
    })
    .filter(Boolean)
}

export function filterInvestorOptions(options = [], query = '') {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return options
  return (Array.isArray(options) ? options : []).filter((option) => option.searchText.includes(q))
}

export function formatInvestorOptionLabel(option) {
  if (!option) return ''
  return option.label && option.label !== option.value ? `${option.label} (${option.value})` : option.value
}

export function toggleListValue(list = [], value) {
  const key = String(value)
  const set = new Set((Array.isArray(list) ? list : []).map(String))
  if (set.has(key)) set.delete(key)
  else set.add(key)
  return Array.from(set)
}
