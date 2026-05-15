import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Label } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useAppConfig } from '../context/AppConfigContext'
import { api } from '../api'
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

/** Prorate a monthly target across calendar months overlapping [fromStr, toStr] (YYYY-MM-DD, inclusive). */
function scaleMonthlyTargetToDateRange(monthlyAmount, fromStr, toStr) {
  let m = monthlyAmount
  if (m == null) m = 0
  else if (typeof m !== 'number') {
    const s = String(m).replace(/,/g, '').trim()
    const n = Number(s)
    m = Number.isFinite(n) ? n : 0
  } else if (!Number.isFinite(m)) m = 0
  if (!(m > 0)) return m
  if (!fromStr || !toStr) return m

  const parseLocalNoon = (iso) => {
    const parts = String(iso).split('-').map((x) => parseInt(x, 10))
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null
    const [y, mo, d] = parts
    return new Date(y, mo - 1, d, 12, 0, 0)
  }

  const from = parseLocalNoon(fromStr)
  const to = parseLocalNoon(toStr)
  if (!from || !to || from > to) return 0

  let total = 0
  let cur = new Date(from.getFullYear(), from.getMonth(), 1, 12, 0, 0)
  const lastMonthStart = new Date(to.getFullYear(), to.getMonth(), 1, 12, 0, 0)

  while (cur <= lastMonthStart) {
    const y = cur.getFullYear()
    const monthIdx = cur.getMonth()
    const monthStart = new Date(y, monthIdx, 1, 12, 0, 0)
    const monthEnd = new Date(y, monthIdx + 1, 0, 12, 0, 0)
    const daysInMonth = monthEnd.getDate()
    const rangeStart = from > monthStart ? from : monthStart
    const rangeEnd = to < monthEnd ? to : monthEnd
    if (rangeStart <= rangeEnd) {
      const overlapDays = Math.floor((rangeEnd - rangeStart) / 86400000) + 1
      total += m * (overlapDays / daysInMonth)
    }
    cur.setMonth(cur.getMonth() + 1)
  }
  return total
}

/** Shared layout rhythm for dashboard sections and grids */
const DASHBOARD_STACK = 'space-y-8'
const DASHBOARD_GRID_KPI =
  'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-5 sm:gap-6'
const DASHBOARD_GRID_KPI_EMPLOYEE =
  'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6'
const DASHBOARD_GRID_WIDGETS = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6'
const DASHBOARD_GRID_CHARTS = 'grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8'

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
  const cfg = useAppConfig()
  const approvalFlagOn = !!cfg?.feature_flags?.receipts_approval_v2
  const [approvalsCount, setApprovalsCount] = useState(0)
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCustomizeModal, setShowCustomizeModal] = useState(false)
  const [customizeSelection, setCustomizeSelection] = useState([])
  const [showBranchBreakdownModal, setShowBranchBreakdownModal] = useState(false)
  const [branchBreakdownLoading, setBranchBreakdownLoading] = useState(false)
  const [branchBreakdownError, setBranchBreakdownError] = useState('')
  const [branchBreakdownBranch, setBranchBreakdownBranch] = useState(null)
  const [branchBreakdownEmployees, setBranchBreakdownEmployees] = useState([])
  const currentYear = new Date().getFullYear()
  const [dateRange, setDateRange] = useState({
    from: `${currentYear}-01-01`,
    to: `${currentYear}-12-31`
  })
  const [dateBasis, setDateBasis] = useState('receipt') // 'receipt' | 'transaction'
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
    setIssuesSnapshotTotal(0)
    
    try {
      // Determine query params based on view mode for admins
      let queryParams = {
        from: dateRange.from,
        to: dateRange.to,
        date_basis: dateBasis,
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

      // Load category statistics
      const categoryData = await api.statsByCategory(token, queryParams)
      setCategoryStats(categoryData)
      
      // Load daily statistics
      const dailyData = await api.statsByDay(token, queryParams)
      setDailyStats(dailyData)
      
      if (isAdmin && viewMode === 'all') {
        const branchData = await api.getGlobalBranchStats(token, { from: dateRange.from, to: dateRange.to, date_basis: dateBasis, includePending: includePending ? '1' : '0' })
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
        const receipts = await api.listReceipts(token, { from: dateRange.from, to: dateRange.to, date_basis: dateBasis, sort: 'created_at:desc', size: '10' })
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
        const loc = await api.getInvestorLocations(token, { from: dateRange.from, to: dateRange.to, date_basis: dateBasis, includePending: includePending ? '1' : '0' })
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
  }, [token, dateRange, dateBasis, includePending, viewMode])

  // Approvals widget: count open receipt_approval tasks on teams the user
  // belongs to. /api/tasks is role-scoped (admin sees all, managers see their
  // branch, employees see assignee/assigned_by/watcher), which can surface
  // approval tasks on teams the user isn't on — so we cross-check team_id
  // against the user's own team memberships (matching the queue page).
  useEffect(() => {
    if (!token || !approvalFlagOn) { setApprovalsCount(0); return }
    let cancelled = false
    const load = async () => {
      try {
        const [tRes, teamsList] = await Promise.all([
          api.listTasks(token, { limit: '500', page: '1', archived: 'false' }),
          api.listTeams(token).catch(() => [])
        ])
        const items = Array.isArray(tRes?.items) ? tRes.items : (Array.isArray(tRes) ? tRes : [])
        const myUid = user?.id ?? user?._key ?? user?.sub ?? null
        const myTeamIds = new Set()
        if (myUid != null && Array.isArray(teamsList)) {
          for (const t of teamsList) {
            const memberIds = Array.isArray(t.member_ids)
              ? t.member_ids
              : (Array.isArray(t.members) ? t.members.map(m => m?.id) : [])
            const lead = t.lead_user_id ?? t.lead?.id ?? null
            const teamKey = String(t.id || t._key)
            if (memberIds.some(mid => String(mid) === String(myUid))) myTeamIds.add(teamKey)
            else if (lead != null && String(lead) === String(myUid)) myTeamIds.add(teamKey)
          }
        }
        const openSet = new Set(['backlog', 'todo', 'in_progress', 'in_review', 'blocked'])
        const open = items.filter((t) =>
          t.kind === 'receipt_approval'
          && openSet.has(t.status)
          && t.team_id
          && myTeamIds.has(String(t.team_id))
        )
        if (!cancelled) setApprovalsCount(open.length)
      } catch { if (!cancelled) setApprovalsCount(0) }
    }
    load()
    const interval = setInterval(load, 60000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [token, approvalFlagOn, user?.id, user?._key, user?.sub])

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
    GOVT_FD: 'Government Schemes',
    MISC: 'Misc'
  }
  const getCategoryLabel = (c) => (c && CATEGORY_LABELS[c]) || (c || 'Other')
  const categoryChartData = (categoryStats || []).map((r) => ({
    ...r,
    category: getCategoryLabel(r.category),
    rawCategory: r.category
  }))

  const navigate = useNavigate()

  const openBranchBreakdown = async (branch) => {
    const branchCode = branch?.branch_code || branch?.branch || branch?.branch_name
    if (!branchCode) return
    setBranchBreakdownBranch(branch)
    setShowBranchBreakdownModal(true)
    setBranchBreakdownEmployees([])
    setBranchBreakdownError('')
    setBranchBreakdownLoading(true)
    try {
      const rows = await api.getEmployeePerformance(token, {
        from: dateRange.from,
        to: dateRange.to,
        branch_code: String(branchCode),
        includePending: includePending ? '1' : '0',
        date_basis: dateBasis
      })
      setBranchBreakdownEmployees(Array.isArray(rows) ? rows : [])
    } catch (e) {
      setBranchBreakdownError(e?.message || 'Failed to load branch breakdown')
      setBranchBreakdownEmployees([])
    } finally {
      setBranchBreakdownLoading(false)
    }
  }

  const monthlyTargetBasis = useMemo(() => {
    if (summary?.effective_target != null) return toSafeNumber(summary.effective_target)
    return toSafeNumber(summary?.branch_target)
  }, [summary])

  const periodTargetNum = useMemo(
    () => scaleMonthlyTargetToDateRange(monthlyTargetBasis, dateRange.from, dateRange.to),
    [monthlyTargetBasis, dateRange.from, dateRange.to]
  )

  // Personal view: compare personal CC (same scope as KPIs) to personal target or branch target fallback.
  const targetActualCc = summary?.collection_credit_earned || 0
  const targetActualCcLabel = 'Actual CC (selected scope):'

  const actualNum = toSafeNumber(targetActualCc)
  const targetProgressPct = periodTargetNum > 0
    ? (actualNum >= periodTargetNum
        ? 100
        : Math.min(100, Math.max(0, (actualNum / periodTargetNum) * 100)))
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
    { label: 'Last 6 months', getValue: () => {
      const today = new Date()
      const to = formatDateForInput(today)
      const d = new Date(today)
      d.setMonth(d.getMonth() - 6)
      const from = formatDateForInput(d)
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

  const allBranchesTargetSummary = useMemo(() => {
    if (!branchStats?.branches?.length) return null
    const branches = branchStats.branches
    const monthlySum =
      branchStats.total_monthly_target != null && branchStats.total_monthly_target !== ''
        ? toSafeNumber(branchStats.total_monthly_target)
        : branches.reduce((s, b) => s + toSafeNumber(b.total_target), 0)
    const totalTarget = scaleMonthlyTargetToDateRange(monthlySum, dateRange.from, dateRange.to)
    const totalCc = toSafeNumber(branchStats.total_collection_credit)
    const overallPct = totalTarget > 0 ? Math.min(100, Math.max(0, (totalCc / totalTarget) * 100)) : 0
    return { branches, totalTarget, totalCc, overallPct, monthlySum }
  }, [branchStats, dateRange.from, dateRange.to])

  return (
    <div className={DASHBOARD_STACK}>
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
      <Card padding="lg" hover={false}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex flex-wrap items-end gap-5">
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
              <div className="flex flex-col gap-1.5 min-w-[220px]">
                <label className="text-label text-[var(--text-secondary)]">Date basis</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDateBasis('receipt')}
                    className={`flex-1 rounded-input border px-3 py-2 text-small font-medium transition-colors ${
                      dateBasis === 'receipt'
                        ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]'
                        : 'border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--card-hover)]'
                    }`}
                  >
                    Receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateBasis('transaction')}
                    className={`flex-1 rounded-input border px-3 py-2 text-small font-medium transition-colors ${
                      dateBasis === 'transaction'
                        ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]'
                        : 'border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--card-hover)]'
                    }`}
                  >
                    Transaction
                  </button>
                </div>
                <span className="text-[11px] text-[var(--text-muted)]">Offline uses cheque date when available.</span>
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
            <div className="flex items-center gap-3 pt-4 mt-1 border-t border-[var(--stroke)]">
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
        <div className={DASHBOARD_STACK}>
          <div className={isAdmin ? DASHBOARD_GRID_KPI : DASHBOARD_GRID_KPI_EMPLOYEE}>
            {Array.from({ length: isAdmin ? 5 : 4 }).map((_, i) => (
              <Card key={i} padding="md">
                <Skeleton variant="line" lines={3} />
              </Card>
            ))}
          </div>
          <Card padding="lg">
            <Skeleton variant="line" lines={4} />
          </Card>
          <div className={DASHBOARD_GRID_CHARTS}>
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
        <div className={DASHBOARD_STACK}>
          {showWidget('target_vs_actual') && (summary.effective_target != null || summary.branch_target != null) && monthlyTargetBasis > 0 && (
            <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget">
              <div className="flex items-center gap-2 mb-2">
                <FiTarget className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="text-title font-semibold text-[var(--text)]">Target vs actual</h3>
              </div>
              <div>
                <div className="flex justify-between text-small mb-1">
                  <span className="text-[var(--text-muted)]">
                    Target for selected period
                    {viewMode === 'personal' && summary?.personal_target != null && (
                      <span className="block text-[10px] text-[var(--text-muted)]/90 mt-0.5">Basis: personal monthly</span>
                    )}
                    {viewMode === 'personal' && summary?.personal_target == null && summary?.allocated_target != null && (
                      <span className="block text-[10px] text-[var(--text-muted)]/90 mt-0.5">Basis: allocated from branch pool</span>
                    )}
                    {viewMode === 'personal' && summary?.personal_target == null && summary?.allocated_target == null && summary?.branch_target != null && (
                      <span className="block text-[10px] text-[var(--text-muted)]/90 mt-0.5">Basis: branch monthly (allocation unavailable)</span>
                    )}
                  </span>
                  <span className="font-medium text-[var(--accent)]">{formatCurrency(periodTargetNum)}</span>
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
            <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget min-h-[7.5rem]">
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
          <div
            className={
              isAdmin && summary.service_income_earned !== undefined
                ? DASHBOARD_GRID_KPI
                : DASHBOARD_GRID_KPI_EMPLOYEE
            }
          >
            <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget min-h-[7.5rem]">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="text-small font-medium text-[var(--text-muted)] mb-1.5">Total Receipts</div>
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

            <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget min-h-[7.5rem]">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="text-small font-medium text-[var(--text-muted)] mb-1.5">Total Investments</div>
                  <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--success)]">{formatCurrency(summary.total_investments || 0)}</div>
                  <div className="text-helper mt-1">Investment amount in the selected period</div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--success-muted)] rounded-xl flex items-center justify-center">
                  <FiTrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--success)]" aria-hidden />
                </div>
              </div>
            </Card>

            <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget min-h-[7.5rem]">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="text-small font-medium text-[var(--text-muted)] mb-1.5">Total Customers</div>
                  <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">{summary.total_customers ?? 0}</div>
                  <div className="text-helper mt-1">Customers in the selected scope</div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--accent-muted)] rounded-xl flex items-center justify-center">
                  <FiUsers className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--accent)]" />
                </div>
              </div>
            </Card>

            <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget min-h-[7.5rem]">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="text-small font-medium text-[var(--text-muted)] mb-1.5">Collection/Credit Earned</div>
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
              <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget min-h-[7.5rem]">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="text-small font-medium text-[var(--text-muted)] mb-1.5">Service Income Earned</div>
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
          <div className={DASHBOARD_GRID_WIDGETS}>
          {showWidget('cc_vs_si') && isAdmin && (summary.collection_credit_earned != null || summary.service_income_earned != null) && (
            <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget min-h-[7.5rem]">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--warn-muted)]">
                  <FiAward className="h-4 w-4 text-[var(--warn)]" />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">CC vs SI</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
            <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget min-h-[7.5rem]">
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
            <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget min-h-[7.5rem]">
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
            <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget min-h-[7.5rem]">
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

          {approvalFlagOn && (
            <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget min-h-[7.5rem]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
                    <FiCheckSquare className="h-4 w-4 text-[var(--accent)]" />
                  </div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">My pending approvals</h3>
                </div>
                <Link to="/approvals" className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]">
                  View queue
                </Link>
              </div>
              <p className="text-lg font-bold tracking-tight text-[var(--text-primary)]">{approvalsCount}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">Receipts waiting on your team.</p>
            </Card>
          )}

          {showWidget('top_employees') && topEmployees.length > 0 && (
            <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget min-h-[7.5rem]">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--warn-muted)]">
                  <FiAward className="h-4 w-4 text-[var(--warn)]" />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Top employees</h3>
              </div>
              <ul className="space-y-1">
                {topEmployees.slice(0, 4).map((emp, i) => (
                  <li key={emp.emp_code || i} className="flex justify-between gap-2 text-xs py-0.5">
                    <span className="text-[var(--text-primary)] truncate">#{i + 1} {emp.employee_name || emp.emp_code}</span>
                    <span className="text-[var(--text-muted)] ml-2 shrink-0 text-right">
                      <span className="block">{formatCurrency(emp.total_investment)}</span>
                      {emp.effective_target != null && (
                        <span className="block text-[10px] text-[var(--text-muted)]">
                          Target {formatCurrency(emp.effective_target)}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {showWidget('monthly_cc_si') && monthlyCcSi.length > 0 && (
            <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget min-h-[7.5rem]">
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
          <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget min-h-[7.5rem]">
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
            <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget min-h-[7.5rem]">
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
            <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget min-h-[7.5rem]">
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
          <div className={DASHBOARD_GRID_CHARTS}>
          {showWidget('by_category') && (
            <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget min-h-[7.5rem]">
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
              <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget min-h-[7.5rem]">
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
            <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget min-h-[7.5rem]">
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


          {/* Branch leaderboard */}
          {showWidget('branch_performance') && branchStats && isAdmin && viewMode === 'all' && allBranchesTargetSummary && (
            <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget min-h-[7.5rem]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div className="flex items-center">
                  <FiMapPin className="w-5 h-5 text-[var(--accent)] mr-2" />
                  <h3 className="text-title font-semibold text-[var(--text)]">Branch Performance Overview</h3>
                </div>
                <p className="text-helper text-[var(--text-muted)]">All branches · period from filters above</p>
              </div>

              {/* Aggregated target vs actual (CC) */}
              <div className="mb-6 rounded-card border border-[var(--stroke)] bg-[var(--card-hover)]/50 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <FiTarget className="w-4 h-4 text-[var(--accent)]" />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">Target summary (all branches)</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-small">
                  <div>
                    <div className="text-[var(--text-muted)] mb-0.5">Combined target (period)</div>
                    <div className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(allBranchesTargetSummary.totalTarget)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--text-muted)] mb-0.5">Collection / credit (actual)</div>
                    <div className="text-lg font-bold text-[var(--warn)]">{formatCurrency(allBranchesTargetSummary.totalCc)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--text-muted)] mb-0.5">Attainment vs target</div>
                    <div className="text-lg font-bold text-[var(--accent)]">
                      {allBranchesTargetSummary.totalTarget > 0
                        ? `${allBranchesTargetSummary.overallPct.toFixed(1)}%`
                        : '—'}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-[var(--text-muted)]">
                  Target basis: Branch monthly
                </div>
                {allBranchesTargetSummary.totalTarget > 0 && (
                  <div className="mt-3 h-2.5 bg-[var(--stroke)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${allBranchesTargetSummary.overallPct}%`,
                        backgroundColor: 'var(--accent, #0071e3)',
                        maxWidth: '100%'
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="max-h-[560px] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                  {allBranchesTargetSummary.branches.map((branch, index) => {
                    const monthlyBranchTarget = toSafeNumber(branch.total_target)
                    const tgt = scaleMonthlyTargetToDateRange(
                      monthlyBranchTarget,
                      dateRange.from,
                      dateRange.to
                    )
                    const cc = toSafeNumber(branch.commissions ?? branch.total_cc)
                    const branchPct = tgt > 0 ? Math.min(100, Math.max(0, (cc / tgt) * 100)) : null
                    return (
                      <button
                        key={branch.branch_code || branch.branch || index}
                        type="button"
                        onClick={() => openBranchBreakdown(branch)}
                        className="text-left rounded-card border border-[var(--stroke)] bg-[var(--card-hover)] p-4 hover:shadow-card hover:bg-[var(--card-bg)] transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center min-w-0">
                            <div className="w-8 h-8 bg-[var(--accent-muted)] rounded-full flex items-center justify-center mr-3 shrink-0">
                              <span className="text-small font-bold text-[var(--accent)]">#{index + 1}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="text-small font-medium text-[var(--text)] truncate">{branch.branch || branch.branch_name || 'Unknown Branch'}</div>
                              <div className="text-xs text-[var(--text-muted)] truncate">{branch.branch_code ? `Code: ${branch.branch_code}` : (branch.branch_name || branch.branch || '')}</div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-small gap-2">
                            <span className="text-[var(--text-muted)] shrink-0">Target (period)</span>
                            <span className="font-medium text-[var(--text)] text-right">{formatCurrency(tgt)}</span>
                          </div>
                          <div className="flex justify-between text-small gap-2">
                            <span className="text-[var(--text-muted)] shrink-0">CC (actual)</span>
                            <span className="font-medium text-[var(--text)] text-right">{formatCurrency(cc)}</span>
                          </div>
                          {branchPct != null && (
                            <div className="pt-1">
                              <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                                <span>vs target</span>
                                <span>{branchPct.toFixed(0)}%</span>
                              </div>
                              <div className="h-1.5 bg-[var(--stroke)] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[var(--accent)]"
                                  style={{ width: `${branchPct}%`, maxWidth: '100%' }}
                                />
                              </div>
                            </div>
                          )}
                          <div className="flex justify-between text-small border-t border-[var(--stroke)]/80 pt-2 mt-2">
                            <span className="text-[var(--text-muted)]">Investments</span>
                            <span className="font-medium text-[var(--text)]">{formatCurrency(branch.total_investments || 0)}</span>
                          </div>
                          <div className="flex justify-between text-small">
                            <span className="text-[var(--text-muted)]">Receipts</span>
                            <span className="font-medium text-[var(--text)]">{branch.total_receipts || 0}</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {showBranchBreakdownModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Branch breakdown"
          onClick={() => setShowBranchBreakdownModal(false)}
        >
          <div
            className="w-full max-w-5xl max-h-[85vh] flex flex-col rounded-2xl border border-[var(--stroke)] bg-[var(--card-bg-opaque)] shadow-[0_24px_48px_rgba(0,0,0,0.12)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--stroke)] bg-[var(--card-hover)]/50">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {branchBreakdownBranch?.branch || branchBreakdownBranch?.branch_name || 'Branch'}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  Period: {dateRange.from} → {dateRange.to} · Basis: pool split (active users)
                </div>
              </div>
              <button
                type="button"
                className="px-3 py-2 rounded-lg border border-[var(--stroke)] text-sm text-[var(--text-primary)] hover:bg-[var(--card-hover)]"
                onClick={() => setShowBranchBreakdownModal(false)}
              >
                Close
              </button>
            </div>

            <div className="p-6 overflow-auto">
              {branchBreakdownError && (
                <div className="mb-4 border border-[var(--error)]/60 bg-[var(--error-muted)] text-[var(--error)] px-4 py-3 rounded-lg">
                  {branchBreakdownError}
                </div>
              )}

              {branchBreakdownLoading ? (
                <div className="text-center py-10 text-[var(--text-muted)]">Loading…</div>
              ) : (
                <>
                  {(() => {
                    const first = branchBreakdownEmployees?.[0] || null
                    const monthly = toSafeNumber(first?.branch_monthly_target)
                    const sumPersonal = toSafeNumber(first?.sum_personal_targets)
                    const remaining = first?.remaining_pool != null ? toSafeNumber(first.remaining_pool) : (monthly - sumPersonal)
                    const unset = Number(first?.unset_count || 0)
                    const allocated = first?.allocated_target != null ? toSafeNumber(first.allocated_target) : (unset > 0 ? remaining / unset : 0)
                    const periodBranchTarget = scaleMonthlyTargetToDateRange(monthly, dateRange.from, dateRange.to)
                    return (
                      <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-5 sm:gap-6">
                        <div className="rounded-card border border-[var(--stroke)] bg-[var(--card-hover)]/50 p-3">
                          <div className="text-xs text-[var(--text-muted)]">Branch target (monthly)</div>
                          <div className="font-semibold text-[var(--text-primary)]">{formatCurrency(monthly)}</div>
                        </div>
                        <div className="rounded-card border border-[var(--stroke)] bg-[var(--card-hover)]/50 p-3">
                          <div className="text-xs text-[var(--text-muted)]">Branch target (period)</div>
                          <div className="font-semibold text-[var(--text-primary)]">{formatCurrency(periodBranchTarget)}</div>
                        </div>
                        <div className="rounded-card border border-[var(--stroke)] bg-[var(--card-hover)]/50 p-3">
                          <div className="text-xs text-[var(--text-muted)]">Personal targets (sum)</div>
                          <div className="font-semibold text-[var(--text-primary)]">{formatCurrency(sumPersonal)}</div>
                        </div>
                        <div className="rounded-card border border-[var(--stroke)] bg-[var(--card-hover)]/50 p-3">
                          <div className="text-xs text-[var(--text-muted)]">Unset users</div>
                          <div className="font-semibold text-[var(--text-primary)]">{unset}</div>
                        </div>
                        <div className="rounded-card border border-[var(--stroke)] bg-[var(--card-hover)]/50 p-3">
                          <div className="text-xs text-[var(--text-muted)]">Allocated / unset (monthly)</div>
                          <div className="font-semibold text-[var(--text-primary)]">{formatCurrency(allocated)}</div>
                        </div>
                      </div>
                    )
                  })()}

                  <div className="overflow-x-auto rounded-card border border-[var(--stroke)]">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--card-hover)]/50">
                        <tr className="text-left text-xs text-[var(--text-muted)]">
                          <th className="px-4 py-3">Employee</th>
                          <th className="px-4 py-3 text-right">Target (period, CC)</th>
                          <th className="px-4 py-3 text-right">Achieved CC</th>
                          <th className="px-4 py-3 text-right">Achieved Investments</th>
                          <th className="px-4 py-3 text-right">% (CC)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--stroke)]">
                        {(branchBreakdownEmployees || []).map((e, idx) => {
                          const effectiveMonthly = toSafeNumber(e.effective_target)
                          const targetPeriod = scaleMonthlyTargetToDateRange(effectiveMonthly, dateRange.from, dateRange.to)
                          const cc = toSafeNumber(e.total_cc)
                          const inv = toSafeNumber(e.total_investment)
                          const pct = targetPeriod > 0 ? Math.min(999, (cc / targetPeriod) * 100) : null
                          const label = e.employee_name || e.emp_code || `Employee ${idx + 1}`
                          const basis = e.personal_target != null ? 'personal' : 'allocated'
                          return (
                            <tr key={e.emp_code || e.id || idx} className="hover:bg-[var(--card-hover)]/30">
                              <td className="px-4 py-3">
                                <div className="font-medium text-[var(--text-primary)]">{label}</div>
                                <div className="text-xs text-[var(--text-muted)]">
                                  {e.emp_code ? `Code: ${e.emp_code}` : ''}{e.emp_code && e.role ? ' · ' : ''}{e.role ? `Role: ${e.role}` : ''}{(e.personal_target != null || e.allocated_target != null) ? ` · Basis: ${basis}` : ''}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)] tabular-nums">
                                {formatCurrency(targetPeriod)}
                              </td>
                              <td className="px-4 py-3 text-right text-[var(--text-secondary)] tabular-nums">
                                {formatCurrency(cc)}
                              </td>
                              <td className="px-4 py-3 text-right text-[var(--text-secondary)] tabular-nums">
                                {formatCurrency(inv)}
                              </td>
                              <td className="px-4 py-3 text-right text-[var(--text-secondary)] tabular-nums">
                                {pct == null ? '—' : `${pct.toFixed(0)}%`}
                              </td>
                            </tr>
                          )
                        })}
                        {(!branchBreakdownEmployees || branchBreakdownEmployees.length === 0) && (
                          <tr>
                            <td className="px-4 py-6 text-center text-[var(--text-muted)]" colSpan={5}>
                              No active users found for this branch.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
