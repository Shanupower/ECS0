import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { useBranchWorkspace } from '../pages/branch-workspace/BranchWorkspaceContext'
import ChartCard, { EmptyState } from './branch-hub/ChartCard'
import KpiStat from './branch-hub/KpiStat'
import BranchRowList from './branch-hub/BranchRowList'
import { PALETTE, formatCompactINR, formatNumber, tooltipStyle } from './branch-hub/utils'
import DatePickerInput from './ui/DatePickerInput.jsx'
import { useEscapeClose } from '../hooks/useEscapeClose'
import {
  FiPlus,
  FiUsers,
  FiMapPin,
  FiSave,
  FiX,
  FiRefreshCw,
  FiAlertCircle,
  FiCheck,
  FiSearch,
  FiBarChart,
  FiActivity,
  FiTarget,
  FiArrowRight,
  FiExternalLink,
} from 'react-icons/fi'

export default function BranchManagement() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const {
    embedded,
    setPrimaryAction,
    refreshSignal,
    scope: wsScope,
    includePending: wsIncludePending,
  } = useBranchWorkspace()
  const [branches, setBranches] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [showUserAssignment, setShowUserAssignment] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [allBranches, setAllBranches] = useState([])
  const [selectedBranchForInsights, setSelectedBranchForInsights] = useState(null)
  const [branchInsightsData, setBranchInsightsData] = useState(null)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [insightsError, setInsightsError] = useState('')
  const [networkStats, setNetworkStats] = useState(null)
  const branchEditFormRef = useRef(null)

  const defaultYear = new Date().getFullYear()
  const [pulseFrom, setPulseFrom] = useState(`${defaultYear}-01-01`)
  const [pulseTo, setPulseTo] = useState(`${defaultYear}-12-31`)

  const isAdmin = user?.role === 'admin'

  useEscapeClose(showCreateForm, () => setShowCreateForm(false))
  useEscapeClose(!!editingBranch, () => setEditingBranch(null))
  useEscapeClose(showUserAssignment, () => setShowUserAssignment(false))
  useEscapeClose(!!selectedBranchForInsights, () => {
    setSelectedBranchForInsights(null)
    setBranchInsightsData(null)
    setInsightsError('')
  })

  const loadData = useCallback(async () => {
    if (!token) return

    setLoading(true)
    setError('')

    try {
      const [branchesData, usersData, pulse] = await Promise.all([
        api.listBranches(token, { includeInactive: '1' }),
        api.listUsers(token),
        api
          .getGlobalBranchStats(token, {
            includePending: (embedded ? wsIncludePending : true) ? '1' : '0',
            from: pulseFrom,
            to: pulseTo,
            date_basis: 'receipt',
            viewMode: 'all',
          })
          .catch(() => null),
      ])

      setBranches(branchesData)
      setAllBranches(branchesData)
      setUsers(usersData)
      setNetworkStats(pulse)
    } catch (err) {
      console.error('Data load error:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [token, pulseFrom, pulseTo, embedded, wsIncludePending])

  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin, loadData])

  useEffect(() => {
    if (!embedded || !refreshSignal) return
    loadData()
  }, [embedded, refreshSignal, loadData])

  useEffect(() => {
    if (!embedded) return undefined
    setPrimaryAction({
      label: 'Create branch',
      icon: FiPlus,
      onClick: () => {
        setEditingBranch(null)
        setShowCreateForm(true)
      },
    })
    return () => setPrimaryAction(null)
  }, [embedded, setPrimaryAction])

  useEffect(() => {
    if (!token || !selectedBranchForInsights?.branch_code) return

    let cancelled = false
    const loadInsights = async () => {
      setLoadingInsights(true)
      setInsightsError('')
      setBranchInsightsData(null)
      try {
        const data = await api.getBranchStats(token, selectedBranchForInsights.branch_code)
        if (cancelled) return
        setBranchInsightsData(data)
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load branch insights:', err)
        setInsightsError(err?.message || 'Failed to load performance insights')
      } finally {
        if (cancelled) return
        setLoadingInsights(false)
      }
    }

    loadInsights()
    return () => {
      cancelled = true
    }
  }, [token, selectedBranchForInsights?.branch_code])

  const handleCreateBranch = async (branchData) => {
    if (!token) return
    
    try {
      const newBranch = await api.createBranch(token, branchData)
      setBranches(prev => [...prev, newBranch.branch])
      setShowCreateForm(false)
      setSuccess('Branch created successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to create branch')
    }
  }

  const handleUpdateBranch = async (branchCode, updateData) => {
    if (!token) return
    
    try {
      const updatedBranch = await api.updateBranch(token, branchCode, updateData)
      setBranches(prev => prev.map(b => 
        b.branch_code === branchCode ? updatedBranch.branch : b
      ))
      setEditingBranch(null)
      setSuccess('Branch updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update branch')
    }
  }

  const handleDeleteBranch = async (branchCode) => {
    if (!token) return
    
    if (!confirm('Are you sure you want to delete this branch?')) return
    
    try {
      await api.deleteBranch(token, branchCode)
      setBranches(prev => prev.filter(b => b.branch_code !== branchCode))
      setSuccess('Branch deleted successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to delete branch')
    }
  }

  const handleAssignUsers = async (branchCode, userIds) => {
    if (!token) return
    
    try {
      await api.assignUsersToBranch(token, branchCode, userIds)
      setShowUserAssignment(false)
      setSuccess('Users assigned to branch successfully!')
      setTimeout(() => setSuccess(''), 3000)
      loadData() // Reload to get updated user assignments
    } catch (err) {
      setError(err.message || 'Failed to assign users to branch')
    }
  }

  // Filter branches based on search and filters
  const filteredBranches = useMemo(() => {
    let filtered = allBranches
    if (embedded && wsScope === 'my_branch') {
      const myCode = user?.branch_code || user?.branch
      if (myCode) {
        filtered = filtered.filter((b) => b.branch_code === myCode || b.branch === myCode)
      }
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(b => 
        b.branch_name?.toLowerCase().includes(term) ||
        b.branch_code?.toLowerCase().includes(term) ||
        b.address?.toLowerCase().includes(term)
      )
    }
    
    if (filterType) {
      filtered = filtered.filter(b => b.branch_type === filterType)
    }
    
    if (filterStatus) {
      filtered = filtered.filter(b => 
        filterStatus === 'active' ? b.is_active : !b.is_active
      )
    }
    
    return filtered
  }, [allBranches, searchTerm, filterType, filterStatus, embedded, wsScope, user])

  // When embedded and scoped to "my branch", narrow the roster to the admin's own branch.
  const scopedBranches = useMemo(() => {
    const list = allBranches || []
    if (!embedded || wsScope !== 'my_branch') return list
    const myCode = user?.branch_code || user?.branch
    if (!myCode) return list
    return list.filter((b) => b.branch_code === myCode || b.branch === myCode)
  }, [allBranches, embedded, wsScope, user])

  const orgPulse = useMemo(() => {
    const list = scopedBranches
    const typeMap = {}
    list.forEach((b) => {
      const raw = String(b.branch_type || 'operational').replace(/_/g, ' ')
      const label = raw.charAt(0).toUpperCase() + raw.slice(1)
      typeMap[label] = (typeMap[label] || 0) + 1
    })
    const typePie = Object.entries(typeMap).map(([name, value], i) => ({
      name,
      value,
      fill: PALETTE[i % PALETTE.length],
    }))

    let active = 0
    let inactive = 0
    list.forEach((b) => {
      if (b.is_active) active += 1
      else inactive += 1
    })
    const statusPie = []
    if (active) statusPie.push({ name: 'Active', value: active, fill: PALETTE[2] })
    if (inactive) statusPie.push({ name: 'Inactive', value: inactive, fill: PALETTE[4] })

    const assignedUsers = (users || []).filter((u) => u.branch_code).length

    return { typePie, statusPie, assignedUsers }
  }, [scopedBranches, users])

  const topBranchesInvest = useMemo(() => {
    const rows = networkStats?.branches
    if (!Array.isArray(rows) || !rows.length) return []
    return [...rows]
      .sort((a, b) => (b.total_investments || 0) - (a.total_investments || 0))
      .slice(0, 10)
      .map((r) => ({
        name: String(r.branch_name || r.branch || r.branch_code || 'Branch').slice(0, 18),
        investments: Number(r.total_investments) || 0,
        cc: Number(r.collection_credit ?? r.total_cc ?? 0) || 0,
      }))
  }, [networkStats])

  const rosterStats = useMemo(() => {
    const list = scopedBranches
    const total = list.length
    const active = list.filter((b) => b.is_active).length
    const codes = new Set(list.map((b) => b.branch_code).filter(Boolean))
    const assignedUsers = (users || []).filter((u) => u.branch_code && (codes.size === 0 || codes.has(u.branch_code))).length
    const avgUsersPerBranch = total > 0 ? assignedUsers / total : 0
    const coveragePct = total > 0 ? Math.round((active / total) * 100) : 0
    return {
      total,
      active,
      targetSum: list.reduce((s, b) => s + (Number(b.monthly_target) || 0), 0),
      assignedUsers,
      avgUsersPerBranch,
      coveragePct,
    }
  }, [scopedBranches, users])

  const pulseLabel = useMemo(() => `${pulseFrom} → ${pulseTo}`, [pulseFrom, pulseTo])

  const applyPulsePreset = (id) => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    if (id === 'year') {
      setPulseFrom(`${y}-01-01`)
      setPulseTo(`${y}-12-31`)
    } else if (id === 'ytd') {
      setPulseFrom(`${y}-01-01`)
      setPulseTo(`${y}-${m}-${d}`)
    } else if (id === 'mtd') {
      setPulseFrom(`${y}-${m}-01`)
      setPulseTo(`${y}-${m}-${d}`)
    } else if (id === 'qtd') {
      const q = Math.floor(now.getMonth() / 3)
      const startM = q * 3 + 1
      setPulseFrom(`${y}-${String(startM).padStart(2, '0')}-01`)
      setPulseTo(`${y}-${m}-${d}`)
    }
  }

  useEffect(() => {
    setBranches(filteredBranches)
  }, [filteredBranches])

  if (!isAdmin) {
    return (
      <div className={embedded ? '' : 'p-4 sm:p-6'}>
        <div className="inline-flex items-center px-4 py-3 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--error)]">
          <FiAlertCircle className="h-5 w-5 mr-2" />
          Access denied. This page is only available to administrators.
        </div>
      </div>
    )
  }

  return (
    <div className={embedded ? 'space-y-6' : 'p-4 sm:p-6 space-y-6'}>
      {/* Header */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">Branch Management</h1>
            <p className="text-[var(--text-secondary)] mt-1">Create and manage branches, assign users</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center px-4 py-2 border border-[var(--stroke)] rounded-lg bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <FiRefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => {
                setEditingBranch(null)
                setShowCreateForm(true)
              }}
              style={{ backgroundColor: 'var(--accent)', color: 'var(--text-primary)' }}
              className="flex items-center px-4 py-2 rounded-lg font-medium shadow-sm hover:brightness-110 focus:ring-2 focus:ring-[var(--ring)] focus:outline-none transition-colors duration-200"
            >
              <FiPlus className="w-4 h-4 mr-2" />
              Create Branch
            </button>
          </div>
        </div>
      )}

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {embedded && wsScope === 'my_branch' ? 'Branch administration' : 'Network command center'}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {embedded && wsScope === 'my_branch'
                ? 'Roster + org pulse scoped to your assigned branch.'
                : 'Live roster + org pulse across all branches. Revenue rollups live in the Analytics tab.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-2 w-full sm:w-auto">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-[var(--text-muted)] mr-1">Pulse range</span>
              <DatePickerInput
                value={pulseFrom.slice(0, 10)}
                onChange={(v) => setPulseFrom(v)}
                inputClassName="px-2 py-1.5 text-xs rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)]"
                ariaLabel="Pulse period from"
              />
              <span className="text-[var(--text-muted)]">–</span>
              <DatePickerInput
                value={pulseTo.slice(0, 10)}
                onChange={(v) => setPulseTo(v)}
                inputClassName="px-2 py-1.5 text-xs rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)]"
                ariaLabel="Pulse period to"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'mtd', label: 'MTD' },
                { id: 'qtd', label: 'QTD' },
                { id: 'ytd', label: 'YTD' },
                { id: 'year', label: 'Full year' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPulsePreset(p.id)}
                  className="px-2 py-1 text-[10px] rounded-md border border-[var(--stroke)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Link
              to="/branches?section=analytics&scope=all_branches"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)]"
            >
              <FiBarChart className="w-3.5 h-3.5" />
              Branch Dashboard
              <FiExternalLink className="w-3 h-3 opacity-70" />
            </Link>
          </div>
        </div>

        {/* Roster KPIs only — revenue metrics live in the Analytics tab to avoid duplication. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiStat
            title="Branches"
            value={rosterStats.total}
            format={(v) => formatNumber(v)}
            icon={FiMapPin}
            iconBg="bg-[var(--accent-muted)]"
            iconColor="text-[var(--accent)]"
            definition="Total branches in the roster for the current workspace scope."
          />
          <KpiStat
            title="Active"
            value={rosterStats.active}
            format={(v) => formatNumber(v)}
            icon={FiActivity}
            iconBg="bg-[var(--success-muted)]"
            iconColor="text-[var(--success)]"
            definition="Branches marked as active."
          />
          <KpiStat
            title="Avg users / branch"
            value={rosterStats.avgUsersPerBranch}
            format={(v) => Number(v || 0).toFixed(1)}
            icon={FiUsers}
            iconBg="bg-[var(--info-muted)]"
            iconColor="text-blue-600 dark:text-blue-400"
            definition={`Average assigned users across ${rosterStats.total || 0} branch${rosterStats.total === 1 ? '' : 'es'} (${rosterStats.assignedUsers} users total).`}
          />
          <KpiStat
            title="Coverage"
            value={rosterStats.coveragePct}
            format={(v) => `${Math.round(Number(v || 0))}%`}
            icon={FiTarget}
            iconBg="bg-[var(--warn-muted)]"
            iconColor="text-[var(--warn)]"
            definition="Share of branches currently active (active / total)."
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <ChartCard title="Top branches by investment" subtitle={pulseLabel} className="lg:col-span-2">
            {!networkStats || topBranchesInvest.length === 0 ? (
              <EmptyState message="No investment data for this period" hint="Create branches and record receipts to populate charts." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topBranchesInvest} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={56} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} tickFormatter={formatCompactINR} />
                  <RTooltip contentStyle={tooltipStyle} formatter={(v) => formatCompactINR(v)} />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-primary)' }} />
                  <Bar dataKey="investments" name="Investments" fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cc" name="Collection credit" fill={PALETTE[1]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Branch roster" subtitle="Active vs inactive">
            {orgPulse.statusPie.length === 0 ? (
              <EmptyState message="No branches" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={orgPulse.statusPie} dataKey="value" nameKey="name" innerRadius={52} outerRadius={88} paddingAngle={2}>
                    {orgPulse.statusPie.map((d, i) => (
                      <Cell key={`st-${i}`} fill={d.fill} />
                    ))}
                  </Pie>
                  <RTooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-primary)' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Branch types" subtitle="Configured in directory" className="lg:col-span-3">
            {orgPulse.typePie.length === 0 ? (
              <EmptyState message="No type data" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={orgPulse.typePie} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 11 }} width={100} />
                  <RTooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="Branches" radius={[0, 6, 6, 0]}>
                    {orgPulse.typePie.map((d, i) => (
                      <Cell key={d.name} fill={d.fill || PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg-opaque)] px-4 py-3 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">Shortcuts</span>
          <Link to="/branches?section=analytics&scope=all_branches" className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline">
            Branch Dashboard (all branches) <FiArrowRight className="w-3 h-3" />
          </Link>
          <span className="text-[var(--stroke)]">·</span>
          <span>Insights on each card still open the performance modal; full analytics use Branch Dashboard (all branches).</span>
        </div>
      </motion.section>

      {/* Success/Error Messages */}
      {success && (
        <div className="px-4 py-3 rounded-lg border border-[var(--success)]/70 bg-[var(--success-muted)] text-[var(--success)] flex items-center">
          <FiCheck className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-lg border border-[var(--error)]/70 bg-[var(--error-muted)] text-[var(--error)] flex items-center">
          <FiAlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Create Branch Modal */}
      {showCreateForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowCreateForm(false)}
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-branch-title"
          >
            <CreateBranchForm
              onSubmit={handleCreateBranch}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Branch Modal */}
      {editingBranch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEditingBranch(null)}
          role="presentation"
        >
          <div
            ref={branchEditFormRef}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-branch-title"
          >
            <EditBranchForm
              branch={editingBranch}
              onSubmit={(data) => handleUpdateBranch(editingBranch.branch_code, data)}
              onCancel={() => setEditingBranch(null)}
            />
          </div>
        </div>
      )}

      {/* User Assignment Modal */}
      {showUserAssignment && selectedBranch && (
        <UserAssignmentModal 
          branch={selectedBranch}
          users={users}
          onSubmit={(userIds) => handleAssignUsers(selectedBranch.branch_code, userIds)}
          onCancel={() => setShowUserAssignment(false)}
        />
      )}

      {/* Dense branch list with inline filters */}
      <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] overflow-hidden">
        <div className="flex flex-col gap-3 p-3 sm:p-4 border-b border-[var(--stroke)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] shrink-0">
              Branches
            </h3>
            <span className="text-xs text-[var(--text-muted)] tabular-nums shrink-0">
              {branches.length}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:flex-1 sm:justify-end">
            <div className="relative flex-1 sm:max-w-xs">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              <input
                type="text"
                placeholder="Search by code, name, or address"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-2.5 py-1.5 text-sm border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="">All types</option>
                <option value="operational">Operational</option>
                <option value="head_office">Head office</option>
                <option value="regional">Regional</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2.5 py-1.5 text-sm border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <BranchRowList
            branches={branches}
            users={users}
            loading={loading}
            onEdit={(branch) => {
              setShowCreateForm(false)
              setEditingBranch(branch)
            }}
            onAssignUsers={(branch) => {
              setSelectedBranch(branch)
              setShowUserAssignment(true)
            }}
            onToggleActive={(branch) => {
              handleUpdateBranch(branch.branch_code, { is_active: !branch.is_active })
            }}
          />
        </div>
      </div>


      {/* Branch Performance Insights Modal */}
      {selectedBranchForInsights && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedBranchForInsights(null)}
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="branch-insights-title"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 id="branch-insights-title" className="text-xl font-semibold text-[var(--text-primary)]">
                    Performance Insights: {selectedBranchForInsights.branch_name}
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] mt-1">{selectedBranchForInsights.branch_code}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBranchForInsights(null)
                    setBranchInsightsData(null)
                    setInsightsError('')
                  }}
                  className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]"
                  aria-label="Close"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {loadingInsights ? (
                <div className="flex items-center justify-center py-12 text-[var(--text-secondary)]">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                  <span className="ml-2">Loading insights…</span>
                </div>
              ) : insightsError ? (
                <div className="flex items-start gap-2 rounded-lg border border-[var(--error)]/50 bg-[var(--error-muted)] px-4 py-3 text-[var(--error)]">
                  <FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium">Performance Insights failed to load</div>
                    <div className="mt-0.5">{insightsError}</div>
                  </div>
                </div>
              ) : branchInsightsData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] p-4">
                      <div className="mb-1 text-sm text-[var(--text-muted)]">Total Receipts</div>
                      <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                        {branchInsightsData.statistics?.total_receipts || 0}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] p-4">
                      <div className="mb-1 text-sm text-[var(--text-muted)]">Total Investments</div>
                      <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
                          branchInsightsData.statistics?.total_investments || 0
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] p-4">
                      <div className="mb-1 text-sm text-[var(--text-muted)]">Collection credit</div>
                      <div className="text-2xl font-bold text-[var(--success)] tabular-nums">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
                          branchInsightsData.statistics?.collection_credit || branchInsightsData.statistics?.commissions || 0
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBranchForInsights(null)
                        setBranchInsightsData(null)
                        navigate({ pathname: '/branches', search: '?section=analytics&scope=all_branches' })
                      }}
                      className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                    >
                      Open Branch Dashboard
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-[var(--text-muted)]">
                  <FiBarChart className="mx-auto mb-3 h-12 w-12 opacity-40" />
                  <p>No performance data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Create Branch Form Component
function CreateBranchForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    branch_code: '',
    branch_name: '',
    branch_type: 'operational',
    address: '',
    phone: '',
    email: '',
    monthly_target: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = { ...formData }
    if (payload.monthly_target === '' || payload.monthly_target == null) {
      payload.monthly_target = null
    } else {
      payload.monthly_target = Number(payload.monthly_target)
    }
    onSubmit(payload)
  }

  return (
    <div className="p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
      <h3 id="create-branch-title" className="text-lg font-semibold text-[var(--text-primary)] mb-4">Create New Branch</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Branch Code *</label>
            <input
              type="text"
              value={formData.branch_code}
              onChange={(e) => setFormData(prev => ({ ...prev, branch_code: e.target.value.toUpperCase() }))}
              className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="e.g., MEDAK"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Branch Name *</label>
            <input
              type="text"
              value={formData.branch_name}
              onChange={(e) => setFormData(prev => ({ ...prev, branch_name: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="e.g., Medak Branch"
              required
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Branch Type</label>
          <select
            value={formData.branch_type}
            onChange={(e) => setFormData(prev => ({ ...prev, branch_type: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
          >
            <option value="operational">Operational</option>
            <option value="head_office">Head Office</option>
            <option value="regional">Regional</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Monthly target (₹)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={formData.monthly_target}
            onChange={(e) => setFormData(prev => ({ ...prev, monthly_target: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
            placeholder="Optional — branch CC target for dashboard"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Address</label>
          <textarea
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
            rows="3"
            placeholder="Branch address"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="Phone number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="Email address"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-primary)' }}
            className="px-4 py-2 rounded-lg font-medium shadow-sm hover:brightness-110 focus:ring-2 focus:ring-[var(--ring)] focus:outline-none transition-colors duration-200"
          >
            Create Branch
          </button>
        </div>
      </form>
    </div>
  )
}

// Edit Branch Form Component
function normalizeBranchType(value) {
  const v = String(value ?? '').trim().toLowerCase()
  if (!v) return 'operational'
  if (v === 'ho' || v === 'head office' || v === 'head_office' || v === 'headoffice') return 'head_office'
  if (v === 'regional' || v === 'region') return 'regional'
  if (v === 'operational' || v === 'operation' || v === 'branch') return 'operational'
  return 'operational'
}

function buildEditFormData(branch) {
  return {
    branch_name: branch?.branch_name || '',
    branch_type: normalizeBranchType(branch?.branch_type),
    address: branch?.address || '',
    phone: branch?.phone || '',
    email: branch?.email || '',
    monthly_target: branch?.monthly_target != null ? String(branch.monthly_target) : ''
  }
}

function EditBranchForm({ branch, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(() => buildEditFormData(branch))

  // Re-initialise the form whenever a different branch row is opened. Without
  // this, switching from one Edit row to another keeps the previous branch's
  // values in the inputs.
  useEffect(() => {
    setFormData(buildEditFormData(branch))
  }, [branch])

  const handleSubmit = (e) => {
    e.preventDefault()
    const updateData = { ...formData }
    if (updateData.monthly_target === '' || updateData.monthly_target == null) {
      updateData.monthly_target = null
    } else {
      updateData.monthly_target = Number(updateData.monthly_target)
    }
    onSubmit(updateData)
  }

  return (
    <div className="p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--stroke)] bg-[var(--card-bg)]">
      <h3 id="edit-branch-title" className="text-lg font-semibold text-[var(--text-primary)] mb-4">Edit Branch: {branch.branch_code}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Branch Name *</label>
          <input
            type="text"
            value={formData.branch_name}
            onChange={(e) => setFormData(prev => ({ ...prev, branch_name: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Branch Type</label>
          <select
            value={formData.branch_type}
            onChange={(e) => setFormData(prev => ({ ...prev, branch_type: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
          >
            <option value="operational">Operational</option>
            <option value="head_office">Head Office</option>
            <option value="regional">Regional</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Monthly target (₹)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={formData.monthly_target}
            onChange={(e) => setFormData(prev => ({ ...prev, monthly_target: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Address</label>
          <textarea
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
            rows="3"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-primary)' }}
            className="px-4 py-2 rounded-lg font-medium shadow-sm hover:brightness-110 focus:ring-2 focus:ring-[var(--ring)] focus:outline-none transition-colors duration-200"
          >
            Update Branch
          </button>
        </div>
      </form>
    </div>
  )
}

// User Assignment Modal Component
function UserAssignmentModal({ branch, users, onSubmit, onCancel }) {
  const [selectedUserIds, setSelectedUserIds] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEscapeClose(true, onCancel)

  useEffect(() => {
    // Pre-select users already assigned to this branch
    const assignedUserIds = users
      .filter(u => u.branch_code === branch.branch_code)
      .map(u => u._key || u.id)
    setSelectedUserIds(assignedUserIds)
  }, [branch, users])

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchesSearch = 
          user.name?.toLowerCase().includes(term) ||
          user.email?.toLowerCase().includes(term) ||
          user.emp_code?.toLowerCase().includes(term)
        if (!matchesSearch) return false
      }
      
      if (filterRole && user.role !== filterRole) return false
      
      if (filterStatus === 'active' && !user.is_active) return false
      if (filterStatus === 'inactive' && user.is_active) return false
      
      return true
    })
  }, [users, searchTerm, filterRole, filterStatus])

  const handleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([])
    } else {
      setSelectedUserIds(filteredUsers.map(u => u._key || u.id))
    }
  }

  const handleUserToggle = (userId) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(selectedUserIds)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--card-bg)] border border-[var(--stroke)] rounded-xl shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Assign Users to {branch.branch_name}
            </h3>
              <button
              onClick={onCancel}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Search and Filter Bar */}
          <div className="mb-4 space-y-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-4 w-4 text-[var(--text-muted)]" />
              </div>
              <input
                type="text"
                placeholder="Search users by name, email, or employee code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="flex-1 px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--ring)] text-sm focus:outline-none"
              >
                <option value="">All Roles</option>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--ring)] text-sm focus:outline-none"
              >
                <option value="">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-2 border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)] transition-colors text-sm"
              >
                {selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="max-h-96 overflow-y-auto mb-4">
              <div className="space-y-2">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-dark-400">
                    <FiUsers className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-dark-600" />
                    <p>No users found matching your filters</p>
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const userId = user._key || user.id
                    const isSelected = selectedUserIds.includes(userId)
                    const isAssigned = user.branch_code === branch.branch_code
                    
                    return (
                      <label key={userId} className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800'
                          : 'hover:bg-gray-50 dark:hover:bg-dark-700 border border-gray-200 dark:border-dark-600'
                      }`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleUserToggle(userId)}
                          className="mr-3 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name || user.email}</div>
                          <div className="text-xs text-gray-500 dark:text-dark-400">
                            {user.email} • {user.emp_code || 'N/A'} • {user.role}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAssigned && (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-medium rounded">
                              Assigned
                            </span>
                          )}
                          {!user.is_active && (
                            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 text-xs font-medium rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                      </label>
                    )
                  })
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-600 dark:text-dark-400 hover:text-gray-800 dark:hover:text-dark-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800 transition-colors duration-200"
              >
                Assign {selectedUserIds.length} Users
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
