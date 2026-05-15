import * as React from 'react'
import { Link } from 'react-router-dom'
import { Download, ExternalLink, Loader2 } from 'lucide-react'
import { ReportFilterBar } from './ReportFilterBar.jsx'
import { getInitialReportFilters } from '../report-meta.js'
import { filtersToReportQuery } from '../lib/report-filters.js'
import { downloadExportFile, downloadReportFile } from '../lib/report-download.js'
import { useToast } from '../../../components/ui/Toast.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'

const EXPORT_PAGE_SIZE = 50000

export default function DataExportSection({ token }) {
  const toast = useToast()
  const defaults = React.useMemo(() => getInitialReportFilters(), [])
  const [f, setF] = React.useState(defaults)
  const [exporting, setExporting] = React.useState(null)

  const patchFilters = (patch) => setF((prev) => ({ ...prev, ...patch }))
  const resetFilters = () => setF(getInitialReportFilters())

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
          filterProfile="fullReceipt"
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
