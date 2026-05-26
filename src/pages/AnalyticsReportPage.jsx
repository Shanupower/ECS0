import * as React from 'react'
import { useParams, Link } from 'react-router-dom'
import { createColumnHelper } from '@tanstack/react-table'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { ReportShell, ReportDataTable } from '../features/analytics/components/ReportShell.jsx'
import { ReportFilterBar } from '../features/analytics/components/ReportFilterBar.jsx'
import { getReportMeta, getInitialReportFilters } from '../features/analytics/report-meta.js'
import { Button } from '../components/ui/Button.jsx'
import { downloadReportFile } from '../features/analytics/lib/report-download.js'
import { filtersToReportQuery } from '../features/analytics/lib/report-filters.js'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(n))
  } catch {
    return String(n)
  }
}

function ServerPager({ page, pageSize, total, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--dashboard-muted)]">
      <span>
        Page {page} / {totalPages} — {total} rows
      </span>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

export default function AnalyticsReportPage() {
  const { slug } = useParams()
  const { token } = useAuth()
  const meta = React.useMemo(() => getReportMeta(slug), [slug])
  const defaults = React.useMemo(() => getInitialReportFilters(slug), [slug])
  const [f, setF] = React.useState(defaults)
  const [page, setPage] = React.useState(1)
  /** Bumps when user clicks Apply so we refetch even if `f` and `page` are unchanged (React skips effect when deps are equal). */
  const [fetchNonce, setFetchNonce] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState('')
  const [payload, setPayload] = React.useState(null)

  const patchFilters = (patch) => setF((prev) => ({ ...prev, ...patch }))

  React.useEffect(() => {
    setF(defaults)
    setPage(1)
    setPayload(null)
    setFetchNonce((n) => n + 1)
  }, [defaults])

  const apply = React.useCallback(() => {
    setPage(1)
    setFetchNonce((n) => n + 1)
  }, [])

  const resetFilters = React.useCallback(() => {
    setF(getInitialReportFilters(slug))
    setPage(1)
    setFetchNonce((n) => n + 1)
  }, [slug])

  React.useEffect(() => {
    if (!token || !slug) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr('')
      try {
        const q = filtersToReportQuery(f, { page, pageSize: 25 })
        let data
        switch (slug) {
          case 'mis-summary':
            data = await api.reportsMisSummary(token, q)
            break
          case 'mis-transactions':
            data = await api.reportsMisTransactions(token, q)
            break
          case 'product-sales':
            data = await api.reportsProductSales(token, q)
            break
          case 'product-detail':
            data = await api.reportsProductDetail(token, q)
            break
          case 'category-summary':
            data = await api.reportsCategorySummary(token, q)
            break
          case 'mf-category':
            data = await api.reportsMfCategory(token, q)
            break
          case 'mf-fund':
            data = await api.reportsMfFund(token, q)
            break
          case 'sip-report':
            data = await api.reportsSipReport(token, q)
            break
          case 'fd-maturity':
            data = await api.reportsFdMaturity(token, q)
            break
          case 'cashflow':
            data = await api.reportsCashflow(token, q)
            break
          case 'pending-receipts':
            data = await api.reportsPendingReceipts(token, q)
            break
          default:
            throw new Error('Unknown report')
        }
        if (!cancelled) setPayload(data)
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, slug, f, page, fetchNonce])

  const exportReport = (format) => {
    const q = filtersToReportQuery(f, { page: 1, pageSize: 50000 })
    return downloadReportFile(token, slug, q, format)
  }

  if (slug === 'mis-summary') {
    const chartData = (payload?.product_summary || []).map((r) => ({
      name: r.product_type,
      amount: Number(r.amount) || 0
    }))
    return (
      <ReportShell
        title={meta.title}
        description={meta.description}
        summaryCards={
          payload
            ? [
                { label: 'Products in view', value: String((payload.product_summary || []).length) },
                {
                  label: 'Prev. month applications',
                  value: String(payload.previous_month_totals?.applications ?? '—')
                },
                { label: 'Prev. month amount', value: formatMoney(payload.previous_month_totals?.amount) },
                { label: 'Prev. month CC', value: formatMoney(payload.previous_month_totals?.collection_credit) },
                {
                  label: 'Prev. month incentive',
                  value:
                    payload.previous_month_totals?.incentive_amount == null
                      ? '—'
                      : formatMoney(payload.previous_month_totals?.incentive_amount)
                }
              ]
            : []
        }
        filters={
          <ReportFilterBar
            {...f}
            onChange={patchFilters}
            onApply={apply}
            onReset={resetFilters}
            filterProfile={meta.filterProfile}
            dateBasisOptions={meta.dateBasisOptions}
            showIncludePending
          />
        }
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link to="/analytics">Back</Link>
            </Button>
            <Button type="button" variant="secondary" onClick={() => exportReport('csv').catch((e) => setErr(e.message))}>
              Export CSV
            </Button>
          </>
        }
      >
        {err && (
          <div className="rounded-xl border border-[var(--error)]/40 bg-[var(--error-muted)] px-4 py-3 text-sm text-[var(--error)]">
            {err}
          </div>
        )}
        {loading && (
          <div className="space-y-4 animate-pulse" aria-busy="true">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] h-72" />
              <div className="rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] h-72" />
            </div>
            <div className="h-32 rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)]" />
          </div>
        )}
        {!loading && payload && (
          <>
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] p-4 h-72">
                <h3 className="text-sm font-medium text-[var(--dashboard-muted)] mb-3">Product amounts</h3>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => formatMoney(v)} />
                    <Bar dataKey="amount" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] p-4">
            <h3 className="text-sm font-medium text-[var(--dashboard-muted)] mb-3">Previous month</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--dashboard-muted)]">Period</dt>
                <dd className="font-medium text-[var(--dashboard-text)]">
                  {payload.previous_month_totals?.period_from} → {payload.previous_month_totals?.period_to}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--dashboard-muted)]">Applications</dt>
                <dd className="tabular-nums">{payload.previous_month_totals?.applications}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--dashboard-muted)]">Amount</dt>
                <dd className="tabular-nums">{formatMoney(payload.previous_month_totals?.amount)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--dashboard-muted)]">CC</dt>
                <dd className="tabular-nums">{formatMoney(payload.previous_month_totals?.collection_credit)}</dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--dashboard-text)]">Product summary</h3>
          <div className="overflow-x-auto rounded-2xl border border-[var(--dashboard-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--dashboard-border)]/20 text-left text-[var(--dashboard-muted)]">
                <tr>
                  <th className="px-4 py-2">Product type</th>
                  <th className="px-4 py-2">Applications</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">CC</th>
                  <th className="px-4 py-2">Incentive</th>
                </tr>
              </thead>
              <tbody>
                {(payload.product_summary || []).map((r) => (
                  <tr key={r.product_type} className="border-t border-[var(--dashboard-border)]/60">
                    <td className="px-4 py-2">{r.product_type}</td>
                    <td className="px-4 py-2 tabular-nums">{r.applications}</td>
                    <td className="px-4 py-2 tabular-nums">{formatMoney(r.amount)}</td>
                    <td className="px-4 py-2 tabular-nums">{formatMoney(r.collection_credit)}</td>
                    <td className="px-4 py-2 tabular-nums">
                      {r.incentive_amount == null ? '—' : formatMoney(r.incentive_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="text-sm font-semibold text-[var(--dashboard-text)]">MF category summary</h3>
          <div className="overflow-x-auto rounded-2xl border border-[var(--dashboard-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--dashboard-border)]/20 text-left text-[var(--dashboard-muted)]">
                <tr>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Applications</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">CC</th>
                  <th className="px-4 py-2">Incentive</th>
                </tr>
              </thead>
              <tbody>
                {(payload.mf_category_summary || []).map((r) => (
                  <tr key={r.category} className="border-t border-[var(--dashboard-border)]/60">
                    <td className="px-4 py-2">{r.category}</td>
                    <td className="px-4 py-2 tabular-nums">{r.applications}</td>
                    <td className="px-4 py-2 tabular-nums">{formatMoney(r.amount)}</td>
                    <td className="px-4 py-2 tabular-nums">{formatMoney(r.collection_credit)}</td>
                    <td className="px-4 py-2 tabular-nums">
                      {r.incentive_amount == null ? '—' : formatMoney(r.incentive_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="text-sm font-semibold text-[var(--dashboard-text)]">Company / fund sales</h3>
          <div className="overflow-x-auto rounded-2xl border border-[var(--dashboard-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--dashboard-border)]/20 text-left text-[var(--dashboard-muted)]">
                <tr>
                  <th className="px-4 py-2">Company / fund</th>
                  <th className="px-4 py-2">Applications</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">CC</th>
                  <th className="px-4 py-2">Incentive</th>
                </tr>
              </thead>
              <tbody>
                {(payload.issuer_sales || []).map((r) => (
                  <tr key={r.company_fund_name} className="border-t border-[var(--dashboard-border)]/60">
                    <td className="px-4 py-2">{r.company_fund_name}</td>
                    <td className="px-4 py-2 tabular-nums">{r.applications}</td>
                    <td className="px-4 py-2 tabular-nums">{formatMoney(r.amount)}</td>
                    <td className="px-4 py-2 tabular-nums">{formatMoney(r.collection_credit)}</td>
                    <td className="px-4 py-2 tabular-nums">
                      {r.incentive_amount == null ? '—' : formatMoney(r.incentive_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}
      </ReportShell>
    )
  }

  const rows = payload?.rows || payload?.items || []
  const total = payload?.total ?? rows.length
  const groupBy = payload?.group_by

  const ch = createColumnHelper()
  let columns = []
  if (slug === 'mis-transactions') {
    if (groupBy) {
      columns = groupBy === 'rm'
        ? [
            ch.accessor('group_key', { header: 'RM Code' }),
            ch.accessor('employee_name', { header: 'Employee Name' }),
            ch.accessor('applications', { header: 'Applications' }),
            ch.accessor('amount', { header: 'Amount', cell: (c) => formatMoney(c.getValue()) }),
            ch.accessor('collection_credit', { header: 'CC', cell: (c) => formatMoney(c.getValue()) }),
            ch.accessor('incentive_amount', {
              header: 'Incentive',
              cell: (c) => (c.getValue() == null ? '—' : formatMoney(c.getValue()))
            })
          ]
        : [
            ch.accessor('group_key', { header: groupBy === 'branch' ? 'Branch Code' : 'Group' }),
            ch.accessor('applications', { header: 'Applications' }),
            ch.accessor('amount', { header: 'Amount', cell: (c) => formatMoney(c.getValue()) }),
            ch.accessor('collection_credit', { header: 'CC', cell: (c) => formatMoney(c.getValue()) }),
            ch.accessor('incentive_amount', {
              header: 'Incentive',
              cell: (c) => (c.getValue() == null ? '—' : formatMoney(c.getValue()))
            })
          ]
    } else {
      columns = [
        ch.accessor('date', { header: 'Date' }),
        ch.accessor('branch', { header: 'Branch' }),
        ch.accessor('receipt_number', { header: 'Receipt #' }),
        ch.accessor('investor_name', { header: 'Investor' }),
        ch.accessor('scheme_name', { header: 'Scheme' }),
        ch.accessor('period', { header: 'Period' }),
        ch.accessor('months', { header: 'Months' }),
        ch.accessor('transaction_type', { header: 'Txn type' }),
        ch.accessor('investment_amount', { header: 'Amount', cell: (c) => formatMoney(c.getValue()) }),
        ch.accessor('collection_credit', { header: 'CC', cell: (c) => formatMoney(c.getValue()) }),
        ch.accessor('incentive_paid', {
          header: 'Incentive',
          cell: (c) => (c.getValue() == null ? '—' : formatMoney(c.getValue()))
        }),
        ch.accessor('application_number', { header: 'Application #' }),
        ch.accessor('emp_code', { header: 'RM' }),
        ch.accessor('product_category', { header: 'Product' })
      ]
    }
  } else if (slug === 'product-sales' || slug === 'mf-category') {
    const key = slug === 'mf-category' ? 'category' : 'product_type'
    columns = [
      ch.accessor(key, { header: slug === 'mf-category' ? 'Category' : 'Product' }),
      ch.accessor('applications', { header: 'Applications' }),
      ch.accessor('amount', { header: 'Amount', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('collection_credit', { header: 'CC', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('incentive_amount', {
        header: 'Incentive',
        cell: (c) => (c.getValue() == null ? '—' : formatMoney(c.getValue()))
      })
    ]
  } else if (slug === 'mf-fund') {
    columns = [
      ch.accessor('fund_name', { header: 'Fund' }),
      ch.accessor('applications', { header: 'Applications' }),
      ch.accessor('amount', { header: 'Amount', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('collection_credit', { header: 'CC', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('incentive_amount', {
        header: 'Incentive',
        cell: (c) => (c.getValue() == null ? '—' : formatMoney(c.getValue()))
      })
    ]
  } else if (slug === 'product-detail') {
    columns = [
      ch.accessor('date', { header: 'Date' }),
      ch.accessor('receipt_number', { header: 'Receipt #' }),
      ch.accessor('client_name', { header: 'Client' }),
      ch.accessor('product_category', { header: 'Product' }),
      ch.accessor('issuer', { header: 'Issuer' }),
      ch.accessor('scheme_name', { header: 'Scheme' }),
      ch.accessor('amount', { header: 'Amount', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('collection_credit', { header: 'CC', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('incentive_amount', {
        header: 'SI',
        cell: (c) => (c.getValue() == null ? '—' : formatMoney(c.getValue()))
      }),
      ch.accessor('branch_code', { header: 'Branch Code' }),
      ch.accessor('emp_code', { header: 'RM' }),
      ch.accessor('status', { header: 'Status' })
    ]
  } else if (slug === 'category-summary') {
    columns = [
      ch.accessor('product_category', { header: 'Product' }),
      ch.accessor('issuer_name', { header: 'Issuer' }),
      ch.accessor('scheme_name', { header: 'Scheme' }),
      ch.accessor('type', { header: 'Type' }),
      ch.accessor('fd_payout_frequency', { header: 'FD Payout' }),
      ch.accessor('applications', { header: 'Applications' }),
      ch.accessor('amount', { header: 'Amount', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('collection_credit', { header: 'CC', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('incentive_amount', {
        header: 'SI',
        cell: (c) => (c.getValue() == null ? '—' : formatMoney(c.getValue()))
      })
    ]
  } else if (slug === 'cashflow') {
    columns = [
      ch.accessor('product_fund', { header: 'Product / fund' }),
      ch.accessor('purchase', { header: 'Purchase', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('sip', { header: 'SIP', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('switch_in', { header: 'Switch in', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('redemption', { header: 'Redemption', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('switch_out', { header: 'Switch out', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('net_flow', { header: 'Net flow', cell: (c) => formatMoney(c.getValue()) })
    ]
  } else if (slug === 'pending-receipts') {
    columns = [
      ch.accessor('receipt_id', { header: 'Receipt ID' }),
      ch.accessor('client_name', { header: 'Client' }),
      ch.accessor('product_type', { header: 'Product' }),
      ch.accessor('amount', { header: 'Amount', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('current_stage', { header: 'Stage' }),
      ch.accessor('assigned_to', { header: 'Assigned' }),
      ch.accessor('days_pending', { header: 'Days pending' })
    ]
  } else if (slug === 'sip-report') {
    columns = [
      ch.accessor('date', { header: 'Receipt Date' }),
      ch.accessor('product_category', { header: 'Product' }),
      ch.accessor('client_name', { header: 'Client' }),
      ch.accessor('folio', { header: 'Folio' }),
      ch.accessor('scheme', { header: 'Scheme' }),
      ch.accessor('sip_amount', { header: 'SIP amount', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('collection_credit', { header: 'CC', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('frequency', { header: 'Frequency' }),
      ch.accessor('start_date', { header: 'Start' }),
      ch.accessor('next_due_date', { header: 'Next Due' }),
      ch.accessor('end_date', { header: 'End' }),
      ch.accessor('branch_code', { header: 'Branch Code' }),
      ch.accessor('emp_code', { header: 'RM' }),
      ch.accessor('status', { header: 'Status' })
    ]
  } else if (slug === 'fd-maturity') {
    columns = [
      ch.accessor('receipt_date', { header: 'Receipt Date' }),
      ch.accessor('maturity_date', { header: 'Maturity Date' }),
      ch.accessor('product_category', { header: 'Product' }),
      ch.accessor('issuer', { header: 'Issuer' }),
      ch.accessor('scheme_name', { header: 'Scheme' }),
      ch.accessor('type', { header: 'Type' }),
      ch.accessor('fd_payout_frequency', { header: 'FD Payout' }),
      ch.accessor('client_name', { header: 'Client' }),
      ch.accessor('amount', { header: 'Amount', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('maturity_amount', { header: 'Maturity Amount', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('collection_credit', { header: 'CC', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('branch_code', { header: 'Branch Code' }),
      ch.accessor('emp_code', { header: 'RM' })
    ]
  }

  return (
    <ReportShell
      title={meta.title}
      description={meta.description}
      filters={
        <ReportFilterBar
          {...f}
          onChange={patchFilters}
          onApply={apply}
          onReset={resetFilters}
          filterProfile={meta.filterProfile}
          dateBasisOptions={meta.dateBasisOptions}
          showGroupBy={slug === 'mis-transactions'}
          showIncludePending={slug !== 'pending-receipts'}
        />
      }
      actions={
        <>
          <Button variant="secondary" asChild>
            <Link to="/analytics">Back</Link>
          </Button>
          <Button type="button" variant="secondary" onClick={() => exportReport('csv').catch((e) => setErr(e.message))}>
            Export CSV
          </Button>
          <Button type="button" variant="secondary" onClick={() => exportReport('xlsx').catch((e) => setErr(e.message))}>
            Export Excel
          </Button>
        </>
      }
    >
      {err && (
        <div className="rounded-xl border border-[var(--error)]/40 bg-[var(--error-muted)] px-4 py-3 text-sm text-[var(--error)]">
          {err}
        </div>
      )}
      {loading && <p className="text-sm text-[var(--dashboard-muted)]">Loading…</p>}
      {!loading && slug !== 'mis-summary' && (
        <>
          {columns.length > 0 && <ReportDataTable columns={columns} data={rows} pageSize={25} />}
          {(slug === 'mis-transactions' || slug === 'product-detail' || slug === 'sip-report' || slug === 'fd-maturity' || slug === 'pending-receipts') &&
            !groupBy && <ServerPager page={page} pageSize={25} total={total} onChange={setPage} />}
        </>
      )}
    </ReportShell>
  )
}
