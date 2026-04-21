import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { FiBarChart2, FiBriefcase, FiShield } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { BranchWorkspaceContext } from './branch-workspace/BranchWorkspaceContext'
import WorkspaceHeader from './branch-workspace/WorkspaceHeader'
import SectionTabs from './branch-workspace/SectionTabs'
import SectionSkeleton from './branch-workspace/SectionSkeleton'

const BranchAnalyticsSection = lazy(() => import('./branch-workspace/BranchAnalyticsSection'))
const BranchOperationsSection = lazy(() => import('./branch-workspace/BranchOperationsSection'))
const BranchAdminSection = lazy(() => import('./branch-workspace/BranchAdminSection'))

const SECTION_KEYS = ['analytics', 'operations', 'admin']

export default function BranchWorkspace() {
  const { token, user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const isAdmin = user?.role === 'admin'
  const isManager = user?.role === 'manager'
  const prefersReducedMotion = useReducedMotion()

  const canSwitchScope = isAdmin
  const scope = useMemo(() => {
    if (!canSwitchScope) return 'my_branch'
    return searchParams.get('scope') === 'all_branches' ? 'all_branches' : 'my_branch'
  }, [canSwitchScope, searchParams])

  // Administration is network-level; don't show it when we're scoped to a single branch.
  const adminTabVisible = isAdmin && scope === 'all_branches'

  const effectiveSection = useMemo(() => {
    const raw = searchParams.get('section')
    if (raw === 'admin' && !adminTabVisible) return isManager ? 'operations' : 'analytics'
    if (SECTION_KEYS.includes(raw)) return raw
    return isManager ? 'operations' : 'analytics'
  }, [searchParams, adminTabVisible, isManager])

  useEffect(() => {
    if (!user) return
    const urlSection = searchParams.get('section')
    const needsFix =
      !urlSection ||
      !SECTION_KEYS.includes(urlSection) ||
      (urlSection === 'admin' && !adminTabVisible)
    if (!needsFix) return
    const next = new URLSearchParams(searchParams)
    next.set('section', effectiveSection)
    setSearchParams(next, { replace: true })
  }, [user, searchParams, setSearchParams, effectiveSection, adminTabVisible])

  const setSection = useCallback(
    (sec) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('section', sec)
          return next
        },
        { replace: false }
      )
    },
    [setSearchParams]
  )

  const [primaryAction, setPrimaryAction] = useState(null)
  const [refreshSignal, setRefreshSignal] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const setScope = useCallback(
    (next) => {
      if (!canSwitchScope) return
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          if (next === 'all_branches') p.set('scope', 'all_branches')
          else p.delete('scope')
          return p
        },
        { replace: true }
      )
    },
    [canSwitchScope, setSearchParams]
  )

  // Include Pending (+ null-status) — global toggle respected by every section.
  const includePending = useMemo(() => {
    const raw = searchParams.get('pending')
    if (raw === '0') return false
    return true
  }, [searchParams])

  const setIncludePending = useCallback(
    (next) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          if (next) p.delete('pending')
          else p.set('pending', '0')
          return p
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  // Admin branch picker — focused branch_code when scope=my_branch.
  const [branchOptions, setBranchOptions] = useState([])
  useEffect(() => {
    let cancelled = false
    if (!token || !isAdmin) {
      setBranchOptions([])
      return
    }
    api
      .listBranches(token, { includeInactive: '0' })
      .then((rows) => {
        if (cancelled) return
        const list = Array.isArray(rows) ? rows : Array.isArray(rows?.branches) ? rows.branches : []
        setBranchOptions(
          list
            .filter((b) => b && (b.branch_code || b.branch))
            .map((b) => ({
              code: String(b.branch_code || b.branch),
              name: String(b.branch_name || b.branch_code || b.branch),
              is_active: b.is_active !== false,
            }))
        )
      })
      .catch(() => {
        if (!cancelled) setBranchOptions([])
      })
    return () => {
      cancelled = true
    }
  }, [token, isAdmin])

  const defaultBranchCode = useMemo(() => {
    const mine = user?.branch_code || user?.branch
    if (mine && branchOptions.some((b) => b.code === String(mine))) return String(mine)
    return branchOptions[0]?.code || null
  }, [user?.branch_code, user?.branch, branchOptions])

  const urlBranch = searchParams.get('branch') || null
  const focusedBranchCode = useMemo(() => {
    if (!isAdmin) return user?.branch_code || user?.branch || null
    if (scope !== 'my_branch') return null
    if (urlBranch && branchOptions.some((b) => b.code === urlBranch)) return urlBranch
    return defaultBranchCode
  }, [isAdmin, scope, urlBranch, branchOptions, defaultBranchCode, user?.branch_code, user?.branch])

  // Keep URL in sync with the resolved focused branch so deep-links always match state.
  useEffect(() => {
    if (!isAdmin || scope !== 'my_branch') return
    if (!focusedBranchCode) return
    if (urlBranch === focusedBranchCode) return
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.set('branch', focusedBranchCode)
        return p
      },
      { replace: true }
    )
  }, [isAdmin, scope, focusedBranchCode, urlBranch, setSearchParams])

  // Clear the branch param when scope leaves my_branch (keeps URLs tidy).
  useEffect(() => {
    if (scope === 'my_branch') return
    if (!urlBranch) return
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.delete('branch')
        return p
      },
      { replace: true }
    )
  }, [scope, urlBranch, setSearchParams])

  const setFocusedBranchCode = useCallback(
    (next) => {
      if (!isAdmin) return
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          if (next) p.set('branch', next)
          else p.delete('branch')
          return p
        },
        { replace: false }
      )
    },
    [isAdmin, setSearchParams]
  )

  // Clear any section-specific primary action when the active section changes.
  useEffect(() => {
    setPrimaryAction(null)
  }, [effectiveSection])

  const bumpRefresh = useCallback(() => {
    setRefreshing(true)
    setRefreshSignal((n) => n + 1)
    // Brief visual spin; sections handle real loading themselves.
    const t = setTimeout(() => setRefreshing(false), 650)
    return () => clearTimeout(t)
  }, [])

  const tabs = useMemo(
    () => [
      {
        id: 'analytics',
        label: 'Analytics',
        description: 'KPIs, trends, and network view',
        icon: FiBarChart2,
      },
      {
        id: 'operations',
        label: 'Operations',
        description: 'Daily ops, tasks, customers',
        icon: FiBriefcase,
      },
      ...(adminTabVisible
        ? [
            {
              id: 'admin',
              label: 'Administration',
              description: 'Create, edit, assign branches',
              icon: FiShield,
            },
          ]
        : []),
    ],
    [adminTabVisible]
  )

  const userLabel = useMemo(() => {
    if (isAdmin) return 'Admin view'
    if (isManager) return user?.branch ? `Manager · ${user.branch}` : 'Manager view'
    return null
  }, [isAdmin, isManager, user?.branch])

  const ctxValue = useMemo(
    () => ({
      embedded: true,
      section: effectiveSection,
      setPrimaryAction,
      refreshSignal,
      scope,
      setScope,
      canSwitchScope,
      includePending,
      setIncludePending,
      focusedBranchCode,
      setFocusedBranchCode,
    }),
    [
      effectiveSection,
      refreshSignal,
      scope,
      setScope,
      canSwitchScope,
      includePending,
      setIncludePending,
      focusedBranchCode,
      setFocusedBranchCode,
    ]
  )

  const motionProps = prefersReducedMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 4 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -2 },
        transition: { duration: 0.18, ease: 'easeOut' },
      }

  return (
    <BranchWorkspaceContext.Provider value={ctxValue}>
      <div className="space-y-4">
        <WorkspaceHeader
          section={effectiveSection}
          primaryAction={primaryAction}
          onRefresh={bumpRefresh}
          refreshing={refreshing}
          userLabel={userLabel}
          scope={scope}
          onScopeChange={setScope}
          canSwitchScope={canSwitchScope}
          includePending={includePending}
          onIncludePendingChange={setIncludePending}
          showBranchPicker={canSwitchScope && scope === 'my_branch'}
          branchOptions={branchOptions}
          focusedBranchCode={focusedBranchCode}
          onFocusedBranchChange={setFocusedBranchCode}
        />

        <SectionTabs tabs={tabs} value={effectiveSection} onChange={setSection} />

        <div
          id={`ws-panel-${effectiveSection}`}
          role="tabpanel"
          aria-labelledby={`ws-tab-${effectiveSection}`}
          className="pt-1"
        >
          <Suspense fallback={<SectionSkeleton section={effectiveSection} />}>
            <AnimatePresence mode="wait">
              <motion.div key={effectiveSection} {...motionProps}>
                {effectiveSection === 'analytics' && <BranchAnalyticsSection />}
                {effectiveSection === 'operations' && <BranchOperationsSection />}
                {effectiveSection === 'admin' && adminTabVisible && <BranchAdminSection />}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </div>
      </div>
    </BranchWorkspaceContext.Provider>
  )
}
