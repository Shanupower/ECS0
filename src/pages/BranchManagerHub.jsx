import React, { Suspense, useCallback, useEffect, useMemo, useState, lazy } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FiActivity,
  FiAlertCircle,
  FiBriefcase,
  FiBarChart,
  FiFileText,
  FiTarget,
  FiUsers,
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { useBranchWorkspace } from './branch-workspace/BranchWorkspaceContext'

import GlobalFilterBar from '../components/branch-hub/GlobalFilterBar'
import { SkeletonChart } from '../components/branch-hub/ChartCard'

const OverviewTab = lazy(() => import('../components/branch-hub/OverviewTab'))
const EmployeesTab = lazy(() => import('../components/branch-hub/EmployeesTab'))
const ReceiptsTab = lazy(() => import('../components/branch-hub/ReceiptsTab'))
const PerformanceTab = lazy(() => import('../components/branch-hub/PerformanceTab'))
const CustomersTab = lazy(() => import('../components/branch-hub/CustomersTab'))
import EditTargetModal from '../components/branch-hub/EditTargetModal'
import HubActionStrip from '../components/branch-hub/HubActionStrip'
import { yearStartISO, yearEndISO, previousPeriod, classNames } from '../components/branch-hub/utils'

const TABS = [
  { id: 'overview', label: 'Overview', icon: FiActivity },
  { id: 'employees', label: 'Employees & Targets', icon: FiUsers },
  { id: 'receipts', label: 'Receipts & Pipeline', icon: FiFileText },
  { id: 'performance', label: 'Performance', icon: FiBarChart },
  { id: 'customers', label: 'Customers', icon: FiBriefcase },
]

export default function BranchManagerHub() {
  const { token, user } = useAuth()
  const {
    embedded,
    refreshSignal,
    scope: wsScope,
    includePending: wsIncludePending,
    focusedBranchCode: wsFocusedBranchCode,
  } = useBranchWorkspace()
  const isManager = user?.role === 'manager'
  const isAdmin = user?.role === 'admin'
  const canAccess = isManager || isAdmin
  // When an admin picks "All branches" in the workspace, Operations runs in network mode:
  // every widget aggregates across the whole network instead of one branch.
  const networkMode = embedded && isAdmin && wsScope === 'all_branches'

  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [branches, setBranches] = useState([])
  const [branchCode, setBranchCode] = useState(null)
  const [branchInfo, setBranchInfo] = useState(null)
  // Per-branch rollup used only in network mode (powers the network health grid,
  // target-by-branch pie and inactive-branch list).
  const [branchBreakdown, setBranchBreakdown] = useState([])

  const [filters, setFilters] = useState({
    from: yearStartISO(),
    to: yearEndISO(),
    includePending: embedded ? !!wsIncludePending : true,
    dateBasis: 'receipt',
    category: [],
    emp: [],
  })

  // When embedded, keep the per-section filter in sync with the workspace toggle.
  useEffect(() => {
    if (!embedded) return
    setFilters((f) =>
      f.includePending === !!wsIncludePending ? f : { ...f, includePending: !!wsIncludePending }
    )
  }, [embedded, wsIncludePending])
  const [compareEnabled, setCompareEnabled] = useState(false)

  // Data buckets
  const [branchStats, setBranchStats] = useState(null)
  const [branchStatsPrev, setBranchStatsPrev] = useState(null)
  const [employees, setEmployees] = useState([])
  const [recentReceipts, setRecentReceipts] = useState([])
  const [employeePerformance, setEmployeePerformance] = useState([])
  const [byDay, setByDay] = useState([])
  const [byDayPrev, setByDayPrev] = useState([])
  const [byCategory, setByCategory] = useState([])
  const [monthlyCcSi, setMonthlyCcSi] = useState([])
  const [leads, setLeads] = useState([])
  const [customers, setCustomers] = useState([])
  const [investorLocations, setInvestorLocations] = useState(null)
  const [queueMetrics, setQueueMetrics] = useState(null)
  const [hubOps, setHubOps] = useState({ tasks: [], taskTotal: 0, issues: [], issueTotal: 0 })

  // Edit target modal
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [targetDraft, setTargetDraft] = useState('')
  const [savingTarget, setSavingTarget] = useState(false)
  const [targetError, setTargetError] = useState('')

  // Refs for PNG snapshot.
  const resolveBranchCode = (branchesData) => {
    // Admins embedded in my_branch scope use whichever branch the workspace picker selected.
    if (embedded && isAdmin && wsScope === 'my_branch' && wsFocusedBranchCode) {
      const exists = (branchesData || []).some(
        (b) => String(b.branch_code) === String(wsFocusedBranchCode)
      )
      if (exists) return String(wsFocusedBranchCode)
    }
    const bc = user?.branch_code != null && String(user.branch_code).trim() !== '' ? String(user.branch_code).trim() : null
    if (bc) return bc
    const rawName = user?.branch != null ? String(user.branch).trim().toLowerCase() : ''
    if (!rawName) return null
    const match = (branchesData || []).find(
      (b) =>
        String(b.branch_name || '').trim().toLowerCase() === rawName ||
        String(b.branch_code || '').trim().toLowerCase() === rawName
    )
    return match?.branch_code ? String(match.branch_code) : null
  }

  // Category filter is applied client-side to rows we already have;
  // server-side filter could be added later.
  const applyCategoryFilter = useCallback(
    (rows) => {
      if (!filters.category?.length) return rows
      const set = new Set(filters.category)
      return (rows || []).filter((r) => {
        const cat = r?.product?.category || r?.product_category || r?.category || 'Other'
        return set.has(cat)
      })
    },
    [filters.category]
  )

  const loadMain = useCallback(async () => {
    if (!token || !canAccess) return
    setLoading(true)
    setError('')

    try {
      const branchesData = await api.listBranches(token, { includeInactive: '1' })
      setBranches(Array.isArray(branchesData) ? branchesData : [])
      const bc = networkMode ? null : resolveBranchCode(branchesData)
      setBranchCode(bc)
      const bi = bc ? (branchesData || []).find((b) => String(b.branch_code) === String(bc)) : null
      setBranchInfo(bi || null)

      // Non-network mode with no resolvable branch: bail early (legacy gate).
      if (!networkMode && !bc) {
        setBranchStats(null)
        setBranchStatsPrev(null)
        setEmployees([])
        setRecentReceipts([])
        setEmployeePerformance([])
        setByDay([])
        setByDayPrev([])
        setByCategory([])
        setMonthlyCcSi([])
        setLeads([])
        setCustomers([])
        setInvestorLocations(null)
        setQueueMetrics(null)
        setHubOps({ tasks: [], taskTotal: 0, issues: [], issueTotal: 0 })
        setBranchBreakdown([])
        setLoading(false)
        return
      }

      const q = {
        from: filters.from,
        to: filters.to,
        date_basis: filters.dateBasis,
        includePending: filters.includePending ? '1' : '0',
      }
      const prevRange = previousPeriod(filters.from, filters.to)

      if (networkMode) {
        // Network mode: aggregate across every branch. The admin /api/stats/summary and
        // /api/stats/branches endpoints already do system-wide rollups when no branch
        // context is passed, so we just stop scoping the calls.
        const [
          summaryRes,
          globalBranchRes,
          usersRes,
          receiptsRes,
          perfRes,
          byDayRes,
          byCategoryRes,
          monthlyRes,
          leadsRes,
          customersRes,
          investorsRes,
          queueRes,
          tasksRes,
          issuesRes,
        ] = await Promise.all([
          api.getStatsSummary(token, q).catch(() => null),
          api.getGlobalBranchStats(token, q).catch(() => null),
          api.listUsers(token).catch(() => []),
          api
            .listReceipts(token, { ...q, size: '200', sort: 'created_at:desc' })
            .catch(() => ({ items: [], data: [] })),
          api.getEmployeePerformance(token, q).catch(() => []),
          api.getStatsByDay(token, q).catch(() => []),
          api.getStatsByCategory(token, q).catch(() => []),
          api.getMonthlyCcSi(token, q).catch(() => []),
          api.listLeads(token).catch(() => []),
          api.listCustomers(token, { size: '200' }).catch(() => []),
          api.getInvestorLocations(token, q).catch(() => null),
          api.getBranchQueueMetrics(token, { stale_days: '14' }).catch(() => null),
          api.listTasks(token, { limit: '8', status: 'backlog,todo,in_progress,in_review,blocked', page: '1' }).catch(() => ({ items: [], total: 0 })),
          api.listMyIssues(token, { size: '8', status: 'open', page: '1' }).catch(() => ({ items: [], total: 0 })),
        ])

        // Synthesize a branchStats-shaped payload from /stats/summary + /stats/branches so
        // every downstream widget that reads `branchStats.statistics.*` continues to work.
        const netTotals = summaryRes || {}
        const networkMonthlyTarget = Number(globalBranchRes?.total_monthly_target || 0)
        setBranchStats({
          branch: null,
          statistics: {
            total_employees: (Array.isArray(usersRes) ? usersRes : []).length,
            total_customers: Number(netTotals.total_customers || 0),
            total_receipts: Number(netTotals.total_receipts || 0),
            total_investments: Number(netTotals.total_investments || 0),
            collection_credit: Number(netTotals.collection_credit_earned || 0),
            total_cc: Number(netTotals.collection_credit_earned || 0),
            commissions: Number(netTotals.collection_credit_earned || 0),
            service_income: Number(netTotals.service_income_earned || 0),
            total_si: Number(netTotals.service_income_earned || 0),
            // Expose the network monthly target so the existing target gauge can display it.
            network_monthly_target: networkMonthlyTarget,
          },
        })
        setBranchBreakdown(Array.isArray(globalBranchRes?.branches) ? globalBranchRes.branches : [])
        setEmployees(Array.isArray(usersRes) ? usersRes : [])
        const rec = receiptsRes?.items ?? receiptsRes?.data ?? []
        setRecentReceipts(Array.isArray(rec) ? rec : [])
        setEmployeePerformance(Array.isArray(perfRes) ? perfRes : [])
        setByDay(Array.isArray(byDayRes) ? byDayRes : [])
        setByCategory(Array.isArray(byCategoryRes) ? byCategoryRes : [])
        setMonthlyCcSi(Array.isArray(monthlyRes) ? monthlyRes : [])
        setLeads(Array.isArray(leadsRes) ? leadsRes : leadsRes?.items || [])
        const custs = Array.isArray(customersRes) ? customersRes : customersRes?.items || customersRes?.data || []
        setCustomers(custs)
        setInvestorLocations(investorsRes || null)
        setQueueMetrics(queueRes && typeof queueRes === 'object' ? queueRes : null)
        setHubOps({
          tasks: Array.isArray(tasksRes?.items) ? tasksRes.items : [],
          taskTotal: Number(tasksRes?.total) || 0,
          issues: Array.isArray(issuesRes?.items) ? issuesRes.items : [],
          issueTotal: Number(issuesRes?.total) || 0,
        })

        if (compareEnabled) {
          const qPrev = { ...q, from: prevRange.from, to: prevRange.to }
          const [summaryPrev, byDayPrevRes] = await Promise.all([
            api.getStatsSummary(token, qPrev).catch(() => null),
            api.getStatsByDay(token, qPrev).catch(() => []),
          ])
          setBranchStatsPrev(
            summaryPrev
              ? {
                  branch: null,
                  statistics: {
                    total_receipts: Number(summaryPrev.total_receipts || 0),
                    total_investments: Number(summaryPrev.total_investments || 0),
                    total_cc: Number(summaryPrev.collection_credit_earned || 0),
                  },
                }
              : null
          )
          setByDayPrev(Array.isArray(byDayPrevRes) ? byDayPrevRes : [])
        } else {
          setBranchStatsPrev(null)
          setByDayPrev([])
        }
        return
      }

      // Single-branch path (unchanged behaviour).
      const [
        statsRes,
        usersRes,
        receiptsRes,
        perfRes,
        byDayRes,
        byCategoryRes,
        monthlyRes,
        leadsRes,
        customersRes,
        investorsRes,
        queueRes,
        tasksRes,
        issuesRes,
      ] = await Promise.all([
        api.getBranchStats(token, bc, q),
        api.listUsers(
          token,
          isManager
            ? { scope: 'branch' }
            : isAdmin && bc
              ? { branch_code: bc }
              : undefined
        ),
        api.getBranchReceipts(token, bc, { ...q, size: '200', sort: 'created_at:desc' }).catch(() => ({ items: [], data: [] })),
        api.getEmployeePerformance(token, { ...q, branch_code: bc }).catch(() => []),
        api.getStatsByDay(token, { ...q, branch_code: bc }).catch(() => []),
        api.getStatsByCategory(token, { ...q, branch_code: bc }).catch(() => []),
        api.getMonthlyCcSi(token, { ...q, branch_code: bc }).catch(() => []),
        api
          .listLeads(token, isAdmin && bc ? { branch_code: bc } : undefined)
          .catch(() => []),
        api
          .listCustomers(token, {
            size: '200',
            ...(isAdmin && bc ? { branch_key: bc } : {})
          })
          .catch(() => []),
        api.getInvestorLocations(token, { ...q, branch_code: bc }).catch(() => null),
        api.getBranchQueueMetrics(token, { branch_code: bc, stale_days: '14' }).catch(() => null),
        api.listTasks(token, { limit: '8', status: 'backlog,todo,in_progress,in_review,blocked', page: '1' }).catch(() => ({ items: [], total: 0 })),
        api.listMyIssues(token, { size: '8', status: 'open', page: '1' }).catch(() => ({ items: [], total: 0 })),
      ])

      setBranchStats(statsRes || null)
      setBranchBreakdown([])
      setEmployees(Array.isArray(usersRes) ? usersRes : [])
      const rec = receiptsRes?.items ?? receiptsRes?.data ?? []
      setRecentReceipts(Array.isArray(rec) ? rec : [])
      setEmployeePerformance(Array.isArray(perfRes) ? perfRes : [])
      setByDay(Array.isArray(byDayRes) ? byDayRes : [])
      setByCategory(Array.isArray(byCategoryRes) ? byCategoryRes : [])
      setMonthlyCcSi(Array.isArray(monthlyRes) ? monthlyRes : [])
      setLeads(Array.isArray(leadsRes) ? leadsRes : leadsRes?.items || [])
      const custs = Array.isArray(customersRes) ? customersRes : customersRes?.items || customersRes?.data || []
      setCustomers(custs)
      setInvestorLocations(investorsRes || null)
      setQueueMetrics(queueRes && typeof queueRes === 'object' ? queueRes : null)
      setHubOps({
        tasks: Array.isArray(tasksRes?.items) ? tasksRes.items : [],
        taskTotal: Number(tasksRes?.total) || 0,
        issues: Array.isArray(issuesRes?.items) ? issuesRes.items : [],
        issueTotal: Number(issuesRes?.total) || 0,
      })

      if (compareEnabled) {
        const qPrev = { ...q, from: prevRange.from, to: prevRange.to }
        const [statsPrevRes, byDayPrevRes] = await Promise.all([
          api.getBranchStats(token, bc, qPrev).catch(() => null),
          api.getStatsByDay(token, { ...qPrev, branch_code: bc }).catch(() => []),
        ])
        setBranchStatsPrev(statsPrevRes || null)
        setByDayPrev(Array.isArray(byDayPrevRes) ? byDayPrevRes : [])
      } else {
        setBranchStatsPrev(null)
        setByDayPrev([])
      }
    } catch (e) {
      setError(e?.message || 'Failed to load branch manager hub')
    } finally {
      setLoading(false)
    }
  }, [token, canAccess, isManager, filters, compareEnabled, user?.branch, user?.branch_code, embedded, isAdmin, wsScope, wsFocusedBranchCode, networkMode])

  useEffect(() => {
    // Debounce so rapid filter changes do not hammer the API.
    const h = setTimeout(() => loadMain(), 150)
    return () => clearTimeout(h)
  }, [loadMain])

  useEffect(() => {
    if (!embedded || !refreshSignal) return
    loadMain()
  }, [embedded, refreshSignal, loadMain])

  // Derived values for all tabs.
  const personalTargetsSum = useMemo(
    () =>
      (employees || []).reduce((sum, u) => sum + (Number(u.personal_monthly_target) || 0), 0),
    [employees]
  )
  const branchMonthlyTarget = networkMode
    ? Number(branchStats?.statistics?.network_monthly_target || 0) || null
    : branchInfo?.monthly_target != null && branchInfo.monthly_target !== ''
      ? Number(branchInfo.monthly_target)
      : null

  // Category list for filter bar.
  const categoryOptions = useMemo(() => {
    const set = new Set()
    ;(byCategory || []).forEach((c) => c.category && set.add(c.category))
    return Array.from(set).sort()
  }, [byCategory])

  const filteredRecent = useMemo(() => applyCategoryFilter(recentReceipts), [applyCategoryFilter, recentReceipts])
  const filteredEmployees = useMemo(() => {
    if (!filters.emp?.length) return employees
    const set = new Set(filters.emp)
    return (employees || []).filter((u) => set.has(u.emp_code) || set.has(u.id) || set.has(u._key))
  }, [employees, filters.emp])
  const filteredPerformance = useMemo(() => {
    if (!filters.emp?.length) return employeePerformance
    const set = new Set(filters.emp)
    return (employeePerformance || []).filter((p) => set.has(p.emp_code))
  }, [employeePerformance, filters.emp])

  const startEditTarget = (emp) => {
    setTargetError('')
    setEditingEmployee(emp)
    const v = emp?.personal_monthly_target
    setTargetDraft(v != null && v !== '' ? String(v) : '')
  }

  const saveTarget = async () => {
    if (!token || !editingEmployee) return
    setSavingTarget(true)
    setTargetError('')
    try {
      const id = editingEmployee.id || editingEmployee._key
      if (!id) throw new Error('Invalid user id')
      const payload = {
        personal_monthly_target:
          targetDraft === '' || targetDraft == null ? null : Number(targetDraft),
      }
      await api.updateUser(token, id, payload)
      const usersRes = await api.listUsers(token, isManager ? { scope: 'branch' } : undefined)
      setEmployees(Array.isArray(usersRes) ? usersRes : [])
      setEditingEmployee(null)
      setTargetDraft('')
    } catch (e) {
      setTargetError(e?.detail || e?.message || 'Failed to update target')
    } finally {
      setSavingTarget(false)
    }
  }

  if (!canAccess) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center px-6 py-4 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--error)]">
          <FiAlertCircle className="w-5 h-5 mr-2" />
          Access denied. Branch Manager privileges required.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      {!embedded && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-muted)] flex items-center justify-center shrink-0">
                <FiTarget className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] truncate">
                  My Branch Power Tool
                </h1>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] truncate">
                  {branchInfo?.branch_name
                    ? `${branchInfo.branch_name} (${branchInfo.branch_code})`
                    : branchCode
                      ? `Branch ${branchCode}`
                      : 'Branch not set'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {embedded && (branchInfo || networkMode) && (
        <div className="text-[11px] text-[var(--text-muted)]">
          {networkMode
            ? `Network view · ${branches.length} branch${branches.length === 1 ? '' : 'es'}`
            : branchInfo?.branch_name
              ? `${branchInfo.branch_name} · ${branchInfo.branch_code}`
              : branchCode
                ? `Branch ${branchCode}`
                : ''}
        </div>
      )}

      {branchCode && !networkMode && (
        <HubActionStrip
          branchCode={branchCode}
          token={token}
          exportRange={{ from: filters.from, to: filters.to }}
        />
      )}

      <GlobalFilterBar
        filters={filters}
        setFilters={setFilters}
        categories={categoryOptions}
        employees={employees}
        onRefresh={loadMain}
        compareEnabled={compareEnabled}
        setCompareEnabled={setCompareEnabled}
        loading={loading}
        embedded={embedded}
      />

      {error && (
        <div className="border border-[var(--error)]/60 bg-[var(--error-muted)] text-[var(--error)] px-4 py-3 rounded-lg flex items-center text-sm">
          <FiAlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {!branchCode && !networkMode && !loading ? (
        <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] p-6 text-[var(--text-secondary)]">
          Your user does not have a branch assigned. Please ask an admin to set your <code>branch_code</code>.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Branch hub sections">
            {TABS.map((t) => {
              const Icon = t.icon
              const active = activeTab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`hub-panel-${t.id}`}
                  id={`hub-tab-${t.id}`}
                  onClick={() => setActiveTab(t.id)}
                  className={classNames(
                    'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors',
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]'
                      : 'border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              )
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              id={`hub-panel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`hub-tab-${activeTab}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              <Suspense
                fallback={
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <SkeletonChart height={280} />
                    <SkeletonChart height={280} />
                  </div>
                }
              >
              {activeTab === 'overview' && (
                <OverviewTab
                  loading={loading}
                  branchStats={branchStats}
                  branchStatsPrev={branchStatsPrev}
                  byDay={byDay}
                  byDayPrev={byDayPrev}
                  byCategory={byCategory}
                  employees={filteredEmployees}
                  employeePerformance={filteredPerformance}
                  monthlyCcSi={monthlyCcSi}
                  recentReceipts={filteredRecent}
                  leads={leads}
                  branchCode={branchCode}
                  compare={compareEnabled}
                  branchMonthlyTarget={branchMonthlyTarget}
                  personalTargetsSum={personalTargetsSum}
                  dateRange={{ from: filters.from, to: filters.to }}
                  includePending={filters.includePending}
                  dateBasis={filters.dateBasis}
                  queueMetrics={queueMetrics}
                  hubTasks={hubOps.tasks}
                  hubTaskTotal={hubOps.taskTotal}
                  hubIssues={hubOps.issues}
                  hubIssueTotal={hubOps.issueTotal}
                  networkMode={networkMode}
                  branchBreakdown={branchBreakdown}
                />
              )}
              {activeTab === 'employees' && (
                <EmployeesTab
                  loading={loading}
                  employees={filteredEmployees}
                  employeePerformance={filteredPerformance}
                  recentReceipts={filteredRecent}
                  branchMonthlyTarget={branchMonthlyTarget}
                  onEditTarget={startEditTarget}
                  networkMode={networkMode}
                  branchBreakdown={branchBreakdown}
                />
              )}
              {activeTab === 'receipts' && (
                <ReceiptsTab
                  loading={loading}
                  byDay={byDay}
                  byCategory={byCategory}
                  recentReceipts={filteredRecent}
                  leads={leads}
                  customers={customers}
                  branchStats={branchStats}
                />
              )}
              {activeTab === 'performance' && (
                <PerformanceTab
                  loading={loading}
                  byDay={byDay}
                  byDayPrev={byDayPrev}
                  byCategory={byCategory}
                  monthlyCcSi={monthlyCcSi}
                  employeePerformance={filteredPerformance}
                  recentReceipts={filteredRecent}
                  branchMonthlyTarget={branchMonthlyTarget}
                  compare={compareEnabled}
                  dateRange={{ from: filters.from, to: filters.to }}
                />
              )}
              {activeTab === 'customers' && (
                <CustomersTab
                  loading={loading}
                  customers={customers}
                  leads={leads}
                  investorLocations={investorLocations}
                  recentReceipts={filteredRecent}
                />
              )}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </>
      )}

      <EditTargetModal
        employee={editingEmployee}
        draft={targetDraft}
        setDraft={setTargetDraft}
        onClose={() => {
          setEditingEmployee(null)
          setTargetDraft('')
          setTargetError('')
        }}
        onSave={saveTarget}
        saving={savingTarget}
        error={targetError}
      />
    </div>
  )
}
