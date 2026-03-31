import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Label } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import CSVExport from '../components/CSVExport'
import { Card, Button, SegmentedControl, Switch, Skeleton } from '../components/ui'
import DatePickerInput from '../components/ui/DatePickerInput.jsx'
import {
  FiTrendingUp,
  FiFileText,
  FiCalendar,
  FiBarChart,
  FiActivity,
  FiUsers,
  FiUser,
  FiRefreshCw,
  FiAlertCircle,
  FiMapPin,
  FiAward,
  FiCheckSquare,
  FiSettings,
  FiTarget,
  FiPieChart,
  FiList,
  FiMessageCircle,
  FiAlertTriangle,
  FiGlobe,
  FiX
} from 'react-icons/fi'
import { FaRupeeSign } from 'react-icons/fa'

const ALL_WIDGET_IDS = [
  'kpi_cards', 'overdue_tasks', 'by_category', 'daily_timeline', 'branch_performance',
  'target_vs_actual', 'recent_receipts', 'status_breakdown', 'category_donut', 'monthly_cc_si',
  'top_employees', 'leads_snapshot', 'issues_snapshot', 'average_ticket', 'cc_vs_si', 'investor_heatmap'
]
/* Chart colors: vibrant, no black or dark gray (works in light and dark mode) */
const CHART_COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#0d9488', '#e11d48', '#0284c7', '#65a30d', '#ca8a04', '#db2777']

/* Donut: spaced hues so adjacent slices are easy to tell apart (light + dark UI) */
const DONUT_COLORS = [
  '#2563eb', '#ea580c', '#7c3aed', '#16a34a', '#dc2626', '#0891b2',
  '#ca8a04', '#c026d3', '#4f46e5', '#65a30d', '#db2777', '#0f766e'
]

const WIDGET_LABELS = {
  kpi_cards: 'KPI cards',
  overdue_tasks: 'Overdue tasks',
  by_category: 'By Category (bar)',
  daily_timeline: 'Daily Timeline',
  branch_performance: 'Branch Performance',
  target_vs_actual: 'Target vs actual',
  recent_receipts: 'Recent receipts',
  status_breakdown: 'Status breakdown',
  category_donut: 'Category donut',
  monthly_cc_si: 'Monthly CC/SI',
  top_employees: 'Top employees',
  leads_snapshot: 'Leads snapshot',
  issues_snapshot: 'Issues snapshot',
  average_ticket: 'Average ticket',
  cc_vs_si: 'CC vs SI',
  investor_heatmap: 'India heatmap'
}

export default function DashboardPage() {
  const { token, user, refreshUser } = useAuth()
  const [summary, setSummary] = useState(null)
  const [categoryStats, setCategoryStats] = useState([])
  const [dailyStats, setDailyStats] = useState([])
  const [branchStats, setBranchStats] = useState(null)
  const [monthlyCcSi, setMonthlyCcSi] = useState([])
  const [recentReceipts, setRecentReceipts] = useState([])
  const [topEmployees, setTopEmployees] = useState([])
  const [leadsSnapshot, setLeadsSnapshot] = useState([])
  const [issuesSnapshot, setIssuesSnapshot] = useState([])
  const [issuesSnapshotTotal, setIssuesSnapshotTotal] = useState(0)
  const [investorLocations, setInvestorLocations] = useState(null)
  // Used by the "Target vs actual" widget to keep the denominator (branch target)
  // consistent with the numerator (branch-level CC) when admins view "Personal".
  const [targetBranchActualCc, setTargetBranchActualCc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCustomizeModal, setShowCustomizeModal] = useState(false)
  const [customizeSelection, setCustomizeSelection] = useState([])
  const currentYear = new Date().getFullYear()
  const [dateRange, setDateRange] = useState({
    from: `${currentYear}-01-01`,
    to: `${currentYear}-12-31`
  })
  const [includePending, setIncludePending] = useState(true)
  const [viewMode, setViewMode] = useState(() => {
    // Branch managers should default to branch view (matches existing backend behavior).
    if (user?.role === 'manager' || user?.role === 'branch') return 'branch'
    return 'personal'
  })
  const [overdueTasks, setOverdueTasks] = useState([])
  const formatDateForInput = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const isAdmin = user?.role === 'admin'
  const isEmployee = user?.role === 'employee'
  const isBranchManager = user?.role === 'manager' || user?.role === 'branch'
  const effectiveWidgetIds = (user?.dashboard_widgets != null && Array.isArray(user.dashboard_widgets))
    ? user.dashboard_widgets
    : ALL_WIDGET_IDS
  const showWidget = (id) => effectiveWidgetIds.includes(id)

  useEffect(() => {
    // Keep viewMode aligned with role defaults on role load (avoid stale initial state).
    if (isAdmin) return
    if (isBranchManager) setViewMode('branch')
    else if (isEmployee) setViewMode('personal')
  }, [isAdmin, isEmployee, isBranchManager])

  const loadDashboardData = async () => {
    if (!token) return
    
    setLoading(true)
    setError('')
    setTargetBranchActualCc(null)
    setIssuesSnapshotTotal(0)
    
    try {
      // Determine query params based on view mode for admins
      let queryParams = {
        from: dateRange.from,
        to: dateRange.to,
        includePending: includePending ? '1' : '0'
      }
      
      // For admins, adjust query based on view mode
      if (isAdmin) {
        if (viewMode === 'personal') {
          // Admin viewing personal data - filter by their emp_code
          if (user?.emp_code) {
            queryParams.emp_code = user.emp_code
          }
        } else if (viewMode === 'branch') {
          // Admin viewing branch data - pass viewMode to backend
          queryParams.viewMode = 'branch'
        } else {
          // All branches view
          queryParams.viewMode = 'all'
        }
      } else {
        // Employees/managers: toggle affects what backend uses for receipts filtering.
        queryParams.viewMode = viewMode
      }
      
      // Load summary statistics from backend
      const summaryData = await api.statsSummary(token, queryParams)
      setSummary(summaryData)

      // For "Target vs actual", branch_target is branch-level, but in Admin "Personal"
      // view we filter actuals to a single employee. Fetch branch-level actuals so
      // the progress bar reflects the same scope as the target.
      if (viewMode === 'personal') {
        try {
          // Branch target is the denominator; use branch-level actuals even when "personal" view is selected.
          const branchSummaryData = await api.statsSummary(token, { ...queryParams, viewMode: 'branch' })
          setTargetBranchActualCc(branchSummaryData?.collection_credit_earned ?? null)
        } catch (e) {
          // If the extra fetch fails, fall back to the original numerator.
          console.warn('Failed to fetch branch actual CC for Target vs actual:', e)
          setTargetBranchActualCc(null)
        }
      }
      
      // Load category statistics
      const categoryData = await api.statsByCategory(token, queryParams)
      setCategoryStats(categoryData)
      
      // Load daily statistics
      const dailyData = await api.statsByDay(token, queryParams)
      setDailyStats(dailyData)
      
      if (isAdmin && viewMode === 'all') {
        const branchData = await api.getGlobalBranchStats(token, { from: dateRange.from, to: dateRange.to, includePending: includePending ? '1' : '0' })
        setBranchStats(branchData)
      } else {
        setBranchStats(null)
      }

      try {
        const overdueRes = await api.listTasks(token, { overdue: '1', limit: '7' })
        setOverdueTasks(overdueRes.items || [])
      } catch (taskErr) {
        setOverdueTasks([])
      }
      try {
        const monthly = await api.getMonthlyCCSI(token, { ...queryParams, from: dateRange.from, to: dateRange.to })
        setMonthlyCcSi(Array.isArray(monthly) ? monthly : [])
      } catch { setMonthlyCcSi([]) }
      try {
        const receipts = await api.listReceipts(token, { from: dateRange.from, to: dateRange.to, sort: 'created_at:desc', size: '10' })
        setRecentReceipts(receipts.items || receipts.data || receipts || [])
      } catch { setRecentReceipts([]) }
      try {
        const perf = await api.getEmployeePerformance(token, { from: dateRange.from, to: dateRange.to, ...(queryParams.branch_code && { branch_code: queryParams.branch_code }) })
        setTopEmployees(Array.isArray(perf) ? perf.slice(0, 5) : [])
      } catch { setTopEmployees([]) }
      try {
        const leads = await api.listLeads(token, { limit: '50' })
        setLeadsSnapshot(leads.items || leads.data || leads || [])
      } catch { setLeadsSnapshot([]) }
      try {
        // Backend expects `size` (not `limit`) and admin can view ALL issues via `/api/issues`.
        const issuesRes = isAdmin
          ? await api.listIssues(token, { status: 'open', page: '1', size: '200', sort: 'created_at:desc' })
          : await api.listMyIssues(token, { status: 'open', page: '1', size: '200', sort: 'created_at:desc' })

        const items = issuesRes?.items || issuesRes?.data || issuesRes || []
        setIssuesSnapshot(items)
        setIssuesSnapshotTotal(Number(issuesRes?.total ?? (Array.isArray(items) ? items.length : 0)) || 0)
      } catch {
        setIssuesSnapshot([])
        setIssuesSnapshotTotal(0)
      }
      try {
        const loc = await api.getInvestorLocations(token, { from: dateRange.from, to: dateRange.to, includePending: includePending ? '1' : '0' })
        setInvestorLocations(loc?.byState ? loc : null)
      } catch { setInvestorLocations(null) }
      
    } catch (err) {
      console.error('Dashboard load error:', err)
      if (err.response?.data?.detail) {
        setError(`Server error: ${err.response.data.detail}`)
      } else if (err.message) {
        setError(`Error: ${err.message}`)
      } else {
        setError('Failed to load dashboard data. Please check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [token, dateRange, includePending, viewMode])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  // Make sure backend numbers (or numeric strings) are safely converted for calculations.
  // This prevents `NaN%` progress bars when values arrive as formatted strings.
  const toSafeNumber = (v) => {
    if (v == null) return 0
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0
    const s = String(v).replace(/,/g, '').trim()
    const n = Number(s)
    return Number.isFinite(n) ? n : 0
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  // Map raw category codes to display labels so every bar has a visible label (fixes "unknown" bar)
  const CATEGORY_LABELS = {
    MF: 'MF',
    FD: 'FD',
    BOND: 'BOND',
    INS: 'Insurance',
    NCD: 'Bonds/NCD',
    GOVT_FD: 'Govt FD',
    MISC: 'Misc'
  }
  const getCategoryLabel = (c) => (c && CATEGORY_LABELS[c]) || (c || 'Other')
  const categoryChartData = (categoryStats || []).map((r) => ({
    ...r,
    category: getCategoryLabel(r.category),
    rawCategory: r.category
  }))

  const navigate = useNavigate()

  const usesBranchActualForTarget = viewMode === 'personal' && targetBranchActualCc != null
  const targetActualCc = usesBranchActualForTarget
    ? targetBranchActualCc
    : (summary?.collection_credit_earned || 0)
  const targetActualCcLabel = usesBranchActualForTarget
    ? 'Actual CC (branch):'
    : 'Actual CC (selected scope):'

  const targetNum = toSafeNumber(summary?.branch_target)
  const actualNum = toSafeNumber(targetActualCc)
  const targetProgressPct = targetNum > 0
    ? (actualNum >= targetNum
        ? 100
        : Math.min(100, Math.max(0, (actualNum / targetNum) * 100)))
    : 0

  // (intentionally no debug logging; target vs actual is visible via the bar itself)

  const datePresets = [
    { label: 'This month', getValue: () => {
      const d = new Date()
      const from = formatDateForInput(new Date(d.getFullYear(), d.getMonth(), 1))
      const to = formatDateForInput(new Date(d.getFullYear(), d.getMonth() + 1, 0))
      return { from, to }
    }},
    { label: 'Last month', getValue: () => {
      const d = new Date()
      const from = formatDateForInput(new Date(d.getFullYear(), d.getMonth() - 1, 1))
      const to = formatDateForInput(new Date(d.getFullYear(), d.getMonth(), 0))
      return { from, to }
    }},
    { label: 'YTD', getValue: () => {
      const y = new Date().getFullYear()
      return { from: `${y}-01-01`, to: `${y}-12-31` }
    }},
  ]

  const viewModeOptions = isAdmin
    ? [
        { value: 'personal', label: 'Personal' },
        { value: 'branch', label: 'Branch' },
        { value: 'all', label: 'All Branches' },
      ]
    : [
        { value: 'personal', label: 'Personal' },
        { value: 'branch', label: 'Your branch' },
      ]

  return (
    <div className="space-y-6">
      {/* Hero: welcome + refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-[var(--text-primary)]">
            {isEmployee ? 'My Performance' : 'Dashboard'}
          </h1>
          <p className="text-helper mt-1">
            {isEmployee ? 'Track your personal performance metrics' : 'Overview of financial transactions'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={<FiSettings className="w-4 h-4" />}
            onClick={() => {
              setCustomizeSelection([...effectiveWidgetIds])
              setShowCustomizeModal(true)
            }}
          >
            Customize
          </Button>
          <Button
            variant="secondary"
            icon={loading ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiRefreshCw className="w-4 h-4" />}
            onClick={loadDashboardData}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {showCustomizeModal && (
        <div
          className="dashboard-customize-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setShowCustomizeModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="customize-dashboard-title"
        >
          <div
            className="dashboard-customize-panel w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-[var(--stroke)] bg-[var(--card-bg-opaque)] shadow-[0_24px_48px_rgba(0,0,0,0.12)] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--stroke)] bg-[var(--card-hover)]/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-muted)]">
                  <FiSettings className="h-5 w-5 text-[var(--accent)]" />
                </div>
                <div>
                  <h2 id="customize-dashboard-title" className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                    Customize dashboard
                  </h2>
                  <p className="text-sm text-[var(--text-muted)] mt-0.5">Choose which widgets to show on your dashboard</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomizeModal(false)}
                className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--stroke)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                aria-label="Close"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALL_WIDGET_IDS.map((id) => {
                  const checked = customizeSelection.includes(id)
                  const toggle = () => {
                    if (checked) setCustomizeSelection((s) => s.filter((x) => x !== id))
                    else setCustomizeSelection((s) => [...s, id])
                  }
                  return (
                    <div
                      key={id}
                      role="button"
                      tabIndex={0}
                      onClick={toggle}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } }}
                      className={`flex cursor-pointer items-center gap-4 rounded-xl border px-4 py-3.5 transition-all duration-200 ${
                        checked
                          ? 'border-[var(--accent)]/40 bg-[var(--accent-muted)]/60 shadow-sm'
                          : 'border-[var(--stroke)] bg-[var(--card-bg)] hover:border-[var(--stroke-strong)] hover:bg-[var(--card-hover)]'
                      }`}
                    >
                      <span onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={checked}
                          onChange={toggle}
                        />
                      </span>
                      <span className={`text-sm font-medium ${checked ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                        {WIDGET_LABELS[id] || id}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-3 border-t border-[var(--stroke)] bg-[var(--card-hover)]/30 px-6 py-4">
              <Button variant="secondary" onClick={() => setShowCustomizeModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await api.updateMyProfile(token, { dashboard_widgets: customizeSelection })
                    await refreshUser()
                    setShowCustomizeModal(false)
                  } catch (err) {
                    console.error(err)
                  }
                }}
              >
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Compact filter bar */}
      <Card padding="md" hover={false}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2">
                <FiCalendar className="w-5 h-5 text-[var(--accent)]" />
                <span className="text-body font-medium text-[var(--text-primary)] tracking-wide">
                  Filters
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-[var(--text-secondary)]">From</label>
                <DatePickerInput
                  value={dateRange.from}
                  onChange={(v) => setDateRange(prev => ({ ...prev, from: v }))}
                  inputClassName="rounded-input border border-[var(--stroke)] bg-[var(--card-bg-opaque)] px-3 py-2 text-body text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--canvas)]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-[var(--text-secondary)]">To</label>
                <DatePickerInput
                  value={dateRange.to}
                  onChange={(v) => setDateRange(prev => ({ ...prev, to: v }))}
                  inputClassName="rounded-input border border-[var(--stroke)] bg-[var(--card-bg-opaque)] px-3 py-2 text-body text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--canvas)]"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {datePresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setDateRange(preset.getValue())}
                    className="rounded-pill border border-[var(--stroke)] bg-[var(--card-bg)] px-3 py-1.5 text-small font-medium text-[var(--text-primary)] hover:bg-[var(--card-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer pl-4 border-l border-[var(--stroke)] shrink-0">
              <Switch aria-label="Include Pending" checked={includePending} onChange={setIncludePending} />
              <span className="text-small font-medium text-[var(--text-primary)]">Include Pending</span>
            </label>
          </div>
          {(isAdmin || isEmployee || isBranchManager) && (
            <div className="flex items-center gap-3 pt-2 border-t border-[var(--stroke)]">
              <span className="text-label text-[var(--text-secondary)]">View</span>
              <SegmentedControl
                options={viewModeOptions}
                value={viewMode}
                onChange={setViewMode}
              />
            </div>
          )}
        </div>
      </Card>

      {loading && (
        <div className="space-y-6">
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
            {Array.from({ length: isAdmin ? 5 : 4 }).map((_, i) => (
              <Card key={i} padding="md">
                <Skeleton variant="line" lines={3} />
              </Card>
            ))}
          </div>
          <Card padding="lg">
            <Skeleton variant="line" lines={4} />
          </Card>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card padding="lg"><Skeleton variant="block" className="h-[350px]" /></Card>
            <Card padding="lg"><Skeleton variant="block" className="h-[350px]" /></Card>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-card border border-[var(--error)]/30 bg-[var(--error-muted)] px-4 py-3 flex items-center text-[var(--error)]">
          <FiAlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && summary && (
        <div className="space-y-6">
          {showWidget('target_vs_actual') && summary.branch_target != null && (
            <Card padding="md" hover className="dashboard-widget-card animate-dashboard-widget">
              <div className="flex items-center gap-2 mb-2">
                <FiTarget className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="text-title font-semibold text-[var(--text)]">Target vs actual</h3>
              </div>
              <div>
                <div className="flex justify-between text-small mb-1">
                  <span className="text-[var(--text-muted)]">Branch monthly target</span>
                  <span className="font-medium text-[var(--accent)]">{formatCurrency(summary.branch_target)}</span>
                </div>
                <div className="h-2.5 bg-[var(--stroke)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${targetProgressPct}%`,
                      // Force solid fill so we can isolate any gradient/background issues.
                      // Use literal color to bypass any CSS variable/theming issues.
                      backgroundColor: 'var(--accent, #0071e3)',
                      backgroundImage: 'none',
                      opacity: 1,
                      display: 'block',
                      height: '100%',
                      minHeight: '10px'
                    }}
                  />
                </div>
                <div className="text-helper mt-1">{targetActualCcLabel} {formatCurrency(targetActualCc || 0)}</div>
              </div>
            </Card>
          )}

          {showWidget('average_ticket') && summary.total_receipts > 0 && (
            <Card padding="md" hover className="dashboard-widget-card animate-dashboard-widget">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--success-muted)]">
                  <FaRupeeSign className="h-5 w-5 text-[var(--success)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-small font-medium text-[var(--text-muted)]">Average ticket</p>
                  <p className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                    {formatCurrency((summary.total_investments || 0) / summary.total_receipts)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* KPI Cards */}
          {showWidget('kpi_cards') && (
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin && summary.service_income_earned !== undefined ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4 sm:gap-6`}>
            <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-small font-medium text-[var(--text-muted)] mb-1">Total Receipts</div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">{summary.total_receipts ?? 0}</div>
                  <div className="text-helper mt-1">
                    {isAdmin
                      ? (viewMode === 'personal' ? 'Personal' : viewMode === 'branch' ? 'Your branch' : 'All branches')
                      : (viewMode === 'personal' ? 'Personal' : 'Your branch')}
                  </div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--accent-muted)] rounded-card flex items-center justify-center">
                  <FiFileText className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--accent)]" />
                </div>
              </div>
            </Card>

            <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-small font-medium text-[var(--text-muted)] mb-1">Total Investments</div>
                  <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--success)]">{formatCurrency(summary.total_investments || 0)}</div>
                  <div className="text-helper mt-1">Investment amount in the selected period</div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--success-muted)] rounded-xl flex items-center justify-center">
                  <FiTrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--success)]" aria-hidden />
                </div>
              </div>
            </Card>

            <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-small font-medium text-[var(--text-muted)] mb-1">Total Customers</div>
                  <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">{summary.total_customers ?? 0}</div>
                  <div className="text-helper mt-1">Customers in the selected scope</div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--accent-muted)] rounded-xl flex items-center justify-center">
                  <FiUsers className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--accent)]" />
                </div>
              </div>
            </Card>

            <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-small font-medium text-[var(--text-muted)] mb-1">Collection/Credit Earned</div>
                  <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--warn)]">
                    {formatCurrency(summary.collection_credit_earned || summary.commissions_total || 0)}
                  </div>
                  <div className="text-helper mt-1">Sum of CC on qualifying receipts</div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--warn-muted)] rounded-xl flex items-center justify-center">
                  <FiAward className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--warn)]" />
                </div>
              </div>
            </Card>

            {isAdmin && summary.service_income_earned !== undefined && (
              <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-small font-medium text-[var(--text-muted)] mb-1">Service Income Earned</div>
                    <div className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">{formatCurrency(summary.service_income_earned || 0)}</div>
                    <div className="text-helper mt-1">Admin-only SI</div>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--accent-muted)] rounded-card flex items-center justify-center">
                    <FiAward className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--accent)]" />
                  </div>
                </div>
              </Card>
            )}
          </div>
          )}

          {/* Small widgets grid – 2–3 per row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {showWidget('cc_vs_si') && isAdmin && (summary.collection_credit_earned != null || summary.service_income_earned != null) && (
            <Card padding="md" hover className="dashboard-widget-card animate-dashboard-widget">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--warn-muted)]">
                  <FiAward className="h-4 w-4 text-[var(--warn)]" />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">CC vs SI</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-[var(--stroke)] bg-[var(--card-hover)]/50 p-3 transition-colors hover:border-[var(--stroke-strong)]">
                  <div className="text-xs font-medium text-[var(--text-muted)]">CC</div>
                  <div className="mt-0.5 text-lg font-bold tracking-tight text-[var(--warn)]">{formatCurrency(summary.collection_credit_earned || summary.commissions_total || 0)}</div>
                </div>
                <div className="rounded-lg border border-[var(--stroke)] bg-[var(--card-hover)]/50 p-3 transition-colors hover:border-[var(--stroke-strong)]">
                  <div className="text-xs font-medium text-[var(--text-muted)]">SI</div>
                  <div className="mt-0.5 text-lg font-bold tracking-tight text-[var(--success)]">{formatCurrency(summary.service_income_earned || 0)}</div>
                </div>
              </div>
            </Card>
          )}

          {showWidget('status_breakdown') && summary.status_counts && (
            <Card padding="md" hover className="dashboard-widget-card animate-dashboard-widget">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
                  <FiPieChart className="h-4 w-4 text-[var(--accent)]" />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Status breakdown</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(summary.status_counts || {})).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-1.5 rounded-lg bg-[var(--card-hover)]/60 px-2.5 py-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        status === 'Completed'
                          ? 'bg-[var(--success)]'
                          : status === 'Pending'
                            ? 'bg-[var(--warn)]'
                            : (status === 'Failed' || status === 'Rejected')
                              ? 'bg-[var(--error)]'
                              : status === 'Cancelled'
                                ? 'bg-amber-400'
                                : 'bg-amber-400'
                      }`}
                    />
                    <span className="text-xs font-medium text-[var(--text-primary)]">{status}</span>
                    <span className="text-xs text-[var(--text-muted)]">{count}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {showWidget('leads_snapshot') && (
            <Card padding="md" hover className="dashboard-widget-card animate-dashboard-widget">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
                    <FiUser className="h-4 w-4 text-[var(--accent)]" />
                  </div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">Leads</h3>
                </div>
                <Link to="/leads" className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]">View all</Link>
              </div>
              <p className="text-lg font-bold tracking-tight text-[var(--text-primary)]">{Array.isArray(leadsSnapshot) ? leadsSnapshot.length : 0}</p>
            </Card>
          )}

          {showWidget('issues_snapshot') && (
            <Card padding="md" hover className="dashboard-widget-card animate-dashboard-widget">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--warn-muted)]">
                    <FiAlertTriangle className="h-4 w-4 text-[var(--warn)]" />
                  </div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">Open issues</h3>
                </div>
                <Link
                  to={isAdmin ? '/issues?status=open' : '/my-issues?status=open'}
                  className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]"
                >
                  View all
                </Link>
              </div>
              <p className="text-lg font-bold tracking-tight text-[var(--text-primary)]">{issuesSnapshotTotal}</p>
            </Card>
          )}

          {showWidget('top_employees') && topEmployees.length > 0 && (
            <Card padding="md" hover className="dashboard-widget-card animate-dashboard-widget">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--warn-muted)]">
                  <FiAward className="h-4 w-4 text-[var(--warn)]" />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Top employees</h3>
              </div>
              <ul className="space-y-1">
                {topEmployees.slice(0, 4).map((emp, i) => (
                  <li key={emp.emp_code || i} className="flex justify-between text-xs py-0.5">
                    <span className="text-[var(--text-primary)] truncate">#{i + 1} {emp.employee_name || emp.emp_code}</span>
                    <span className="text-[var(--text-muted)] ml-2 shrink-0">{formatCurrency(emp.total_investment)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {showWidget('monthly_cc_si') && monthlyCcSi.length > 0 && (
            <Card padding="md" hover className="dashboard-widget-card animate-dashboard-widget">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--success-muted)]">
                  <FiTrendingUp className="h-4 w-4 text-[var(--success)]" />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Monthly CC / SI</h3>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={monthlyCcSi} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} width={36} tickFormatter={v => `₹${(v / 1e5).toFixed(0)}L`} />
                  <Tooltip
                    formatter={(v) => formatCurrency(v)}
                    labelFormatter={l => `Month: ${l}`}
                    contentStyle={{ backgroundColor: 'var(--card-bg-opaque)', border: '1px solid var(--stroke)', borderRadius: '8px' }}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Bar dataKey="cc" fill="#2563eb" name="CC" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="si" fill="#059669" name="SI" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
          </div>

          {/* Tasks / Issues summary */}
          {showWidget('overdue_tasks') && (
          <Card padding="md" hover className="dashboard-widget-card animate-dashboard-widget">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-title font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
                  <FiCheckSquare className="w-4 h-4 text-[var(--accent)]" />
                </div>
                Overdue tasks
                {overdueTasks.length > 0 && (
                  <span className="text-caption font-normal text-[var(--text-muted)]">({overdueTasks.length})</span>
                )}
              </h3>
              <Link to="/tasks" className="text-caption font-medium text-[var(--accent)] hover:underline">
                View all
              </Link>
            </div>
            {overdueTasks.length === 0 ? (
              <p className="text-body text-[var(--text-muted)]">No overdue tasks.</p>
            ) : (
              <ul className="space-y-2">
                {overdueTasks.slice(0, 5).map((task) => (
                  <li key={task._key} className="flex justify-between items-center py-2 border-b border-[var(--stroke)] last:border-0">
                    <span className="text-[var(--text)] font-medium truncate flex-1">{task.title}</span>
                    <span className="text-small text-[var(--text-muted)] ml-2 flex-shrink-0">{task.due_date}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          )}

          {showWidget('recent_receipts') && recentReceipts.length > 0 && (
            <Card padding="md" hover className="dashboard-widget-card animate-dashboard-widget">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
                    <FiList className="w-4 h-4 text-[var(--accent)]" />
                  </div>
                  <h3 className="text-title font-semibold text-[var(--text-primary)]">Recent receipts</h3>
                </div>
                <Link to="/transactions" className="text-sm font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]">View all</Link>
              </div>
              <ul className="space-y-0">
                {recentReceipts.slice(0, 5).map((r) => (
                  <li key={r._key || r.id} className="flex justify-between py-2.5 text-sm border-b border-[var(--stroke)] last:border-0 last:pb-0">
                    <span className="text-[var(--text-primary)] truncate font-medium">{r.receipt_no || r.receipt_number || '—'}</span>
                    <span className="text-[var(--text-muted)] ml-3 shrink-0">{formatCurrency(r.transaction?.amount ?? r.investment_amount ?? 0)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {showWidget('investor_heatmap') && investorLocations && Object.keys(investorLocations).length > 0 && (
            <Card padding="md" hover className="dashboard-widget-card animate-dashboard-widget">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
                  <FiGlobe className="w-4 h-4 text-[var(--accent)]" />
                </div>
                <h3 className="text-title font-semibold text-[var(--text-primary)]">Investor locations (India)</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(investorLocations).slice(0, 12).map(([state, data]) => (
                  <div key={state} className="rounded-xl border border-[var(--stroke)] bg-[var(--card-hover)]/60 px-3 py-2 text-small transition-colors hover:border-[var(--stroke-strong)]">
                    <span className="font-medium text-[var(--text-primary)]">{state}</span>
                    <span className="text-[var(--text-muted)] ml-2">({data.count}, {formatCurrency(data.amount)})</span>
                  </div>
                ))}
              </div>
              {Object.keys(investorLocations).length > 12 && <p className="text-helper mt-3">+{Object.keys(investorLocations).length - 12} more states</p>}
            </Card>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {showWidget('by_category') && (
            <Card padding="md" hover className="dashboard-widget-card animate-dashboard-widget">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-card flex items-center justify-center mr-3 bg-[var(--dashboard-primary)]/12">
                    <FiBarChart className="w-5 h-5 text-[var(--dashboard-primary)]" />
                  </div>
                  <div>
                    <h3 className="text-title font-semibold text-[var(--text)]">By Category</h3>
                    <p className="text-small text-[var(--text-muted)]">Investment breakdown</p>
                  </div>
                </div>
              </div>
              {categoryChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={categoryChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorCategory" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--dashboard-primary)" stopOpacity={0.95} />
                        <stop offset="95%" stopColor="var(--dashboard-primary)" stopOpacity={0.75} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke)" opacity={0.3} />
                    <XAxis dataKey="category" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickLine={{ stroke: 'var(--stroke)' }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickLine={{ stroke: 'var(--stroke)' }} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value), 'Amount']}
                      labelFormatter={(label) => `Category: ${label}`}
                      contentStyle={{ backgroundColor: 'var(--card-bg-opaque)', border: '1px solid var(--stroke)', borderRadius: '12px', boxShadow: 'var(--shadow-card)', padding: '12px 16px' }}
                      labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      cursor={{ fill: 'rgba(37, 99, 235, 0.08)' }}
                    />
                    <Bar dataKey="amount" fill="url(#colorCategory)" radius={[8, 8, 0, 0]} maxBarSize={60} onClick={(payload) => payload?.rawCategory != null && navigate(`/transactions?category=${encodeURIComponent(payload.rawCategory)}`)} cursor="pointer" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-[var(--text-muted)]">
                  <FiBarChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No category data available</p>
                </div>
              )}
            </Card>
          )}

          {showWidget('category_donut') && categoryChartData.length > 0 && (() => {
            const donutTotal = categoryChartData.reduce((s, d) => s + d.amount, 0)
            const formatDonutCenter = (n) => {
              if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
              if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
              return formatCurrency(n)
            }
            const DonutCenterLabel = (props) => {
              const v = props.viewBox || {}
              const cx = props.cx ?? v.cx ?? (v.x != null && v.width != null ? v.x + v.width / 2 : null)
              const cy = props.cy ?? v.cy ?? (v.y != null && v.height != null ? v.y + v.height / 2 : null)
              if (cx == null || cy == null) return null
              return (
                <g>
                <text
                  x={cx}
                  y={cy - 12}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ fontSize: 13, fill: 'var(--text-primary)' }}
                >
                  Total
                </text>
                  <text x={cx} y={cy + 12} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 20, fontWeight: 700, fill: 'var(--text-primary)' }}>{formatDonutCenter(donutTotal)}</text>
                </g>
              )
            }
            return (
              <Card padding="md" hover className="dashboard-widget-card animate-dashboard-widget">
                <div className="flex items-center gap-2 mb-4">
                  <FiPieChart className="w-5 h-5 text-[var(--accent)]" />
                  <h3 className="text-title font-semibold text-[var(--text)]">By category</h3>
                </div>
                <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4">
                  <div className="[filter:drop-shadow(0_8px_24px_rgba(0,0,0,0.12))] flex-shrink-0" style={{ width: 'min(100%, 360px)' }}>
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <Pie
                          data={categoryChartData}
                          dataKey="amount"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={88}
                          outerRadius={140}
                          paddingAngle={2}
                          label={false}
                        >
                          <Label content={<DonutCenterLabel />} position="center" />
                          {categoryChartData.map((_, i) => (
                            <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name, props) => {
                            const pct = donutTotal > 0 ? ((value / donutTotal) * 100).toFixed(1) : 0
                            return [`${formatCurrency(value)} · ${pct}%`, name]
                          }}
                          contentStyle={{ backgroundColor: 'var(--card-bg-opaque)', border: '1px solid var(--stroke)', borderRadius: '12px', padding: '10px 14px' }}
                          labelStyle={{ color: 'var(--text-primary)', marginBottom: 4, fontWeight: 600 }}
                          itemStyle={{ color: 'var(--text-primary)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="flex flex-col justify-center gap-2.5 flex-1 min-w-0">
                    {categoryChartData.map((d, i) => {
                      const pct = donutTotal > 0 ? ((d.amount / donutTotal) * 100).toFixed(0) : 0
                      return (
                        <li key={d.category} className="flex items-center gap-2.5">
                          <span className="h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                          <span className="text-sm font-medium text-[var(--text-primary)] truncate">{d.category}</span>
                          <span className="text-sm text-[var(--text-primary)] font-semibold flex-shrink-0">{pct}%</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </Card>
            )
          })()}

          {showWidget('daily_timeline') && (
            <Card padding="md" hover className="dashboard-widget-card animate-dashboard-widget">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-[var(--success-muted)] rounded-card flex items-center justify-center mr-3">
                    <FiActivity className="w-5 h-5 text-[var(--success)]" />
                  </div>
                  <div>
                    <h3 className="text-title font-semibold text-[var(--text)]">Daily Timeline</h3>
                    <p className="text-small text-[var(--text-muted)]">Investment trends</p>
                  </div>
                </div>
              </div>
              {dailyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={dailyStats} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorTimeline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--dashboard-primary)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--dashboard-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke)" opacity={0.3} />
                    <XAxis dataKey="date" tickFormatter={formatDate} stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickLine={{ stroke: 'var(--stroke)' }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickLine={{ stroke: 'var(--stroke)' }} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value), 'Amount']}
                      labelFormatter={(label) => `Date: ${formatDate(label)}`}
                      contentStyle={{ backgroundColor: 'var(--card-bg-opaque)', border: '1px solid var(--stroke)', borderRadius: '12px', boxShadow: 'var(--shadow-card)', padding: '12px 16px' }}
                      labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      cursor={{ stroke: 'var(--dashboard-primary)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="var(--dashboard-primary)"
                      strokeWidth={3}
                      dot={{ fill: 'var(--dashboard-primary)', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7 }}
                      fill="url(#colorTimeline)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-[var(--text-muted)]">
                  <FiActivity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No daily data available</p>
                </div>
              )}
            </Card>
          )}
          </div>

          {isAdmin && <CSVExport token={token} user={user} />}

          {/* Branch leaderboard */}
          {showWidget('branch_performance') && branchStats && isAdmin && viewMode === 'all' && (
            <Card padding="md" hover className="dashboard-widget-card animate-dashboard-widget">
              <div className="flex items-center mb-6">
                <FiMapPin className="w-5 h-5 text-[var(--accent)] mr-2" />
                <h3 className="text-title font-semibold text-[var(--text)]">Branch Performance Overview</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {branchStats.branches && branchStats.branches.slice(0, 6).map((branch, index) => (
                  <button
                    key={branch.branch_code || branch.branch || index}
                    type="button"
                    onClick={() => (branch.branch_code || branch.branch) && navigate(`/transactions?branch=${encodeURIComponent(branch.branch_code || branch.branch)}`)}
                    className="text-left rounded-card border border-[var(--stroke)] bg-[var(--card-hover)] p-4 hover:shadow-card hover:bg-[var(--card-bg)] transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-[var(--accent-muted)] rounded-full flex items-center justify-center mr-3">
                          <span className="text-small font-bold text-[var(--accent)]">#{index + 1}</span>
                        </div>
                        <div>
                          <div className="text-small font-medium text-[var(--text)]">{branch.branch || branch.branch_name || 'Unknown Branch'}</div>
                          <div className="text-xs text-[var(--text-muted)]">{branch.branch_name || branch.branch || 'Unknown Branch'}</div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-small">
                        <span className="text-[var(--text-muted)]">Investments:</span>
                        <span className="font-medium text-[var(--text)]">{formatCurrency(branch.total_investments || 0)}</span>
                      </div>
                      <div className="flex justify-between text-small">
                        <span className="text-[var(--text-muted)]">Receipts:</span>
                        <span className="font-medium text-[var(--text)]">{branch.total_receipts || 0}</span>
                      </div>
                      <div className="flex justify-between text-small">
                        <span className="text-[var(--text-muted)]">Collection/Credit:</span>
                        <span className="font-medium text-[var(--text)]">{formatCurrency(branch.commissions || 0)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
