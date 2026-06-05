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
import {
  buildBranchOptions,
  buildIssuerOptions,
  buildRmOptions,
  buildSchemeOptions,
  canRunCustomerDetailReport,
  filtersToCustomerListQuery,
  filtersToReportQuery,
  toggleListValue
} from '../features/analytics/lib/report-filters.js'
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

/** Group issuer_sales rows by product_type, ordered like product_summary when present. */
function groupIssuerSalesByCategory(issuerSales, productSummary = []) {
  const groups = new Map()
  for (const row of issuerSales || []) {
    const key = String(row.product_type ?? 'Other')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  const order = (productSummary || []).map((r) => String(r.product_type ?? ''))
  const keys = [...groups.keys()]
  keys.sort((a, b) => {
    const ia = order.indexOf(a)
    const ib = order.indexOf(b)
    if (ia >= 0 && ib >= 0) return ia - ib
    if (ia >= 0) return -1
    if (ib >= 0) return 1
    return formatProductCategory(a).localeCompare(formatProductCategory(b))
  })
  return keys.map((k) => [k, groups.get(k)])
}

function formatReportDate(value) {
  if (value == null || value === '') return '—'
  const raw = String(value).trim()
  if (!raw) return '—'
  const d = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`)
  if (Number.isNaN(d.getTime())) return raw
  try {
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return raw
  }
}

function formatReportCell(value) {
  if (value == null || value === '') return '—'
  return String(value)
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

const SERVER_PAGED_SLUGS = new Set([
  'mis-transactions',
  'product-detail',
  'sip-report',
  'fd-maturity',
  'pending-receipts',
  'customer-detail'
])

function isServerPaged(reportSlug, groupBy) {
  return SERVER_PAGED_SLUGS.has(reportSlug) && !(reportSlug === 'mis-transactions' && groupBy)
}

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
  if (slug === 'mf-fund' || slug === 'category-summary') {
    return AGGREGATE_TOTAL_FIELDS
  }
  if (slug === 'product-detail') return ['amount', 'collection_credit', 'incentive_amount']
  if (slug === 'pending-receipts') return ['amount']
  if (slug === 'sip-report') return ['sip_amount', 'collection_credit', 'incentive_amount']
  if (slug === 'fd-maturity') return ['amount', 'maturity_amount', 'collection_credit', 'incentive_amount']
  return []
}

function AggregateTotalFooter({ rows, fields = AGGREGATE_TOTAL_FIELDS, label = 'Total' }) {
  const totals = sumNumericFields(rows, fields)
  return (
    <tfoot className="border-t-2 border-[var(--dashboard-border)] bg-[var(--dashboard-border)]/15">
      <tr>
        <td className="px-4 py-3 font-semibold text-[var(--dashboard-text)]">{label}</td>
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
    </div>
  )
}

export default function AnalyticsReportPage() {
  const { slug } = useParams()
  const { token } = useAuth()
  const meta = React.useMemo(() => getReportMeta(slug), [slug])
  const defaults = React.useMemo(() => getInitialReportFilters(slug), [slug])
  const [f, setF] = React.useState(defaults)
  /** Filters sent to report APIs — updated on Apply, Reset, and initial load. */
  const [appliedF, setAppliedF] = React.useState(defaults)
  const [page, setPage] = React.useState(1)
  /** Bumps when user clicks Apply so we refetch even if `appliedF` and `page` are unchanged. */
  const [fetchNonce, setFetchNonce] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState('')
  const [payload, setPayload] = React.useState(null)
  const [customerListPage, setCustomerListPage] = React.useState(1)
  const [customerList, setCustomerList] = React.useState(null)
  const [listLoading, setListLoading] = React.useState(false)
  const [users, setUsers] = React.useState([])
  const [branches, setBranches] = React.useState([])
  const [schemeCategoryOptions, setSchemeCategoryOptions] = React.useState([])
  const [schemeCategoriesLoading, setSchemeCategoriesLoading] = React.useState(true)
  const [issuerNames, setIssuerNames] = React.useState([])
  const [schemeNames, setSchemeNames] = React.useState([])
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = React.useState('')
  const branchOptions = React.useMemo(() => buildBranchOptions(branches), [branches])
  const rmOptions = React.useMemo(() => buildRmOptions(users), [users])
  const issuerOptions = React.useMemo(() => buildIssuerOptions(issuerNames), [issuerNames])
  const schemeOptions = React.useMemo(() => buildSchemeOptions(schemeNames), [schemeNames])
  const hideCc = !!appliedF.hideCc
  const hideSi = !!appliedF.hideSi
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
    setCustomerListPage(1)
  }

  React.useEffect(() => {
    setF(defaults)
    setAppliedF(defaults)
    setPage(1)
    setCustomerListPage(1)
    setDebouncedCustomerSearch('')
    setPayload(null)
    setCustomerList(null)
    setFetchNonce((n) => n + 1)
  }, [defaults])

  React.useEffect(() => {
    if (!token) {
      setSchemeCategoriesLoading(false)
      return
    }
    let cancelled = false
    setSchemeCategoriesLoading(true)
    Promise.all([
      api.listUsers(token).catch(() => []),
      api.listBranches(token, { includeInactive: '1' }).catch(() => []),
      api.reportsFilterOptions(token).catch(() => ({ scheme_categories: [], issuer_names: [], scheme_names: [] }))
    ])
      .then(([usersRes, branchesRes, filterOpts]) => {
        if (cancelled) return
        setUsers(Array.isArray(usersRes) ? usersRes : usersRes?.items || [])
        setBranches(Array.isArray(branchesRes) ? branchesRes : branchesRes?.items || [])
        setSchemeCategoryOptions(
          Array.isArray(filterOpts?.scheme_categories) ? filterOpts.scheme_categories : []
        )
        if (slug !== 'product-detail') {
          setIssuerNames(Array.isArray(filterOpts?.issuer_names) ? filterOpts.issuer_names : [])
          setSchemeNames(Array.isArray(filterOpts?.scheme_names) ? filterOpts.scheme_names : [])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUsers([])
          setBranches([])
          setSchemeCategoryOptions([])
          if (slug !== 'product-detail') {
            setIssuerNames([])
            setSchemeNames([])
          }
        }
      })
      .finally(() => {
        if (!cancelled) setSchemeCategoriesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, slug])

  React.useEffect(() => {
    if (slug !== 'product-detail' || !token) return
    let cancelled = false
    const categories = (f.productCategories || []).filter(Boolean)
    if (!categories.length) {
      setIssuerNames([])
      setSchemeNames([])
      setF((prev) => ({
        ...prev,
        issuerNames: [],
        schemeNames: []
      }))
      return undefined
    }
    const selectedIssuers = (f.issuerNames || []).filter(Boolean)
    const selectedSchemes = (f.schemeNames || []).filter(Boolean)
    const filterQuery = { product_categories: categories.join(',') }
    if (selectedIssuers.length) filterQuery.issuer_names = selectedIssuers.join(',')
    if (selectedSchemes.length) filterQuery.scheme_names = selectedSchemes.join(',')

    api
      .reportsFilterOptions(token, filterQuery)
      .then((filterOpts) => {
        if (cancelled) return
        const nextIssuers = Array.isArray(filterOpts?.issuer_names) ? filterOpts.issuer_names : []
        const nextSchemes = Array.isArray(filterOpts?.scheme_names) ? filterOpts.scheme_names : []
        setIssuerNames(nextIssuers)
        setSchemeNames(nextSchemes)
        setF((prev) => ({
          ...prev,
          issuerNames: (prev.issuerNames || []).filter((name) => nextIssuers.includes(name)),
          schemeNames: (prev.schemeNames || []).filter((name) => nextSchemes.includes(name))
        }))
      })
      .catch(() => {
        if (!cancelled) {
          setIssuerNames([])
          setSchemeNames([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [slug, token, f.productCategories, f.issuerNames, f.schemeNames])

  React.useEffect(() => {
    const raw = String(f.customerSearch || '').trim()
    const normalized = raw.length >= 2 ? raw : ''
    const timer = window.setTimeout(() => {
      setDebouncedCustomerSearch(normalized)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [f.customerSearch])

  React.useEffect(() => {
    if (slug !== 'customer-detail') return
    setCustomerListPage(1)
  }, [slug, debouncedCustomerSearch])

  const apply = React.useCallback(() => {
    setAppliedF(f)
    setPage(1)
    setCustomerListPage(1)
    setFetchNonce((n) => n + 1)
  }, [f])

  const resetFilters = React.useCallback(() => {
    const init = getInitialReportFilters(slug)
    setF(init)
    setAppliedF(init)
    setPage(1)
    setCustomerListPage(1)
    setFetchNonce((n) => n + 1)
  }, [slug])

  React.useEffect(() => {
    if (!token || !slug || slug !== 'customer-detail' || fetchNonce < 1) return
    let cancelled = false
    ;(async () => {
      setListLoading(true)
      try {
        const skipCount = customerListPage > 1 && customerList?.total != null
        const listQ = filtersToCustomerListQuery(
          { ...appliedF, customerSearch: debouncedCustomerSearch },
          { customerPage: customerListPage, skipCount }
        )
        const listData = await api.reportsCustomerDetailCustomers(token, listQ)
        if (!cancelled) {
          setCustomerList((prev) => ({
            ...listData,
            total:
              listData.total_known === false && prev?.total != null ? prev.total : (listData.total ?? 0)
          }))
        }
      } catch (e) {
        if (!cancelled) setCustomerList(null)
      } finally {
        if (!cancelled) setListLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, slug, appliedF, customerListPage, fetchNonce, debouncedCustomerSearch])

  React.useEffect(() => {
    if (!token || !slug) return
    if (slug === 'customer-detail') {
      if (fetchNonce < 1) return
      let cancelled = false
      ;(async () => {
        setLoading(true)
        setErr('')
        try {
          if (canRunCustomerDetailReport(appliedF)) {
            const q = filtersToReportQuery(appliedF, { page, pageSize: 25 })
            const data = await api.reportsCustomerDetail(token, q)
            if (!cancelled) setPayload(data)
          } else if (!cancelled) {
            setPayload(null)
          }
        } catch (e) {
          if (!cancelled) setErr(e.message || 'Failed to load report')
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
      return () => {
        cancelled = true
      }
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr('')
      try {
        const q = filtersToReportQuery(appliedF, { page, pageSize: 25 })
        let data
        switch (slug) {
          case 'mis-summary':
            data = await api.reportsMisSummary(token, q)
            break
          case 'mis-transactions':
            data = await api.reportsMisTransactions(token, q)
            break
          case 'product-detail':
            data = await api.reportsProductDetail(token, q)
            break
          case 'category-summary':
            data = await api.reportsCategorySummary(token, q)
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
  }, [token, slug, appliedF, page, fetchNonce])

  const exportReport = (format) => {
    if (slug === 'customer-detail' && !canRunCustomerDetailReport(appliedF)) {
      return Promise.reject(new Error('Select customers or choose branch / product filters'))
    }
    const q = filtersToReportQuery(appliedF, { page: 1, pageSize: 50000 })
    return downloadReportFile(token, slug, q, format)
  }

  const toggleCustomerSelection = (investorId) => {
    const updater = (prev) => ({ ...prev, investorIds: toggleListValue(prev.investorIds, investorId) })
    setF(updater)
    setAppliedF(updater)
  }

  const selectAllOnCustomerPage = () => {
    const pageIds = (customerList?.customers || []).map((c) => String(c.investor_id))
    const updater = (prev) => {
      const set = new Set((prev.investorIds || []).map(String))
      pageIds.forEach((id) => set.add(id))
      return { ...prev, investorIds: Array.from(set) }
    }
    setF(updater)
    setAppliedF(updater)
  }

  const toggleCustomerListSort = (field) => {
    const updater = (prev) => {
      const current = String(prev.customerSort || 'name:asc')
      const [curField, curDir] = current.split(':')
      const nextDir =
        curField === field && curDir === 'asc' ? 'desc' : curField === field && curDir === 'desc' ? 'asc' : 'asc'
      return { ...prev, customerSort: `${field}:${nextDir}` }
    }
    setF(updater)
    setAppliedF(updater)
    setCustomerListPage(1)
    setFetchNonce((n) => n + 1)
  }

  const customerListSortIndicator = (field) => {
    const s = String(appliedF.customerSort || '')
    if (s === `${field}:asc`) return ' ↑'
    if (s === `${field}:desc`) return ' ↓'
    return ''
  }

  const selectAllMatchingCustomers = async () => {
    try {
      const res = await api.reportsCustomerDetailCustomerIds(
        token,
        filtersToCustomerListQuery(appliedF, { customerPage: 1, customerPageSize: 50 })
      )
      const updater = (prev) => ({ ...prev, investorIds: res.investor_ids || [] })
      setF(updater)
      setAppliedF(updater)
      if (res.truncated) {
        setErr(`Selected first ${res.investor_ids?.length ?? 0} customers (limit reached). Narrow filters if needed.`)
      }
    } catch (e) {
      setErr(e.message || 'Failed to select customers')
    }
  }

  const appliedFilterHint = {
    appliedFrom: appliedF.from,
    appliedTo: appliedF.to,
    appliedDateBasis: appliedF.dateBasis
  }

  const customerDetailFilterBar = (
    <ReportFilterBar
      {...f}
      {...appliedFilterHint}
      onChange={patchFilters}
      onApply={apply}
      onReset={resetFilters}
      token={token}
      filterProfile={meta.filterProfile}
      customerSearch={f.customerSearch}
      dateBasisOptions={meta.dateBasisOptions}
      branchOptions={branchOptions}
      rmOptions={rmOptions}
      schemeCategoryOptions={schemeCategoryOptions}
      schemeCategoriesLoading={schemeCategoriesLoading}
      showIncludePending
    />
  )

  const selectedInvestorSet = React.useMemo(
    () => new Set((f.investorIds || []).map(String)),
    [f.investorIds]
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
              disabled={!canRunCustomerDetailReport(appliedF)}
              onClick={() => exportReport('csv').catch((e) => setErr(e.message))}
            >
              Export CSV
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!canRunCustomerDetailReport(appliedF)}
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
        {fetchNonce < 1 && (
          <p className="text-sm text-[var(--dashboard-muted)]">
            Click &quot;Apply filters &amp; load customers&quot; to load the customer list. Use branch or product
            filters to narrow results, select rows, or run the report for all customers in the selected scope.
          </p>
        )}

        {fetchNonce >= 1 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-[var(--dashboard-text)]">
                Customers
                {customerList?.total != null && (
                  <span className="ml-2 text-sm font-normal text-[var(--dashboard-muted)]">
                    ({customerList.total} total)
                  </span>
                )}
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={selectAllOnCustomerPage}>
                  Select page
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={selectAllMatchingCustomers}>
                  Select all matching
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => patchFilters({ investorIds: [] })}>
                  Clear selection
                </Button>
              </div>
            </div>
            {listLoading && <p className="text-sm text-[var(--dashboard-muted)]">Loading customer list…</p>}
            {!listLoading && customerList && (
              <>
                <div className="overflow-x-auto rounded-2xl border border-[var(--dashboard-border)]">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--dashboard-border)]/20 text-left text-[var(--dashboard-muted)]">
                      <tr>
                        <th className="px-3 py-2 w-10" />
                        <th className="px-3 py-2">ID</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">PAN</th>
                        <th className="px-3 py-2">Mobile</th>
                        <th className="px-3 py-2">City</th>
                        <th className="px-3 py-2 text-right">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 font-medium hover:text-[var(--dashboard-text)] transition-colors ml-auto"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleCustomerListSort('total_investment')
                            }}
                          >
                            Total investment
                            <span className="text-[var(--accent)] tabular-nums">
                              {customerListSortIndicator('total_investment')}
                            </span>
                          </button>
                        </th>
                        <th className="px-3 py-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 font-medium hover:text-[var(--dashboard-text)] transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleCustomerListSort('pin')
                            }}
                          >
                            Zip / PIN
                            <span className="text-[var(--accent)] tabular-nums">
                              {customerListSortIndicator('pin')}
                            </span>
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(customerList.customers || []).map((c) => {
                        const id = String(c.investor_id)
                        const checked = selectedInvestorSet.has(id)
                        return (
                          <tr
                            key={id}
                            className="border-t border-[var(--dashboard-border)]/60 hover:bg-[var(--dashboard-border)]/10 cursor-pointer"
                            onClick={() => toggleCustomerSelection(id)}
                          >
                            <td className="px-3 py-2">
                              <input type="checkbox" readOnly checked={checked} className="pointer-events-none" />
                            </td>
                            <td className="px-3 py-2 tabular-nums">{c.investor_id}</td>
                            <td className="px-3 py-2">{c.name || '—'}</td>
                            <td className="px-3 py-2">{c.pan || '—'}</td>
                            <td className="px-3 py-2">{c.mobile || '—'}</td>
                            <td className="px-3 py-2">{c.city || '—'}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{formatMoney(c.total_investment)}</td>
                            <td className="px-3 py-2 tabular-nums">{c.pin || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <ServerPager
                  page={customerListPage}
                  pageSize={customerList.page_size || 50}
                  total={customerList.total || 0}
                  onChange={setCustomerListPage}
                />
              </>
            )}
            {(f.investorIds || []).length > 0 && (
              <p className="text-xs text-[var(--dashboard-muted)]">
                {f.investorIds.length} customer(s) selected for the detail report.
              </p>
            )}
            {canRunCustomerDetailReport(appliedF) && (f.investorIds || []).length === 0 && (appliedF.branchCodes || []).length > 0 && (
              <p className="text-xs text-[var(--dashboard-muted)]">
                No individual selection — report will include all customers in the selected branch(es).
              </p>
            )}
            {canRunCustomerDetailReport(appliedF) && (f.investorIds || []).length === 0 && (appliedF.productCategories || []).length > 0 && (
              <p className="text-xs text-[var(--dashboard-muted)]">
                No individual selection — report will include all investors with receipts in the selected product(s)
                for this period.
              </p>
            )}
          </div>
        )}

        {loading && canRunCustomerDetailReport(appliedF) && (
          <p className="text-sm text-[var(--dashboard-muted)]">Loading report…</p>
        )}
        {payload?.scope?.truncated && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Showing first {payload.investor_ids?.length ?? 0} of {payload.scope.total_matched} matching customers.
            Narrow branch or product filters to see more.
          </p>
        )}
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
                manualPagination={isServerPaged(slug)}
              />
              {isServerPaged(slug) && (
                <ServerPager page={page} pageSize={25} total={txnTotal} onChange={setPage} />
              )}
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
        filters={
          <ReportFilterBar
            {...f}
            {...appliedFilterHint}
            onChange={patchFilters}
            onApply={apply}
            onReset={resetFilters}
            token={token}
            filterProfile={meta.filterProfile}
            dateBasisOptions={meta.dateBasisOptions}
            branchOptions={branchOptions}
            rmOptions={rmOptions}
            schemeCategoryOptions={schemeCategoryOptions}
            schemeCategoriesLoading={schemeCategoriesLoading}
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
            <Button type="button" variant="secondary" onClick={() => exportReport('xlsx').catch((e) => setErr(e.message))}>
              Export Excel
            </Button>
            <Button type="button" variant="secondary" onClick={() => exportReport('pdf').catch((e) => setErr(e.message))}>
              Export PDF
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
            <div className="rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] h-72" />
            <div className="h-32 rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)]" />
          </div>
        )}
        {!loading && payload && (
          <>
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
          {(groupIssuerSalesByCategory(payload.issuer_sales, payload.product_summary) || []).map(([productType, categoryRows]) => (
            <div key={String(productType)} className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wide text-[var(--dashboard-muted)]">
                {formatProductCategory(productType)}
              </h4>
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
                    {categoryRows.map((r) => (
                      <tr key={`${productType}-${r.company_fund_name}`} className="border-t border-[var(--dashboard-border)]/60">
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
                  <AggregateTotalFooter rows={categoryRows} fields={aggregateTotalFields} />
                </table>
              </div>
            </div>
          ))}
          {(payload.issuer_sales || []).length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-[var(--dashboard-border)] mt-2">
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
                <tbody />
                <AggregateTotalFooter rows={payload.issuer_sales || []} fields={aggregateTotalFields} label="Combined total" />
              </table>
            </div>
          )}
          {(payload.issuer_sales || []).length === 0 && (
            <p className="text-sm text-[var(--dashboard-muted)]">No company / fund sales in this period.</p>
          )}
        </div>
        </>
        )}
      </ReportShell>
    )
  }

  const rawRows = payload?.rows || payload?.items || []
  const fundQuery = String(f.fundSearch || '').trim().toLowerCase()
  const rows =
    slug === 'mf-fund' && fundQuery
      ? rawRows.filter((row) => String(row.fund_name || '').toLowerCase().includes(fundQuery))
      : rawRows
  const total = payload?.total ?? rawRows.length
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
        ch.accessor('issuer', { header: 'Issuer' }),
        ch.accessor('scheme_name', { header: 'Scheme' }),
        ch.accessor('period', { header: 'Period', cell: (c) => formatReportCell(c.getValue()) }),
        ch.accessor('months', {
          header: 'Months',
          cell: (c) => {
            const v = c.getValue()
            if (v == null || v === '') return '—'
            return String(v)
          }
        }),
        ch.accessor('sip_start_date', { header: 'SIP Start', cell: (c) => formatReportDate(c.getValue()) }),
        ch.accessor('sip_end_date', { header: 'SIP End', cell: (c) => formatReportDate(c.getValue()) }),
        ch.accessor('fd_maturity_date', { header: 'FD Maturity', cell: (c) => formatReportDate(c.getValue()) }),
        ch.accessor('fd_tenure', { header: 'FD Tenure', cell: (c) => formatReportCell(c.getValue()) }),
        ch.accessor('transaction_type', { header: 'Txn type' }),
        ch.accessor('investment_amount', { header: 'Amount', cell: (c) => formatMoney(c.getValue()) }),
        ch.accessor('collection_credit', { header: 'CC', cell: (c) => formatMoney(c.getValue()) }),
        ch.accessor('incentive_paid', {
          header: 'Incentive',
          cell: (c) => (c.getValue() == null ? '—' : formatMoney(c.getValue()))
        }),
        ch.accessor('application_number', { header: 'Application #' }),
        ch.accessor('emp_code', { header: 'RM' }),
        ch.accessor('product_category', { header: 'Product', cell: (c) => formatProductCategory(c.getValue()) }),
        ch.accessor('status', { header: 'Status' })
      ]
    }
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
      ch.accessor('period', { header: 'Period', cell: (c) => formatReportCell(c.getValue()) }),
      ch.accessor('months', { header: 'Month', cell: (c) => formatReportCell(c.getValue()) }),
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
      ch.accessor('fd_payout_frequency', { header: 'FD Payout' }),
      ch.accessor('applications', { header: 'Applications' }),
      ch.accessor('amount', { header: 'Amount', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('collection_credit', { header: 'CC', cell: (c) => formatMoney(c.getValue()) }),
      ch.accessor('incentive_amount', {
        header: 'SI',
        cell: (c) => (c.getValue() == null ? '—' : formatMoney(c.getValue()))
      })
    ]
  } else if (slug === 'pending-receipts') {
    columns = [
      ch.accessor('receipt_number', { header: 'Receipt #' }),
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
      ch.accessor('period', { header: 'Period', cell: (c) => formatReportCell(c.getValue()) }),
      ch.accessor('months', { header: 'Month', cell: (c) => formatReportCell(c.getValue()) }),
      ch.accessor('start_date', { header: 'Start', cell: (c) => formatReportDate(c.getValue()) }),
      ch.accessor('end_date', { header: 'End', cell: (c) => formatReportDate(c.getValue()) }),
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
      ch.accessor('period', { header: 'Tenure/Period', cell: (c) => formatReportCell(c.getValue()) }),
      ch.accessor('months', { header: 'Month', cell: (c) => formatReportCell(c.getValue()) }),
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
          {...appliedFilterHint}
          onChange={patchFilters}
          onApply={apply}
          onReset={resetFilters}
          token={token}
          filterProfile={meta.filterProfile}
          dateBasisOptions={meta.dateBasisOptions}
          branchOptions={branchOptions}
          rmOptions={rmOptions}
          schemeCategoryOptions={schemeCategoryOptions}
          schemeCategoriesLoading={schemeCategoriesLoading}
          showGroupBy={slug === 'mis-transactions'}
          showIncludePending={slug !== 'pending-receipts'}
            showIssuerSchemeFilters={slug === 'product-detail'}
            showFundSearch={slug === 'mf-fund'}
            fundSearch={f.fundSearch}
            issuerOptions={issuerOptions}
            schemeOptions={schemeOptions}
            issuerLoading={schemeCategoriesLoading}
            schemeLoading={schemeCategoriesLoading}
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
          {slug === 'mis-transactions' && (
            <Button type="button" variant="secondary" onClick={() => exportReport('pdf').catch((e) => setErr(e.message))}>
              Export PDF
            </Button>
          )}
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
              manualPagination={isServerPaged(slug, groupBy)}
            />
          )}
          {isServerPaged(slug, groupBy) && (
            <ServerPager page={page} pageSize={25} total={total} onChange={setPage} />
          )}
        </>
      )}
    </ReportShell>
  )
}
