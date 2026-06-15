import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAppConfig } from '../context/AppConfigContext'
import { api } from '../api'
import { Card, Button, SegmentedControl, Switch, Skeleton } from '../components/ui'
import DatePickerInput from '../components/ui/DatePickerInput.jsx'
import DashboardStaticLayout from '../features/dashboard/DashboardStaticLayout.jsx'
import { renderDashboardWidget } from '../features/dashboard/widgets/index.jsx'
import {
  ALL_WIDGET_IDS,
  WIDGET_LABELS,
  migrateWidgetIds,
  defaultWidgetIdsForRole,
  defaultDashboardPrefs,
  isWidgetAllowed
} from '../features/dashboard/dashboard-layout.js'
import { scaleMonthlyTargetToDateRange, toSafeNumber } from '../features/dashboard/dashboard-utils.js'
import { getCategoryLabel } from '../features/dashboard/dashboard-chart-constants.js'
import {
  FiCalendar,
  FiRefreshCw,
  FiAlertCircle,
  FiSettings,
  FiX,
  FiRotateCcw
} from 'react-icons/fi'

const DASHBOARD_STACK = 'space-y-8'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCustomizeModal, setShowCustomizeModal] = useState(false)
  const [customizeSelection, setCustomizeSelection] = useState([])
  const [resettingDashboard, setResettingDashboard] = useState(false)
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
  const defaultPrefsOptions = useMemo(
    () => ({ includePendingApprovals: approvalFlagOn }),
    [approvalFlagOn]
  )
  const effectiveWidgetIds = useMemo(
    () => migrateWidgetIds(
      user?.dashboard_widgets != null && Array.isArray(user.dashboard_widgets)
        ? user.dashboard_widgets
        : defaultWidgetIdsForRole(isAdmin, defaultPrefsOptions)
    ) || defaultWidgetIdsForRole(isAdmin, defaultPrefsOptions),
    [user?.dashboard_widgets, isAdmin, defaultPrefsOptions]
  )
  const showWidget = useCallback((id) => effectiveWidgetIds.includes(id), [effectiveWidgetIds])

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
        const perfQuery = {
          from: dateRange.from,
          to: dateRange.to,
          date_basis: dateBasis,
          includePending: includePending ? '1' : '0'
        }
        if (
          viewMode === 'branch' ||
          (!isAdmin && (user?.role === 'manager' || user?.role === 'branch'))
        ) {
          const bc = user?.branch_code || user?.branch
          if (bc) perfQuery.branch_code = String(bc).trim()
        }
        const perf = await api.getEmployeePerformance(token, perfQuery)
        const rows = Array.isArray(perf) ? perf : (perf?.items || perf?.data || [])
        const ranked = [...(Array.isArray(rows) ? rows : [])].sort(
          (a, b) => (Number(b.total_investment) || 0) - (Number(a.total_investment) || 0)
        )
        setTopEmployees(ranked.slice(0, 5))
      } catch (perfErr) {
        console.error('Top employees load error:', perfErr)
        setTopEmployees([])
      }
      try {
        const leads = await api.listLeads(token, { limit: '50' })
        setLeadsSnapshot(leads.items || leads.data || leads || [])
      } catch { setLeadsSnapshot([]) }
      try {
        // Backend expects `size` (not `limit`) and admin can view ALL issues via `/api/issues`.
        const issuesRes = isAdmin
          ? await api.listIssues(token, { status: 'open', page: '1', size: '5', sort: 'created_at:desc' })
          : await api.listMyIssues(token, { status: 'open', page: '1', size: '5', sort: 'created_at:desc' })

        const items = issuesRes?.items || issuesRes?.data || issuesRes || []
        setIssuesSnapshot(items)
        setIssuesSnapshotTotal(Number(issuesRes?.total ?? (Array.isArray(items) ? items.length : 0)) || 0)
      } catch {
        setIssuesSnapshot([])
        setIssuesSnapshotTotal(0)
      }
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


  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

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

  const targetMetrics = useMemo(() => {
    let monthlyBasis = 0
    let targetBasisHint = null

    if (isAdmin && viewMode === 'all') {
      if (branchStats?.branches?.length) {
        const branches = branchStats.branches
        monthlyBasis =
          branchStats.total_monthly_target != null && branchStats.total_monthly_target !== ''
            ? toSafeNumber(branchStats.total_monthly_target)
            : branches.reduce((s, b) => s + toSafeNumber(b.total_target), 0)
        targetBasisHint = 'All branches — sum of monthly targets (prorated to selected dates)'
      }
    } else if (summary?.effective_target != null) {
      monthlyBasis = toSafeNumber(summary.effective_target)
      if (summary?.personal_target != null) {
        targetBasisHint = 'Personal monthly target'
      } else if (summary?.allocated_target != null) {
        targetBasisHint = 'Your share of branch target pool'
      }
    } else {
      monthlyBasis = toSafeNumber(summary?.branch_target)
      if (monthlyBasis > 0) {
        targetBasisHint = viewMode === 'branch' ? 'Your branch monthly target' : 'Branch monthly target'
      }
    }

    const periodTargetNum = scaleMonthlyTargetToDateRange(monthlyBasis, dateRange.from, dateRange.to)
    const targetActualCc = summary?.collection_credit_earned ?? 0
    const actualNum = toSafeNumber(targetActualCc)
    const hasTarget = periodTargetNum > 0
    const targetProgressPct = hasTarget
      ? (actualNum >= periodTargetNum
          ? 100
          : Math.min(100, Math.max(0, (actualNum / periodTargetNum) * 100)))
      : null

    return {
      periodTargetNum,
      targetProgressPct,
      targetActualCc,
      targetActualCcLabel: 'Actual CC (selected scope):',
      targetBasisHint,
      hasTarget,
      targetLoading: isAdmin && viewMode === 'all' && !!summary && !branchStats
    }
  }, [summary, branchStats, isAdmin, viewMode, dateRange.from, dateRange.to])

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

  const widgetCtx = useMemo(() => ({
    summary,
    isAdmin,
    isEmployee,
    isBranchManager,
    viewMode,
    ...targetMetrics,
    categoryChartData,
    dailyStats,
    branchStats,
    monthlyCcSi,
    recentReceipts,
    topEmployees,
    leadsSnapshot,
    issuesSnapshot,
    issuesSnapshotTotal,
    allBranchesTargetSummary,
    overdueTasks,
    dateRange,
    formatCurrency,
    formatDate,
    navigate,
    scaleMonthlyTargetToDateRange,
    toSafeNumber,
    openBranchBreakdown,
    approvalFlagOn,
    approvalsCount
  }), [
    summary, isAdmin, isEmployee, isBranchManager, viewMode, targetMetrics,
    categoryChartData, dailyStats, branchStats, monthlyCcSi, recentReceipts,
    topEmployees, leadsSnapshot, issuesSnapshot, issuesSnapshotTotal,
    allBranchesTargetSummary, overdueTasks, dateRange, navigate,
    approvalFlagOn, approvalsCount
  ])

  const activeWidgetIds = useMemo(() => {
    if (!summary) return []
    return effectiveWidgetIds.filter((id) => isWidgetAllowed(id, widgetCtx))
  }, [effectiveWidgetIds, widgetCtx, summary])

  const handleResetDashboard = async () => {
    const confirmed = window.confirm(
      'Reset your dashboard to the default widgets? Your current selection will be replaced.'
    )
    if (!confirmed) return
    setResettingDashboard(true)
    try {
      const defaults = defaultDashboardPrefs(isAdmin, defaultPrefsOptions)
      await api.updateMyProfile(token, {
        dashboard_widgets: defaults.dashboard_widgets
      })
      setCustomizeSelection([...defaults.dashboard_widgets])
      setShowCustomizeModal(false)
      await refreshUser()
    } catch (err) {
      console.error(err)
    } finally {
      setResettingDashboard(false)
    }
  }

  return (
    <div className={DASHBOARD_STACK}>
      {/* Hero: welcome + refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-[var(--text-primary)]">
            {isEmployee ? 'My Performance' : 'Dashboard'}
          </h1>
          <p className="text-helper mt-1">
            {isEmployee
              ? 'Your personal dashboard — customize widgets; saved to your account only.'
              : 'Overview of financial transactions. Customize widgets; each user has their own saved dashboard.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
                  <p className="text-sm text-[var(--text-muted)] mt-0.5">
                    Choose widgets for your dashboard. Layout follows the fixed company dashboard.
                  </p>
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
                {ALL_WIDGET_IDS.filter((id) => {
                  if (id === 'pending_approvals') return approvalFlagOn
                  if (id === 'service_income_earned' || id === 'cc_vs_si' || id === 'branch_performance') return isAdmin
                  return true
                }).map((id) => {
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
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--stroke)] bg-[var(--card-hover)]/30 px-6 py-4">
              <Button
                variant="secondary"
                icon={<FiRotateCcw className="w-4 h-4" />}
                onClick={handleResetDashboard}
                disabled={resettingDashboard}
              >
                Reset to default
              </Button>
              <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowCustomizeModal(false)} disabled={resettingDashboard}>
                Cancel
              </Button>
              <Button
                disabled={resettingDashboard}
                onClick={async () => {
                  try {
                    const migrated = migrateWidgetIds(customizeSelection)
                    await api.updateMyProfile(token, { dashboard_widgets: migrated })
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} padding="md">
                <Skeleton variant="line" lines={3} />
              </Card>
            ))}
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
          <DashboardStaticLayout
            widgetIds={activeWidgetIds}
            renderWidget={(id) => renderDashboardWidget(id, widgetCtx)}
          />
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
