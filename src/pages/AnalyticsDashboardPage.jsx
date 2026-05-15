import * as React from 'react'
import { Link } from 'react-router-dom'
import * as Lucide from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import DataExportSection from '../features/analytics/components/DataExportSection.jsx'

export default function AnalyticsDashboardPage() {
  const { token } = useAuth()
  const [reports, setReports] = React.useState([])
  const [err, setErr] = React.useState('')
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.reportsRegistry(token)
        if (!cancelled) setReports(Array.isArray(res.reports) ? res.reports : [])
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Failed to load reports')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--dashboard-text)]">Business Analytics</h1>
        <p className="mt-2 text-sm text-[var(--dashboard-muted)] max-w-2xl leading-relaxed">
          Operational and MIS reports with shared filters, exports, and drill-down tables. Pick a report to open the
          interactive workspace.
        </p>
      </div>
      {err && (
        <div className="mb-4 rounded-xl border border-[var(--error)]/40 bg-[var(--error-muted)] px-4 py-3 text-sm text-[var(--error)]">
          {err}
        </div>
      )}
      <DataExportSection token={token} />
      {loading ? (
        <p className="text-sm text-[var(--dashboard-muted)]">Loading report catalog…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {reports.map((r) => {
            const Icon = Lucide[r.icon] || Lucide.FileBarChart
            const slug = r.id || r.path?.split('/').pop()
            return (
              <Card key={r.id} className="overflow-hidden flex flex-col hover:border-[var(--accent)]/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base">{r.title}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-3">{r.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 mt-auto">
                  <Button asChild className="w-full">
                    <Link to={`/analytics/reports/${slug}`}>Open report</Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
