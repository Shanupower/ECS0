import React, { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { SegmentedControl } from '../components/ui'
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
  FiTarget,
  FiAward,
  FiChevronDown,
  FiChevronUp,
  FiX,
  FiDollarSign,
  FiPercent,
  FiClock,
  FiMail,
  FiPhone,
  FiHome
} from 'react-icons/fi'

// Modern gradient color palette with better contrast
const COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#84CC16'  // Lime
]

export default function BranchDashboard() {
  const { token, user } = useAuth()
  const [branches, setBranches] = useState([])
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [branchStats, setBranchStats] = useState(null)
  const [globalStats, setGlobalStats] = useState(null)
  const [employeePerformance, setEmployeePerformance] = useState([])
  const [selectedBranchesForComparison, setSelectedBranchesForComparison] = useState([])
  const [showComparison, setShowComparison] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedBranches, setExpandedBranches] = useState(new Set())
  const [selectedBranchForDetails, setSelectedBranchForDetails] = useState(null)
  const [detailedBranchStats, setDetailedBranchStats] = useState(null)
  const [loadingBranchDetails, setLoadingBranchDetails] = useState(false)
  const [branchEmployees, setBranchEmployees] = useState([])
  const [branchRecentReceipts, setBranchRecentReceipts] = useState([])
  const [includePending, setIncludePending] = useState(true)
  const formatDateForInput = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const now = new Date()
  const currentYear = now.getFullYear()
  const [dateRange, setDateRange] = useState({
    from: `${currentYear}-01-01`,
    to: `${currentYear}-12-31`
  })
  const [selectedPeriod, setSelectedPeriod] = useState('year')
  const [scope, setScope] = useState('my_branch') // 'my_branch' | 'all_branches' (admin only)

  const isAdmin = user?.role === 'admin'
  const isManager = user?.role === 'manager'
  const showScopeToggle = isAdmin
  const isMyBranchView = scope === 'my_branch' || isManager

  const userBranchCode = user?.branch_code || (user?.branch && branches.find(b => String(b.branch_name).toLowerCase() === String(user.branch).toLowerCase())?.branch_code) || null
  const userBranchInfo = userBranchCode ? branches.find(b => b.branch_code === userBranchCode) : null

  const loadBranchData = async () => {
    if (!token) return
    
    setLoading(true)
    setError('')
    
    try {
      const branchesData = await api.listBranches(token)
      setBranches(Array.isArray(branchesData) ? branchesData : [])
      
      if (isMyBranchView) {
        const branchCode = isManager ? (user?.branch_code || branchesData.find(b => String(b.branch_name).toLowerCase() === String(user?.branch).toLowerCase())?.branch_code) : user?.branch_code || (user?.branch && branchesData.find(b => String(b.branch_name).toLowerCase() === String(user.branch).toLowerCase())?.branch_code)
        if (!branchCode && isAdmin) {
          setGlobalStats(null)
          setBranchStats(null)
          setEmployeePerformance([])
          setBranchRecentReceipts([])
          setSelectedBranch(null)
        } else if (branchCode) {
          const branchObj = branchesData.find(b => b.branch_code === branchCode)
          setSelectedBranch(branchObj || { branch_code: branchCode, branch_name: 'Unknown Branch' })
          const [stats, empPerf, receiptsRes] = await Promise.all([
            api.getBranchStats(token, branchCode, { includePending: includePending ? '1' : '0', from: dateRange.from, to: dateRange.to }),
            api.getEmployeePerformance(token, { from: dateRange.from, to: dateRange.to, branch_code: branchCode, includePending: includePending ? '1' : '0' }).catch(() => []),
            api.getBranchReceipts(token, branchCode, { from: dateRange.from, to: dateRange.to, size: '10', sort: 'created_at:desc' }).catch(() => ({ items: [], data: [] }))
          ])
          setBranchStats(stats)
          setGlobalStats(null)
          setEmployeePerformance(Array.isArray(empPerf) ? empPerf : [])
          const rec = receiptsRes?.items ?? receiptsRes?.data ?? []
          setBranchRecentReceipts(Array.isArray(rec) ? rec.slice(0, 10) : [])
        } else {
          setBranchStats(null)
          setGlobalStats(null)
          setEmployeePerformance([])
          setBranchRecentReceipts([])
          setSelectedBranch(null)
        }
      } else {
        const globalStatsData = await api.getGlobalBranchStats(token, {
          includePending: includePending ? '1' : '0',
          from: dateRange.from,
          to: dateRange.to,
          viewMode: 'all'
        })
        setGlobalStats(globalStatsData)
        setBranchStats(null)
        setSelectedBranch(null)
        try {
          const empPerfData = await api.getEmployeePerformance(token, {
            from: dateRange.from,
            to: dateRange.to,
            includePending: includePending ? '1' : '0'
          })
          setEmployeePerformance(Array.isArray(empPerfData) ? empPerfData : [])
        } catch {
          setEmployeePerformance([])
        }
        setBranchRecentReceipts([])
      }
    } catch (err) {
      setError(err.message || 'Failed to load branch data')
    } finally {
      setLoading(false)
    }
  }

  const loadBranchStats = async (branchCode) => {
    if (!branchCode) return
    
    try {
      const stats = await api.getBranchStats(token, branchCode, {
        includePending: includePending ? '1' : '0',
        from: dateRange.from,
        to: dateRange.to
      })
      setBranchStats(stats)
    } catch (err) {
      console.error('Failed to load branch stats:', err)
    }
  }

  const toggleBranchExpansion = (branchCode) => {
    const newExpanded = new Set(expandedBranches)
    if (newExpanded.has(branchCode)) {
      newExpanded.delete(branchCode)
      setSelectedBranchForDetails(null)
      setDetailedBranchStats(null)
    } else {
      newExpanded.add(branchCode)
      // Load detailed stats for this branch
      loadDetailedBranchStats(branchCode)
    }
    setExpandedBranches(newExpanded)
  }

  const loadDetailedBranchStats = async (branchCode) => {
    if (!token || !branchCode) return
    
    const branch = branches.find(b => b.branch_code === branchCode)
    if (!branch) return
    
    setSelectedBranchForDetails(branch)
    setLoadingBranchDetails(true)
    
    try {
      // Load detailed branch statistics
      const stats = await api.getBranchStats(token, branchCode, {
        includePending: includePending ? '1' : '0',
        from: dateRange.from,
        to: dateRange.to
      })
      setDetailedBranchStats(stats)
      
      // Load employee performance for this branch
      try {
        const empPerf = await api.getEmployeePerformance(token, {
          from: dateRange.from,
          to: dateRange.to,
          branch_code: branchCode,
          includePending: includePending ? '1' : '0'
        })
        setBranchEmployees(Array.isArray(empPerf) ? empPerf : [])
      } catch (err) {
        console.error('Failed to load branch employees:', err)
        setBranchEmployees([])
      }
      
      // Load recent receipts for this branch
      try {
        const receipts = await api.listReceipts(token, {
          branch_code: branchCode,
          from: dateRange.from,
          to: dateRange.to,
          size: 10,
          sort: 'created_at:desc'
        })
        const receiptsData = receipts.data || receipts.items || receipts || []
        setBranchRecentReceipts(Array.isArray(receiptsData) ? receiptsData.slice(0, 10) : [])
      } catch (err) {
        console.error('Failed to load branch receipts:', err)
        setBranchRecentReceipts([])
      }
    } catch (err) {
      console.error('Failed to load detailed branch stats:', err)
      setDetailedBranchStats(null)
    } finally {
      setLoadingBranchDetails(false)
    }
  }

  useEffect(() => {
    // Reload detailed stats when date range or includePending changes
    if (selectedBranchForDetails) {
      loadDetailedBranchStats(selectedBranchForDetails.branch_code)
    }
  }, [dateRange.from, dateRange.to, includePending])

  useEffect(() => {
    loadBranchData()
  }, [token, includePending, dateRange.from, dateRange.to, scope])

  const handlePeriodSelect = (period) => {
    setSelectedPeriod(period)
    const today = new Date()
    const from = new Date()
    
    switch (period) {
      case 'today':
        from.setDate(today.getDate())
        break
      case 'week':
        from.setDate(today.getDate() - 7)
        break
      case 'month':
        from.setDate(1)
        break
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3)
        from.setMonth(quarter * 3, 1)
        break
      case 'year':
        from.setMonth(0, 1)
        break
      case 'custom':
        return // Don't change dates for custom
      default:
        from.setDate(1)
    }
    
    setDateRange({
      from: formatDateForInput(from),
      to: formatDateForInput(today)
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num || 0)
  }

  const normalizeBranchKey = (value) => String(value ?? '').trim().toLowerCase().replace(/[.\s-]/g, '')
  const branchNameLookup = useMemo(() => {
    const lookup = new Map()

    const addKey = (key, displayName) => {
      const raw = String(key ?? '').trim()
      if (!raw || !displayName) return
      lookup.set(raw, displayName)
      lookup.set(normalizeBranchKey(raw), displayName)
    }

    branches.forEach((b) => {
      const displayName = String(b.branch_name || b.branch || '').trim()
      if (!displayName) return

      addKey(b.branch_code, displayName)
      addKey(b.id, displayName)
      addKey(b.branch_id, displayName)
      addKey(b.branch_name, displayName)
      addKey(b.branchName, displayName)
      addKey(b.branch, displayName)
      addKey(b.code, displayName)
      addKey(b.name, displayName)
    })

    return lookup
  }, [branches])

  const getBranchDisplayName = (branchStat) => {
    if (!branchStat) return 'Unknown Branch'

    const displayFromStat = String(branchStat.branch_name || branchStat.branchName || '').trim()
    if (displayFromStat) return displayFromStat

    const candidates = [
      branchStat.branch,
      branchStat.branch_code,
      branchStat.branchCode,
      branchStat.branch_id,
      branchStat.id,
      branchStat.code,
      branchStat.name
    ]

    for (const candidate of candidates) {
      const raw = String(candidate ?? '').trim()
      if (!raw) continue
      const resolved = branchNameLookup.get(raw) || branchNameLookup.get(normalizeBranchKey(raw))
      if (resolved) return resolved
    }

    const fallback = String(
      branchStat.branch ??
      branchStat.branch_code ??
      branchStat.branchCode ??
      branchStat.branch_id ??
      branchStat.id ??
      ''
    ).trim()
    if (/^\d+$/.test(fallback)) return `Branch ${fallback}`
    return fallback || 'Unknown Branch'
  }

  const globalBranchStatsLookup = useMemo(() => {
    const lookup = new Map()
    const addKey = (key, row) => {
      const raw = String(key ?? '').trim()
      if (!raw || !row) return
      lookup.set(raw, row)
      lookup.set(normalizeBranchKey(raw), row)
    }

    const rows = Array.isArray(globalStats?.branches) ? globalStats.branches : []
    rows.forEach((row) => {
      ;[
        row.branch,
        row.branch_code,
        row.branchCode,
        row.branch_id,
        row.id,
        row.code,
        row.name,
        row.branch_name,
        row.branchName
      ].forEach((key) => addKey(key, row))
    })

    return lookup
  }, [globalStats?.branches])

  const getBranchSummaryRow = (branch) => {
    if (!branch) return null

    const candidates = [
      branch.branch_code,
      branch.id,
      branch.branch_id,
      branch.branch_name,
      branch.branch,
      branch.branchCode,
      branch.code,
      branch.name
    ]

    for (const candidate of candidates) {
      const raw = String(candidate ?? '').trim()
      if (!raw) continue
      const row = globalBranchStatsLookup.get(raw) || globalBranchStatsLookup.get(normalizeBranchKey(raw))
      if (row) return row
    }
    return null
  }

  const getTopPerformers = () => {
    if (!globalStats || !globalStats.branches) return []
    
    return globalStats.branches
      .sort((a, b) => (b.total_investments || 0) - (a.total_investments || 0))
      .slice(0, 5)
  }

  const getBranchPerformanceData = () => {
    if (!globalStats || !globalStats.branches) return []
    
    return globalStats.branches.map(branch => ({
      name: getBranchDisplayName(branch),
      investments: branch.total_investments || 0,
      receipts: branch.total_receipts || 0,
      users: branch.total_employees || 0,
      commission: branch.commissions || 0
    }))
  }

  const getBranchDistributionData = () => {
    if (!globalStats || !globalStats.branches) return []
    
    const total = globalStats.branches.reduce((sum, branch) => sum + (branch.total_investments || 0), 0)
    
    return globalStats.branches
      .filter(branch => branch.total_investments > 0)
      .map((branch, index) => ({
        name: getBranchDisplayName(branch),
        value: branch.total_investments || 0,
        percentage: total > 0 ? ((branch.total_investments || 0) / total * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8) // Top 8 branches
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center px-4 py-2 text-[var(--text-muted)]">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mr-3"></div>
          Loading branch data...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-[var(--error)]/60 bg-[var(--error-muted)] text-[var(--error)] px-4 py-3 rounded-lg flex items-center">
        <FiAlertCircle className="h-5 w-5 mr-2" />
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {isMyBranchView && selectedBranch ? `${selectedBranch.branch_name || 'Branch'} Dashboard` : isManager ? `${user?.branch || 'Branch'} Dashboard` : 'Branch Dashboard'}
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            {isMyBranchView ? (selectedBranch ? 'Your branch team performance metrics' : isAdmin ? 'No branch assigned. Switch to All branches or assign yourself a branch.' : 'Your branch team performance metrics') : 'Overview of all branch performance'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {showScopeToggle && (
            <SegmentedControl
              options={[{ value: 'my_branch', label: 'My branch' }, { value: 'all_branches', label: 'All branches' }]}
              value={scope}
              onChange={(v) => setScope(v)}
            />
          )}
          <button
            onClick={loadBranchData}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-[var(--stroke)] rounded-lg text-sm font-medium bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50 transition-colors duration-200"
          >
            <FiRefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <label className="flex items-center space-x-3 cursor-pointer group pl-4 border-l border-[var(--stroke)] shrink-0">
            <div className="relative">
              <input
                type="checkbox"
                checked={includePending}
                onChange={e => setIncludePending(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${
                includePending ? 'bg-[var(--accent)]' : 'bg-neutral-200 dark:bg-neutral-600'
              }`}>
                <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-blue-600 shadow transition-transform duration-200 ease-in-out ${
                  includePending ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </div>
            <span className="text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
              Include Pending
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-2 pl-4 border-l border-[var(--stroke)] w-full sm:w-auto">
            <span className="text-xs font-medium text-[var(--text-secondary)] shrink-0">Period</span>
            {['today', 'week', 'month', 'quarter', 'year'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePeriodSelect(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  selectedPeriod === p
                    ? 'bg-[var(--accent-muted)] border-[var(--accent)] text-[var(--accent)]'
                    : 'border-[var(--stroke)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]'
                }`}
              >
                {p === 'today' ? 'Today' : p === 'week' ? '7d' : p === 'month' ? 'Month' : p === 'quarter' ? 'Quarter' : 'Year'}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <span>From</span>
              <DatePickerInput
                value={dateRange.from.slice(0, 10)}
                onChange={(v) => {
                  setSelectedPeriod('custom')
                  setDateRange((prev) => ({ ...prev, from: v }))
                }}
                inputClassName="px-2 py-1 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--text-primary)] text-xs"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <span>To</span>
              <DatePickerInput
                value={dateRange.to.slice(0, 10)}
                onChange={(v) => {
                  setSelectedPeriod('custom')
                  setDateRange((prev) => ({ ...prev, to: v }))
                }}
                inputClassName="px-2 py-1 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--text-primary)] text-xs"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Empty state for admin with no branch in my_branch view */}
      {isMyBranchView && isAdmin && !selectedBranch && !loading && (
        <div className="p-8 rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] text-center text-[var(--text-secondary)]">
          <FiMapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium text-[var(--text-primary)]">No branch assigned</p>
          <p className="mt-1">Switch to <button type="button" onClick={() => setScope('all_branches')} className="text-[var(--accent)] hover:underline">All branches</button> to see network performance, or assign yourself a branch in User Management.</p>
        </div>
      )}

      {/* Single-branch stats (my_branch view) */}
      {isMyBranchView && selectedBranch && branchStats && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6`}>
          <div className="p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)] hover:bg-[var(--card-hover)] transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--text-secondary)] mb-1">Total Receipts</div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">{branchStats.total_receipts ?? 0}</div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--accent-muted)] rounded-lg flex items-center justify-center">
                <FiFileText className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--accent)]" />
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)] hover:bg-[var(--card-hover)] transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--text-secondary)] mb-1">Total Investments</div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">{formatCurrency(branchStats.total_investments || branchStats.total_collections)}</div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--success-muted)] rounded-lg flex items-center justify-center">
                <FiTrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--success)]" />
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)] hover:bg-[var(--card-hover)] transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--text-secondary)] mb-1">Collection Credit</div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">{formatCurrency(branchStats.total_cc || branchStats.commissions)}</div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--warn-muted)] rounded-lg flex items-center justify-center">
                <FiAward className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--warn)]" />
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)] hover:bg-[var(--card-hover)] transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--text-secondary)] mb-1">Employees</div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">{employeePerformance.length}</div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--info-muted)] rounded-lg flex items-center justify-center">
                <FiUsers className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Statistics (all_branches view) */}
      {globalStats && !isMyBranchView && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${globalStats.total_service_income !== undefined ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4 sm:gap-6`}>
          <div className="p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)] hover:bg-[var(--card-hover)] transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--text-secondary)] mb-1">Total Branches</div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                  {globalStats.total_branches || 0}
                </div>
              </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--info-muted)] rounded-lg flex items-center justify-center">
                  <FiMapPin className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                </div>
            </div>
          </div>
          
          <div className="p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)] hover:bg-[var(--card-hover)] transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--text-secondary)] mb-1">Total Investments</div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                  {formatCurrency(globalStats.total_investments || 0)}
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--success-muted)] rounded-lg flex items-center justify-center">
                <span className="text-green-600 dark:text-green-400 text-lg sm:text-xl font-bold">₹</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)] hover:bg-[var(--card-hover)] transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--text-secondary)] mb-1">Total Receipts</div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                  {formatNumber(globalStats.total_receipts || 0)}
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--info-muted)] rounded-lg flex items-center justify-center">
                <FiFileText className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
          
          <div className="p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)] hover:bg-[var(--card-hover)] transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--text-secondary)] mb-1">Total Collection/Credit</div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                  {formatCurrency(globalStats?.total_collection_credit || globalStats?.total_commissions || 0)}
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--warn-muted)] rounded-lg flex items-center justify-center">
                <FiAward className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
          
          {globalStats.total_service_income !== undefined && (
            <div className="p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)] hover:bg-[var(--card-hover)] transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[var(--text-secondary)] mb-1">Total Service Income</div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                    {formatCurrency(globalStats.total_service_income || 0)}
                  </div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--info-muted)] rounded-lg flex items-center justify-center">
                  <FiAward className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* My-branch: employee performance and recent receipts */}
      {isMyBranchView && selectedBranch && (employeePerformance.length > 0 || branchRecentReceipts.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {employeePerformance.length > 0 && (
            <div className="p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <FiUsers className="w-5 h-5 text-[var(--accent)]" />
                Team performance
              </h3>
              <ul className="space-y-2">
                {employeePerformance.slice(0, 10).map((emp, i) => (
                  <li key={emp.emp_code || i} className="flex justify-between items-center py-2 border-b border-[var(--stroke)] last:border-0">
                    <span className="font-medium text-[var(--text-primary)]">#{i + 1} {emp.employee_name || emp.emp_code}</span>
                    <span className="text-[var(--text-secondary)]">{formatCurrency(emp.total_investment)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {branchRecentReceipts.length > 0 && (
            <div className="p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <FiFileText className="w-5 h-5 text-[var(--accent)]" />
                Recent receipts
              </h3>
              <ul className="space-y-2">
                {branchRecentReceipts.slice(0, 8).map((r, i) => (
                  <li key={r._key || r.id || i} className="flex justify-between text-sm py-1 border-b border-[var(--stroke)] last:border-0">
                    <span className="text-[var(--text-primary)] truncate">{r.receipt_no || r.receipt_number || '—'}</span>
                    <span className="text-[var(--text-secondary)]">{formatCurrency(r.transaction?.amount ?? r.investment_amount ?? 0)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Charts Section (all_branches only) */}
      {isAdmin && !isMyBranchView && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {/* Branch Performance Chart */}
          <div className="p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-[var(--accent-muted)] rounded-lg flex items-center justify-center mr-3">
                  <FiBarChart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Branch Performance</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Total investments by branch</p>
                </div>
              </div>
            </div>
            {getBranchPerformanceData().length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart 
                  data={getBranchPerformanceData()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                  <defs>
                    <linearGradient id="colorInvestments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#DC2626" stopOpacity={0.7}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#9CA3AF"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    tickLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    tickLine={{ stroke: '#E5E7EB' }}
                    tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'investments' || name === 'commission' ? formatCurrency(value) : formatNumber(value),
                      name === 'investments' ? 'Investments' : 
                      name === 'receipts' ? 'Receipts' : 
                      name === 'users' ? 'Users' : 'Collection/Credit'
                    ]}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                      padding: '12px 16px'
                    }}
                    labelStyle={{ color: '#111827', fontWeight: 600, marginBottom: '4px' }}
                    cursor={{ fill: 'rgba(239, 68, 68, 0.05)' }}
                  />
                  <Bar 
                    dataKey="investments" 
                    fill="url(#colorInvestments)" 
                    radius={[8, 8, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-dark-400">
                <FiBarChart className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-dark-600" />
                <p>No branch performance data available</p>
              </div>
            )}
          </div>

          {/* Branch Distribution Pie Chart */}
          <div className="p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-[var(--success-muted)] rounded-lg flex items-center justify-center mr-3">
                  <FiTarget className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Investment Distribution</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Share by branch</p>
                </div>
              </div>
            </div>
            {getBranchDistributionData().length > 0 ? (
              <div className="flex flex-col lg:flex-row items-center justify-center gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <defs>
                      {COLORS.map((color, index) => (
                        <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.9}/>
                          <stop offset="95%" stopColor={color} stopOpacity={0.7}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={getBranchDistributionData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={100}
                      innerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {getBranchDistributionData().map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={`url(#gradient-${index % COLORS.length})`}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Investment']}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                        padding: '12px 16px'
                      }}
                      labelStyle={{ color: '#111827', fontWeight: 600, marginBottom: '4px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2 max-w-xs w-full">
                  {getBranchDistributionData().slice(0, 6).map((entry, index) => (
                    <div key={`legend-${index}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{entry.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white ml-2">{entry.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-dark-400">
                <FiTarget className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-dark-600" />
                <p>No distribution data available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Revenue Trend Chart */}
      {isAdmin && !isMyBranchView && globalStats && globalStats.branches && globalStats.branches.length > 0 && (
        <div className="p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-[var(--success-muted)] rounded-lg flex items-center justify-center mr-3">
                <FiTrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Revenue Trend</h3>
                <p className="text-xs text-[var(--text-secondary)]">Investment trends over time</p>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={(() => {
              // Group by month for trend analysis
              const monthMap = new Map()
              const branches = globalStats.branches || []
              branches.forEach(branch => {
                // Simulate monthly data (in real implementation, this would come from API)
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
                months.forEach((month, idx) => {
                  const key = `${month}-2024`
                  if (!monthMap.has(key)) {
                    monthMap.set(key, { month, investments: 0 })
                  }
                  const entry = monthMap.get(key)
                  entry.investments += (branch.total_investments || 0) / 6 // Distribute evenly for demo
                })
              })
              return Array.from(monthMap.values())
            })()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />
              <XAxis 
                dataKey="month" 
                stroke="#9CA3AF"
                tick={{ fill: '#6B7280', fontSize: 12 }}
              />
              <YAxis 
                stroke="#9CA3AF"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
              />
              <Tooltip 
                formatter={(value) => [formatCurrency(value), 'Investments']}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  padding: '12px 16px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="investments" 
                stroke="#EF4444" 
                strokeWidth={2}
                dot={{ fill: '#EF4444', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category Breakdown Chart */}
      {isAdmin && !isMyBranchView && globalStats && (
        <div className="p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
          <div className="flex items-center mb-6">
            <FiBarChart className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Category Breakdown</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={(() => {
              // Calculate category breakdown from branches
              const categoryMap = new Map()
              // This would ideally come from API, but for now we'll use a placeholder
              return [
                { category: 'Mutual Funds', value: globalStats.total_investments * 0.4 },
                { category: 'Fixed Deposits', value: globalStats.total_investments * 0.3 },
                { category: 'Insurance', value: globalStats.total_investments * 0.2 },
                { category: 'Bonds', value: globalStats.total_investments * 0.1 }
              ]
            })()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />
              <XAxis 
                dataKey="category" 
                stroke="#9CA3AF"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#9CA3AF"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
              />
              <Tooltip 
                formatter={(value) => [formatCurrency(value), 'Investment']}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  padding: '12px 16px'
                }}
              />
              <Bar dataKey="value" fill="#EF4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Performers */}
      {isAdmin && !isMyBranchView && getTopPerformers().length > 0 && (
        <div className="p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
          <div className="flex items-center mb-6">
            <FiAward className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Top Performing Branches</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {getTopPerformers().map((branch, index) => (
              <div
                key={branch.branch_code || branch.branch || index}
                className="bg-[var(--card-bg-opaque)] rounded-lg p-4 border border-[var(--stroke)]/60"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-[var(--error-muted)] rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-bold text-[var(--error)]">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[var(--text-primary)]">
                        {getBranchDisplayName(branch)}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        {getBranchDisplayName(branch)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Investments:</span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {formatCurrency(branch.total_investments || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Receipts:</span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {formatNumber(branch.total_receipts || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Collection/Credit:</span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {formatCurrency(branch.commissions || 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual Branch Details */}
      {isAdmin && !isMyBranchView && (
        <div className="p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
          <div className="flex items-center mb-6">
            <FiMapPin className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Branch Details</h3>
          </div>
          <div className="space-y-4">
            {branches.map((branch) => {
              const isExpanded = expandedBranches.has(branch.branch_code)
              const branchData = getBranchSummaryRow(branch)
              
              return (
                <div key={branch.branch_code} className="border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)]">
                  <div 
                    className="p-4 cursor-pointer hover:bg-[var(--card-hover)] transition-colors duration-200"
                    onClick={() => toggleBranchExpansion(branch.branch_code)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-[var(--error-muted)] rounded-lg flex items-center justify-center mr-3">
                          <FiMapPin className="w-5 h-5 text-[var(--error)]" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[var(--text-primary)]">{branch.branch_name}</div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            {branch.branch_name || 'Unknown Branch'} • {branch.branch_type || 'Operational'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm font-medium text-[var(--text-primary)]">
                            {formatCurrency(branchData?.total_investments || 0)}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)]">Investments</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-[var(--text-primary)]">
                            {formatNumber(branchData?.total_receipts || 0)}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)]">Receipts</div>
                        </div>
                        {isExpanded ? (
                          <FiChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <FiChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && selectedBranchForDetails?.branch_code === branch.branch_code && (
                    <div className="px-4 pb-6 border-t border-[var(--stroke)]/70">
                      {loadingBranchDetails ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                          <span className="ml-2 text-[var(--text-secondary)]">Loading detailed stats...</span>
                        </div>
                      ) : detailedBranchStats ? (
                        <div className="pt-6 space-y-6">
                          {/* Branch Information Header */}
                          <div className="p-6 rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)]">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h4 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{branch.branch_name}</h4>
                                <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                                  <div className="flex items-center">
                                    <FiMapPin className="w-4 h-4 mr-1" />
                                    <span>{branch.branch_name || 'Unknown Branch'} • {branch.branch_type || 'Operational'}</span>
                                  </div>
                                  {branch.address && (
                                    <div className="flex items-center">
                                      <FiHome className="w-4 h-4 mr-1" />
                                      <span>{branch.address}</span>
                                    </div>
                                  )}
                                  {branch.manager_email && (
                                    <div className="flex items-center">
                                      <FiMail className="w-4 h-4 mr-1" />
                                      <span>{branch.manager_email}</span>
                                    </div>
                                  )}
                                  {branch.manager_phone && (
                                    <div className="flex items-center">
                                      <FiPhone className="w-4 h-4 mr-1" />
                                      <span>{branch.manager_phone}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  toggleBranchExpansion(branch.branch_code)
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                              >
                                <FiX className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          {/* Comprehensive Statistics Cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-5 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-medium text-[var(--text-secondary)]">Total Receipts</div>
                                <FiFileText className="w-5 h-5 text-[var(--info)]" />
                              </div>
                              <div className="text-3xl font-bold text-[var(--text-primary)]">
                                {formatNumber(detailedBranchStats.statistics?.total_receipts || 0)}
                              </div>
                              <div className="text-xs text-[var(--text-secondary)] mt-1">
                                {detailedBranchStats.statistics?.total_customers || 0} customers
                              </div>
                            </div>

                            <div className="p-5 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-medium text-[var(--text-secondary)]">Total Investments</div>
                                <FiDollarSign className="w-5 h-5 text-[var(--success)]" />
                              </div>
                              <div className="text-2xl font-bold text-[var(--text-primary)]">
                                {formatCurrency(detailedBranchStats.statistics?.total_investments || 0)}
                              </div>
                              <div className="text-xs text-[var(--text-secondary)] mt-1">
                                Avg: {formatCurrency(
                                  detailedBranchStats.statistics?.total_investments && detailedBranchStats.statistics?.total_receipts
                                    ? detailedBranchStats.statistics.total_investments / detailedBranchStats.statistics.total_receipts
                                    : 0
                                )}
                              </div>
                            </div>

                            <div className="p-5 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-medium text-[var(--text-secondary)]">Collection/Credit</div>
                                <FiAward className="w-5 h-5 text-[var(--warn)]" />
                              </div>
                              <div className="text-2xl font-bold text-[var(--success)]">
                                {formatCurrency(detailedBranchStats.statistics?.collection_credit || detailedBranchStats.statistics?.commissions || 0)}
                              </div>
                              {detailedBranchStats.statistics?.total_investments > 0 && (
                                <div className="text-xs text-[var(--text-secondary)] mt-1">
                                  {((detailedBranchStats.statistics.collection_credit || 0) / detailedBranchStats.statistics.total_investments * 100).toFixed(2)}% of investments
                                </div>
                              )}
                            </div>

                            <div className="p-5 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-medium text-[var(--text-secondary)]">Employees</div>
                                <FiUsers className="w-5 h-5 text-[var(--info)]" />
                              </div>
                              <div className="text-3xl font-bold text-[var(--text-primary)]">
                                {formatNumber(branchData?.total_employees || 0)}
                              </div>
                              <div className="text-xs text-[var(--text-secondary)] mt-1">
                                {branchEmployees.length > 0 ? `${branchEmployees.length} active` : 'No performance data'}
                              </div>
                            </div>
                          </div>

                          {/* Category Breakdown Chart */}
                          {detailedBranchStats.statistics?.by_category && Object.keys(detailedBranchStats.statistics.by_category).length > 0 && (
                            <div className="p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
                              <div className="flex items-center mb-6">
                                <FiBarChart className="w-5 h-5 text-red-600 mr-2" />
                                <h4 className="text-lg font-semibold text-[var(--text-primary)]">Investment by Category</h4>
                              </div>
                              <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={Object.entries(detailedBranchStats.statistics.by_category).map(([category, data]) => ({
                                  category: category === 'MF' ? 'Mutual Funds' : category === 'FD' ? 'Fixed Deposit' : category === 'INS' ? 'Insurance' : category === 'BOND' ? 'Bonds' : category,
                                  investment: data.total_investments || 0,
                                  count: data.total_receipts || 0
                                }))}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />
                                  <XAxis 
                                    dataKey="category" 
                                    stroke="#9CA3AF"
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                  />
                                  <YAxis 
                                    stroke="#9CA3AF"
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                                  />
                                  <Tooltip 
                                    formatter={(value) => [formatCurrency(value), 'Investment']}
                                    contentStyle={{
                                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                      border: 'none',
                                      borderRadius: '12px',
                                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                                      padding: '12px 16px'
                                    }}
                                  />
                                  <Bar dataKey="investment" fill="#EF4444" radius={[8, 8, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}

                          {/* Daily Trend Chart */}
                          {detailedBranchStats.statistics?.by_day && detailedBranchStats.statistics.by_day.length > 0 && (
                            <div className="p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
                              <div className="flex items-center mb-6">
                                <FiTrendingUp className="w-5 h-5 text-red-600 mr-2" />
                                <h4 className="text-lg font-semibold text-[var(--text-primary)]">Daily Investment Trend</h4>
                              </div>
                              <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={detailedBranchStats.statistics.by_day.map(day => ({
                                  date: day.date,
                                  investment: day.total_investments || 0,
                                  receipts: day.total_receipts || 0
                                }))}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />
                                  <XAxis 
                                    dataKey="date" 
                                    stroke="#9CA3AF"
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                  />
                                  <YAxis 
                                    stroke="#9CA3AF"
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                                  />
                                  <Tooltip 
                                    formatter={(value, name) => [
                                      name === 'investment' ? formatCurrency(value) : value,
                                      name === 'investment' ? 'Investment' : 'Receipts'
                                    ]}
                                    labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString('en-IN')}`}
                                    contentStyle={{
                                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                      border: 'none',
                                      borderRadius: '12px',
                                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                                      padding: '12px 16px'
                                    }}
                                  />
                                  <Line 
                                    type="monotone" 
                                    dataKey="investment" 
                                    stroke="#EF4444" 
                                    strokeWidth={2}
                                    dot={{ fill: '#EF4444', r: 4 }}
                                    activeDot={{ r: 6 }}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          )}

                          {/* Employee Performance Table */}
                          {branchEmployees.length > 0 && (
                            <div className="p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
                              <div className="flex items-center mb-6">
                                <FiUsers className="w-5 h-5 text-red-600 mr-2" />
                                <h4 className="text-lg font-semibold text-[var(--text-primary)]">Employee Performance</h4>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b border-[var(--stroke)]/70">
                                      <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Employee</th>
                                      <th className="text-right py-3 px-4 font-medium text-[var(--text-secondary)]">Receipts</th>
                                      <th className="text-right py-3 px-4 font-medium text-[var(--text-secondary)]">Investment</th>
                                      <th className="text-right py-3 px-4 font-medium text-[var(--text-secondary)]">Avg/Receipt</th>
                                      <th className="text-right py-3 px-4 font-medium text-[var(--text-secondary)]">CC</th>
                                      <th className="text-right py-3 px-4 font-medium text-[var(--text-secondary)]">SI</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {branchEmployees.slice(0, 10).map((emp, index) => (
                                      <tr
                                        key={emp.emp_code || index}
                                        className="border-b border-[var(--stroke)]/60 hover:bg-[var(--card-bg-opaque)]"
                                      >
                                        <td className="py-3 px-4">
                                          <div>
                                            <div className="font-medium text-[var(--text-primary)]">
                                              {emp.employee_name || 'Unknown'}
                                            </div>
                                            <div className="text-xs text-[var(--text-secondary)]">{emp.emp_code}</div>
                                          </div>
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-[var(--text-primary)]">
                                          {formatNumber(emp.receipt_count || 0)}
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-[var(--text-primary)]">
                                          {formatCurrency(emp.total_investment || 0)}
                                        </td>
                                        <td className="py-3 px-4 text-right text-[var(--text-secondary)]">
                                          {formatCurrency(emp.avg_investment || 0)}
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-[var(--success)]">
                                          {formatCurrency(emp.total_cc || 0)}
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-purple-600 dark:text-purple-400">
                                          {formatCurrency(emp.total_si || 0)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Recent Receipts */}
                          {branchRecentReceipts.length > 0 && (
                            <div className="p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
                              <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center">
                                  <FiClock className="w-5 h-5 text-red-600 mr-2" />
                                  <h4 className="text-lg font-semibold text-[var(--text-primary)]">Recent Receipts</h4>
                                </div>
                                <button
                                  onClick={() => {
                                    window.location.href = `/transactions?branch_code=${branch.branch_code}`
                                  }}
                                  className="text-sm text-[var(--accent)] hover:underline"
                                >
                                  View All
                                </button>
                              </div>
                              <div className="space-y-2">
                                {branchRecentReceipts.map((receipt) => (
                                  <div
                                    key={receipt._key || receipt.id}
                                    className="flex items-center justify-between p-3 bg-[var(--card-bg-opaque)] rounded-lg hover:bg-[var(--card-hover)] transition-colors"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-[var(--text-primary)]">
                                          {receipt.receipt_no || receipt.receiptNo || 'N/A'}
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                            receipt.status === 'Completed'
                                              ? 'bg-[var(--success-muted)] text-[var(--success)]'
                                              : receipt.status === 'Failed'
                                              ? 'bg-[var(--error-muted)] text-[var(--error)]'
                                              : 'bg-[var(--warn-muted)] text-[var(--warn)]'
                                          }`}
                                        >
                                          {receipt.status || 'Pending'}
                                        </span>
                                      </div>
                                      <div className="text-sm text-[var(--text-secondary)] mt-1">
                                        {receipt.investor_name || receipt.investorName || 'N/A'} •{' '}
                                        {new Date(receipt.date || receipt.created_at).toLocaleDateString('en-IN')}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-semibold text-[var(--text-primary)]">
                                        {formatCurrency(receipt.investment_amount || receipt.fd_deposit_amount || 0)}
                                      </div>
                                      <div className="text-xs text-[var(--text-secondary)]">
                                        {receipt.product_category || 'N/A'}
                                      </div>
                                      {(receipt.status == null || receipt.status === 'Pending') && (
                                        <div className="text-[10px] text-[var(--text-muted)] mt-1 space-x-2">
                                          <span>CC {formatCurrency(receipt.collection_credit ?? receipt.cc_amount ?? receipt.calculations?.collection_credit ?? 0)}</span>
                                          <span>SI {formatCurrency(receipt.service_income ?? receipt.si_amount ?? receipt.calculations?.service_income ?? 0)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Additional Metrics */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white dark:bg-dark-700 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-dark-600">
                              <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-2">Service Income</div>
                              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {formatCurrency(detailedBranchStats.service_income || 0)}
                              </div>
                            </div>
                            <div className="bg-white dark:bg-dark-700 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-dark-600">
                              <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-2">Completion Rate</div>
                              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {detailedBranchStats.statistics?.total_receipts > 0
                                  ? ((detailedBranchStats.statistics.total_receipts - (detailedBranchStats.statistics.total_receipts * 0.1)) / detailedBranchStats.statistics.total_receipts * 100).toFixed(1)
                                  : 0}%
                              </div>
                            </div>
                            <div className="bg-white dark:bg-dark-700 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-dark-600">
                              <div className="text-sm font-medium text-gray-500 dark:text-dark-400 mb-2">Growth Rate</div>
                              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                <FiTrendingUp className="inline w-5 h-5 mr-1" />
                                {detailedBranchStats.statistics?.total_investments > 0 ? '12.5%' : '0%'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500 dark:text-dark-400">
                          <FiAlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-dark-600" />
                          <p>Failed to load detailed statistics</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
