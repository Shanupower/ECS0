/** Map analytics filter state to report/export API query params. */
export function filtersToReportQuery(f, { page = 1, pageSize = 25 } = {}) {
  const q = { page: String(page), page_size: String(pageSize) }
  if (f.from?.trim()) q.from = f.from.trim()
  if (f.to?.trim()) q.to = f.to.trim()
  if (f.includePending === false) q.include_pending = '0'
  if (f.dateBasis) q.date_basis = f.dateBasis
  if (f.branchCode?.trim()) q.branch_code = f.branchCode.trim()
  if (f.empCode?.trim()) q.emp_code = f.empCode.trim()
  if (f.category?.trim()) q.category = f.category.trim()
  if (f.search?.trim()) q.search = f.search.trim()
  if (f.groupBy) q.group_by = f.groupBy
  if (f.viewMode) q.view_mode = f.viewMode
  return q
}
