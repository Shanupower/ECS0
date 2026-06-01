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
import { buildBranchOptions, buildRmOptions, filtersToReportQuery } from '../features/analytics/lib/report-filters.js'
import { buildReportTotalRows, formatReportTotalValue, sumNumericFields } from '../features/analytics/lib/report-totals.js'
import { RECEIPT_PRODUCT_CATEGORY_FILTER_OPTIONS } from '../data/receipt_product_categories.js'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(n))
  } catch {
    return String(n)
  }
}

const PRODUCT_CATEGORY_LABELS = new Map(RECEIPT_PRODUCT_CATEGORY_FILTER_OPTIONS.map((option) => [option.value, option.label]))

function formatProductCategory(value) {
  const key = String(value ?? '').trim()
  if (!key) return '—'
  return PRODUCT_CATEGORY_LABELS.get(key) || key
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

const AGGREGATE_TOTAL_FIELDS = ['applications', 'amount', 'collection_credit', 'incentive_amount']

function visibleMetricFields(fields, { hideCc, hideSi }) {
  return fields.filter((field) => {
    if (hideCc && field === 'collection_credit') return false
    if (hideSi && (field === 'incentive_amount' || field === 'incentive_paid')) return false
    return true
  })
}

function hideSensitiveColumns(columns, { hideCc, hideSi }) {
  return columns.filter((column) => {
    const id = column.id || column.accessorKey
    if (hideCc && id === 'collection_credit') return false
    if (hideSi && (id === 'incentive_amount' || id === 'incentive_paid')) return false
    return true
  })
}

function getReportTotalFields(slug, groupBy) {
  if (slug === 'mis-transactions') {
    return groupBy ? AGGREGATE_TOTAL_FIELDS : ['investment_amount', 'collection_credit', 'incentive_paid']
  }
  if (slug === 'product-sales' || slug === 'mf-category' || slug === 'mf-fund' || slug === 'category-summary') {
    return AGGREGATE_TOTAL_FIELDS
  }
  if (slug === 'product-detail') return ['amount', 'collection_credit', 'incentive_amount']
  if (slug === 'cashflow') return ['purchase', 'sip', 'switch_in', 'redemption', 'switch_out', 'net_flow']
  if (slug === 'pending-receipts') return ['amount']
  if (slug === 'sip-report') return ['sip_amount', 'collection_credit', 'incentive_amount']
  if (slug === 'fd-maturity') return ['amount', 'maturity_amount', 'collection_credit', 'incentive_amount']
  return []
}

function AggregateTotalFooter({ rows, fields = AGGREGATE_TOTAL_FIELDS }) {
  const totals = sumNumericFields(rows, fields)
  return (
    <tfoot className="border-t-2 border-[var(--dashboard-border)] bg-[var(--dashboard-border)]/15">
      <tr>
        <td className="px-4 py-3 font-semibold text-[var(--dashboard-text)]">Total</td>
        {fields.map((field) => (
          <td key={field} className="px-4 py-3 font-semibold text-[var(--dashboard-text)] tabular-nums">
            {formatReportTotalValue(field, totals[field])}
          </td>
        ))}
      </tr>
    </tfoot>
  )
}

function MetricTable({ title, headers, rows, renderRow, emptyMessage = 'No data in this period.' }) {
  if (!rows?.length) return null
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-[var(--dashboard-text)]">{title}</h4>
      <div className="overflow-x-auto rounded-xl border border-[var(--dashboard-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--dashboard-border)]/20 text-left text-[var(--dashboard-muted)]">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-[var(--dashboard-border)]/60">
                {renderRow(row)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <p className="text-xs text-[var(--dashboard-muted)]">{emptyMessage}</p>}
    </div>
  )
}

function CustomerDetailBreakdown({ customer, hideCc, hideSi }) {
  const p = customer.profile || {}
  const s = customer.summary || {}
  const metricCells = (row) => (
    <>
      <td className="px-3 py-2 tabular-nums">{row.applications}</td>
      <td className="px-3 py-2 tabular-nums">{formatMoney(row.amount ?? row.total_investment)}</td>
      {!hideCc && <td className="px-3 py-2 tabular-nums">{formatMoney(row.collection_credit)}</td>}
      {!hideSi && (
        <td className="px-3 py-2 tabular-nums">
          {row.incentive_amount == null ? '—' : formatMoney(row.incentive_amount)}
        </td>
      )}
    </>
  )
  const metricHeaders = ['Applications', 'Amount', ...(hideCc ? [] : ['CC']), ...(hideSi ? [] : ['SI'])]

  return (
    <div className="rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] p-4 sm:p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-[var(--dashboard-muted)]">Customer ID</p>
          <p className="font-medium text-[var(--dashboard-text)]">{customer.customer_id}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--dashboard-muted)]">Name</p>
          <p className="font-medium text-[var(--dashboard-text)]">{p.name || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--dashboard-muted)]">PAN</p>
          <p className="font-medium text-[var(--dashboard-text)]">{p.pan || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--dashboard-muted)]">Mobile</p>
          <p className="font-medium text-[var(--dashboard-text)]">{p.mobile || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--dashboard-muted)]">City / State</p>
          <p className="font-medium text-[var(--dashboard-text)]">
            {[p.city, p.state].filter(Boolean).join(', ') || '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--dashboard-muted)]">Zip / PIN</p>
          <p className="font-medium text-[var(--dashboard-text)]">{p.pin || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--dashboard-muted)]">Branch</p>
          <p className="font-medium text-[var(--dashboard-text)]">{p.branch || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--dashboard-muted)]">RM</p>
          <p className="font-medium text-[var(--dashboard-text)]">{p.relationship_manager || '—'}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm border-t border-[var(--dashboard-border)]/60 pt-3">
        <span>
          <span className="text-[var(--dashboard-muted)]">Applications: </span>
          <span className="font-semibold tabular-nums">{s.applications ?? 0}</span>
        </span>
        <span>
          <span className="text-[var(--dashboard-muted)]">Total investment: </span>
          <span className="font-semibold tabular-nums">{formatMoney(s.total_investment)}</span>
        </span>
        {!hideCc && (
          <span>
            <span className="text-[var(--dashboard-muted)]">CC: </span>
            <span className="font-semibold tabular-nums">{formatMoney(s.collection_credit)}</span>
          </span>
        )}
      </div>
      <MetricTable
        title="By product"
        headers={['Product', ...metricHeaders]}
        rows={customer.by_product}
        renderRow={(row) => (
          <>
            <td className="px-3 py-2">{formatProductCategory(row.product_category)}</td>
            {metricCells(row)}
          </>
        )}
      />
      <MetricTable
        title="By MF scheme category"
        headers={['Category', ...metricHeaders]}
        rows={customer.by_scheme_category}
        renderRow={(row) => (
          <>
            <td className="px-3 py-2">{row.scheme_category}</td>
            {metricCells(row)}
          </>
        )}
      />
      <MetricTable
        title="By fund / scheme"
        headers={['Issuer', 'Scheme', ...metricHeaders]}
        rows={customer.by_fund}
        renderRow={(row) => (
          <>
            <td className="px-3 py-2">{row.issuer}</td>
            <td className="px-3 py-2">{row.scheme_name}</td>
            {metricCells(row)}
          </>
        )}
      />
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
  const [users, setUsers] = React.useState([])
  const [branches, setBranches] = React.useState([])
  const [schemeCategoryOptions, setSchemeCategoryOptions] = React.useState([])
  const branchOptions = React.useMemo(() => buildBranchOptions(branches), [branches])
  const rmOptions = React.useMemo(() => buildRmOptions(users), [users])
  const hideCc = !!f.hideCc
  const hideSi = !!f.hideSi
  const aggregateTotalFields = React.useMemo(
    () => visibleMetricFields(AGGREGATE_TOTAL_FIELDS, { hideCc, hideSi }),
    [hideCc, hideSi]
  )
  const rmOptionByCode = React.useMemo(() => {
    const map = new Map()
    rmOptions.forEach((option) => map.set(option.value, option))
    return map
  }, [rmOptions])

  const patchFilters = (patch) => {
    setF((prev) => ({ ...prev, ...patch }))
    setPage(1)
  }

  React.useEffect(() => {
    setF(defaults)
    setPage(1)
    setPayload(null)
    setFetchNonce((n) => n + 1)
  }, [defaults])

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
    if (slug === 'customer-detail' && (!f.investorIds || f.investorIds.length === 0)) {
      setPayload(null)
      setLoading(false)
      setErr('')
      return
    }
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
          case 'customer-detail':
            data = await api.reportsCustomerDetail(token, q)
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
    if (slug === 'customer-detail' && (!f.investorIds || f.investorIds.length === 0)) {
      return Promise.reject(new Error('Select at least one customer'))
    }
    const q = filtersToReportQuery(f, { page: 1, pageSize: 50000 })
    return downloadReportFile(token, slug, q, format)
  }

  const customerDetailFilterBar = (
    <ReportFilterBar
      {...f}
      onChange={patchFilters}
      onApply={apply}
      onReset={resetFilters}
      token={token}
      filterProfile={meta.filterProfile}
      requireInvestorSelection
      dateBasisOptions={meta.dateBasisOptions}
      branchOptions={branchOptions}
      rmOptions={rmOptions}
      schemeCategoryOptions={schemeCategoryOptions}
      showIncludePending
    />
  )

  if (slug === 'customer-detail') {
    const txnRows = payload?.transactions?.rows || []
    const txnTotal = payload?.transactions?.total ?? 0
    const txnTotals = payload?.transactions?.totals
    const ch = createColumnHelper()
    const txnColumns = hideSensitiveColumns(
      [
        ch.accessor('customer_name', { header: 'Customer' }),
        ch.accessor('date', { header: 'Date' }),
        ch.accessor('receipt_number', { header: 'Receipt #' }),
        ch.accessor('product_category', {
          header: 'Product',
          cell: (c) => formatProductCategory(c.getValue())
        }),
        ch.accessor('issuer', { header: 'Issuer' }),
        ch.accessor('scheme_name', { header: 'Scheme' }),
        ch.accessor('transaction_type', { header: 'Txn type' }),
        ch.accessor('amount', { header: 'Amount', cell: (c) => formatMoney(c.getValue()) }),
        ch.accessor('collection_credit', { header: 'CC', cell: (c) => formatMoney(c.getValue()) }),
        ch.accessor('incentive_amount', {
          header: 'SI',
          cell: (c) => (c.getValue() == null ? '—' : formatMoney(c.getValue()))
        }),
        ch.accessor('branch_code', { header: 'Branch' }),
        ch.accessor('emp_code', { header: 'RM' }),
        ch.accessor('status', { header: 'Status' })
      ],
      { hideCc, hideSi }
    )
    const txnTotalRows = txnTotals
      ? [
          {
            label: 'Total',
            values: {
              amount: txnTotals.amount,
              collection_credit: hideCc ? undefined : txnTotals.collection_credit,
              incentive_amount: hideSi ? undefined : txnTotals.incentive_amount
            }
          }
        ]
      : []

    return (
      <ReportShell
        title={meta.title}
        description={meta.description}
        summaryCards={
          payload?.grand_totals
            ? [
                { label: 'Applications', value: String(payload.grand_totals.applications ?? 0) },
                { label: 'Total investment', value: formatMoney(payload.grand_totals.total_investment) },
                !hideCc && { label: 'Collection credit', value: formatMoney(payload.grand_totals.collection_credit) }
              ].filter(Boolean)
            : []
        }
        filters={customerDetailFilterBar}
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link to="/analytics">Back</Link>
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!f.investorIds?.length}
              onClick={() => exportReport('csv').catch((e) => setErr(e.message))}
            >
              Export CSV
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!f.investorIds?.length}
              onClick={() => exportReport('xlsx').catch((e) => setErr(e.message))}
            >
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
        {!f.investorIds?.length && (
          <p className="text-sm text-[var(--dashboard-muted)]">
            Search and select one or more customers, then apply filters to load the report.
          </p>
        )}
        {loading && <p className="text-sm text-[var(--dashboard-muted)]">Loading…</p>}
        {!loading && payload && (
          <div className="space-y-6">
            {(payload.customers || []).map((customer) => {
              const useAccordion = (payload.customers || []).length > 1
              const title = customer.profile?.name || `Customer ${customer.customer_id}`
              const body = <CustomerDetailBreakdown customer={customer} hideCc={hideCc} hideSi={hideSi} />
              if (!useAccordion) {
                return (
                  <div key={String(customer.customer_id)}>
                    <h3 className="text-base font-semibold text-[var(--dashboard-text)] mb-3">{title}</h3>
                    {body}
                  </div>
                )
              }
              return (
                <details
                  key={String(customer.customer_id)}
                  className="rounded-2xl border border-[var(--dashboard-border)] open:bg-[var(--dashboard-card)]/50"
                  open
                >
                  <summary className="cursor-pointer px-4 py-3 font-semibold text-[var(--dashboard-text)]">
                    {title}
                    <span className="ml-2 text-xs font-normal text-[var(--dashboard-muted)]">
                      ID {customer.customer_id}
                    </span>
                  </summary>
                  <div className="px-2 pb-4">{body}</div>
                </details>
              )
            })}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-[var(--dashboard-text)]">Transactions</h3>
              <ReportDataTable
                columns={txnColumns}
                data={txnRows}
                pageSize={25}
                totalRows={txnTotalRows}
                formatTotalValue={formatReportTotalValue}
              />
              <ServerPager page={page} pageSize={25} total={txnTotal} onChange={setPage} />
            </div>
          </div>
        )}
      </ReportShell>
    )
  }

  if (slug === 'mis-summary') {
    const chartData = (payload?.product_summary || []).map((r) => ({
      name: formatProductCategory(r.product_type),
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
                !hideCc && { label: 'Prev. month CC', value: formatMoney(payload.previous_month_totals?.collection_credit) },
                !hideSi && {
                  label: 'Prev. month incentive',
                  value:
                    payload.previous_month_totals?.incentive_amount == null
                      ? '—'
                      : formatMoney(payload.previous_month_totals?.incentive_amount)
                }
              ].filter(Boolean)
            : []
        }
        filters={
          <ReportFilterBar
            {...f}
            onChange={patchFilters}
            onApply={apply}
            onReset={resetFilters}
            token={token}
            filterProfile={meta.filterProfile}
            dateBasisOptions={meta.dateBasisOptions}
            branchOptions={branchOptions}
            rmOptions={rmOptions}
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
              {!hideCc && <div className="flex justify-between gap-4">
                <dt className="text-[var(--dashboard-muted)]">CC</dt>
                <dd className="tabular-nums">{formatMoney(payload.previous_month_totals?.collection_credit)}</dd>
              </div>}
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
                  {!hideCc && <th className="px-4 py-2">CC</th>}
                  {!hideSi && <th className="px-4 py-2">Incentive</th>}
                </tr>
              </thead>
              <tbody>
                {(payload.product_summary || []).map((r) => (
                  <tr key={r.product_type} className="border-t border-[var(--dashboard-border)]/60">
                    <td className="px-4 py-2">{formatProductCategory(r.product_type)}</td>
                    <td className="px-4 py-2 tabular-nums">{r.applications}</td>
                    <td className="px-4 py-2 tabular-nums">{formatMoney(r.amount)}</td>
                    {!hideCc && <td className="px-4 py-2 tabular-nums">{formatMoney(r.collection_credit)}</td>}
                    {!hideSi && <td className="px-4 py-2 tabular-nums">
                      {r.incentive_amount == null ? '—' : formatMoney(r.incentive_amount)}
                    </td>}
                  </tr>
                ))}
              </tbody>
              <AggregateTotalFooter rows={payload.product_summary || []} fields={aggregateTotalFields} />
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
                  {!hideCc && <th className="px-4 py-2">CC</th>}
                  {!hideSi && <th className="px-4 py-2">Incentive</th>}
                </tr>
              </thead>
              <tbody>
                {(payload.mf_category_summary || []).map((r) => (
                  <tr key={r.category} className="border-t border-[var(--dashboard-border)]/60">
                    <td className="px-4 py-2">{r.category}</td>
                    <td className="px-4 py-2 tabular-nums">{r.applications}</td>
                    <td className="px-4 py-2 tabular-nums">{formatMoney(r.amount)}</td>
                    {!hideCc && <td className="px-4 py-2 tabular-nums">{formatMoney(r.collection_credit)}</td>}
                    {!hideSi && <td className="px-4 py-2 tabular-nums">
                      {r.incentive_amount == null ? '—' : formatMoney(r.incentive_amount)}
                    </td>}
                  </tr>
                ))}
              </tbody>
              <AggregateTotalFooter rows={payload.mf_category_summary || []} fields={aggregateTotalFields} />
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
                  {!hideCc && <th className="px-4 py-2">CC</th>}
                  {!hideSi && <th className="px-4 py-2">Incentive</th>}
                </tr>
              </thead>
              <tbody>
                {(payload.issuer_sales || []).map((r) => (
                  <tr key={r.company_fund_name} className="border-t border-[var(--dashboard-border)]/60">
                    <td className="px-4 py-2">{r.company_fund_name}</td>
                    <td className="px-4 py-2 tabular-nums">{r.applications}</td>
                    <td className="px-4 py-2 tabular-nums">{formatMoney(r.amount)}</td>
                    {!hideCc && <td className="px-4 py-2 tabular-nums">{formatMoney(r.collection_credit)}</td>}
                    {!hideSi && <td className="px-4 py-2 tabular-nums">
                      {r.incentive_amount == null ? '—' : formatMoney(r.incentive_amount)}
                    </td>}
                  </tr>
                ))}
              </tbody>
              <AggregateTotalFooter rows={payload.issuer_sales || []} fields={aggregateTotalFields} />
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
            ch.accessor('group_key', {
              header: 'RM',
              cell: (c) => {
                const code = String(c.getValue() || '').trim()
                const name = c.row.original.employee_name || rmOptionByCode.get(code)?.label || ''
                return (
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--dashboard-text)]">{name || code || 'Unknown RM'}</div>
                    {code && (
                      <div className="text-xs text-[var(--dashboard-muted)]">
                        Emp code: {code}
                      </div>
                    )}
                  </div>
                )
              }
            }),
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
        ch.accessor('product_category', { header: 'Product', cell: (c) => formatProductCategory(c.getValue()) })
      ]
    }
  } else if (slug === 'product-sales' || slug === 'mf-category') {
    const key = slug === 'mf-category' ? 'category' : 'product_type'
    columns = [
      ch.accessor(key, {
        header: slug === 'mf-category' ? 'Category' : 'Product',
        cell: (c) => (slug === 'mf-category' ? c.getValue() : formatProductCategory(c.getValue()))
      }),
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
      ch.accessor('product_category', { header: 'Product', cell: (c) => formatProductCategory(c.getValue()) }),
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
      ch.accessor('product_category', { header: 'Product', cell: (c) => formatProductCategory(c.getValue()) }),
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
      ch.accessor('product_type', { header: 'Product', cell: (c) => formatProductCategory(c.getValue()) }),
      ch.accessor('amount', { header: 'Amount', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('current_stage', { header: 'Stage' }),
      ch.accessor('assigned_to', { header: 'Assigned' }),
      ch.accessor('days_pending', { header: 'Days pending' })
    ]
  } else if (slug === 'sip-report') {
    columns = [
      ch.accessor('date', { header: 'Receipt Date' }),
      ch.accessor('product_category', { header: 'Product', cell: (c) => formatProductCategory(c.getValue()) }),
      ch.accessor('client_name', { header: 'Client' }),
      ch.accessor('folio', { header: 'Folio' }),
      ch.accessor('scheme', { header: 'Scheme' }),
      ch.accessor('sip_amount', { header: 'SIP amount', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('collection_credit', { header: 'CC', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('incentive_amount', {
        header: 'SI',
        cell: (c) => (c.getValue() == null ? '—' : formatMoney(c.getValue()))
      }),
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
      ch.accessor('product_category', { header: 'Product Category', cell: (c) => formatProductCategory(c.getValue()) }),
      ch.accessor('issuer', { header: 'Issuer' }),
      ch.accessor('scheme_name', { header: 'Scheme' }),
      ch.accessor('type', { header: 'Type' }),
      ch.accessor('fd_payout_frequency', { header: 'FD Payout' }),
      ch.accessor('client_name', { header: 'Client' }),
      ch.accessor('amount', { header: 'Amount', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('maturity_amount', { header: 'Maturity Amount', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('collection_credit', { header: 'CC', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('incentive_amount', {
        header: 'SI',
        cell: (c) => (c.getValue() == null ? '—' : formatMoney(c.getValue()))
      }),
      ch.accessor('branch_code', { header: 'Branch Code' }),
      ch.accessor('emp_code', { header: 'RM' })
    ]
  }
  columns = hideSensitiveColumns(columns, { hideCc, hideSi })

  const totalRows = payload
    ? buildReportTotalRows({
        rows,
        fields: visibleMetricFields(getReportTotalFields(slug, groupBy), { hideCc, hideSi }),
        filteredTotals: payload.totals
      })
    : []

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
          token={token}
          filterProfile={meta.filterProfile}
          dateBasisOptions={meta.dateBasisOptions}
          branchOptions={branchOptions}
          rmOptions={rmOptions}
          schemeCategoryOptions={schemeCategoryOptions}
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
          {columns.length > 0 && (
            <ReportDataTable
              columns={columns}
              data={rows}
              pageSize={25}
              totalRows={totalRows}
              formatTotalValue={formatReportTotalValue}
            />
          )}
          {(slug === 'mis-transactions' || slug === 'product-detail' || slug === 'sip-report' || slug === 'fd-maturity' || slug === 'pending-receipts') &&
            !groupBy && <ServerPager page={page} pageSize={25} total={total} onChange={setPage} />}
        </>
      )}
    </ReportShell>
  )
}
