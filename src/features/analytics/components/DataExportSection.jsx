import * as React from 'react'
import { Link } from 'react-router-dom'
import { Download, ExternalLink, Loader2 } from 'lucide-react'
import { ReportFilterBar } from './ReportFilterBar.jsx'
import { getInitialReportFilters } from '../report-meta.js'
import { buildBranchOptions, buildRmOptions, filtersToReportQuery } from '../lib/report-filters.js'
import { downloadExportFile, downloadReportFile } from '../lib/report-download.js'
import { api } from '../../../api.js'
import { useToast } from '../../../components/ui/Toast.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card.jsx'
import { Button } from '../../../components/ui/Button.jsx'

const EXPORT_PAGE_SIZE = 50000

export default function DataExportSection({ token }) {
  const toast = useToast()
  const defaults = React.useMemo(() => getInitialReportFilters(), [])
  const [f, setF] = React.useState(defaults)
  const [exporting, setExporting] = React.useState(null)
  const [users, setUsers] = React.useState([])
  const [branches, setBranches] = React.useState([])
  const [schemeCategoryOptions, setSchemeCategoryOptions] = React.useState([])
  const branchOptions = React.useMemo(() => buildBranchOptions(branches), [branches])
  const rmOptions = React.useMemo(() => buildRmOptions(users), [users])

  const patchFilters = (patch) => setF((prev) => ({ ...prev, ...patch }))
  const resetFilters = () => setF(getInitialReportFilters())

  React.useEffect(() => {
    if (!token) return
    let cancelled = false
    Promise.all([
      api.listUsers(token).catch(() => []),
      api.listBranches(token, { includeInactive: '1' }).catch(() => []),
      api.reportsFilterOptions(token).catch(() => ({ scheme_categories: [] }))
    ])
      .then(([usersRes, branchesRes, filterOpts]) => {
        if (cancelled) return
        setUsers(Array.isArray(usersRes) ? usersRes : usersRes?.items || [])
        setBranches(Array.isArray(branchesRes) ? branchesRes : branchesRes?.items || [])
        setSchemeCategoryOptions(
          Array.isArray(filterOpts?.scheme_categories) ? filterOpts.scheme_categories : []
        )
      })
      .catch(() => {
        if (!cancelled) {
          setUsers([])
          setBranches([])
          setSchemeCategoryOptions([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const runExport = async (key, fn) => {
    if (!token) return
    setExporting(key)
    try {
      await fn()
    } catch (e) {
      toast.error(e.message || 'Export failed')
    } finally {
      setExporting(null)
    }
  }

  const misQuery = () => filtersToReportQuery(f, { page: 1, pageSize: EXPORT_PAGE_SIZE })

  const exportMisCsv = () =>
    runExport('mis-csv', () => downloadReportFile(token, 'mis-transactions', misQuery(), 'csv'))

  const exportMisXlsx = () =>
    runExport('mis-xlsx', () => downloadReportFile(token, 'mis-transactions', misQuery(), 'xlsx'))

  const exportMisPdf = () =>
    runExport('mis-pdf', () => downloadReportFile(token, 'mis-transactions', misQuery(), 'pdf'))

  const exportUsers = () => runExport('users', () => downloadExportFile(token, 'users'))
  const exportBranches = () => runExport('branches', () => downloadExportFile(token, 'branches'))

  const busy = exporting != null

  return (
    <Card className="mb-10 border-[var(--stroke)]">
      <CardHeader>
        <CardTitle className="text-xl">Data export</CardTitle>
        <CardDescription>
          Download transaction detail or master lists using the same filters as MIS reports (date basis, branch,
          employee, category, and pending receipts).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ReportFilterBar
          {...f}
          onChange={patchFilters}
          onApply={() => {}}
          onReset={resetFilters}
          token={token}
          filterProfile="fullReceipt"
          branchOptions={branchOptions}
          rmOptions={rmOptions}
          schemeCategoryOptions={schemeCategoryOptions}
          showIncludePending
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" disabled={busy} onClick={exportMisCsv}>
            {exporting === 'mis-csv' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="h-4 w-4" aria-hidden />
            )}
            Download CSV
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={exportMisXlsx}>
            {exporting === 'mis-xlsx' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="h-4 w-4" aria-hidden />
            )}
            Download Excel
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={exportMisPdf}>
            {exporting === 'mis-pdf' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="h-4 w-4" aria-hidden />
            )}
            Download PDF
          </Button>
          <Button variant="outline" asChild className="ml-auto sm:ml-0">
            <Link to="/analytics/reports/mis-transactions">
              Open Detailed Transaction MIS
              <ExternalLink className="h-3.5 w-3.5 ml-1.5 opacity-70" aria-hidden />
            </Link>
          </Button>
        </div>

        <div className="pt-4 border-t border-[var(--stroke)] space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--dashboard-muted)]">
            Master data
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={exportUsers}>
              {exporting === 'users' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Users
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={exportBranches}>
              {exporting === 'branches' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Branches
            </Button>
            <Button variant="link" size="sm" asChild className="h-auto px-0 text-[var(--accent)]">
              <Link to="/customers">Customer export (requires master key)</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
