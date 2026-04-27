import React from 'react'
import { FiChevronRight, FiGrid, FiRefreshCw } from 'react-icons/fi'
import { SegmentedControl, Switch } from '../../components/ui'
import BranchPicker from './BranchPicker'

const SECTION_META = {
  analytics: {
    label: 'Analytics',
    subtitle: 'KPIs, trends, and network performance across branches.',
  },
  operations: {
    label: 'Operations',
    subtitle: 'Run your branch day-to-day — tasks, receipts, customers, and targets.',
  },
  admin: {
    label: 'Administration',
    subtitle: 'Create, edit, and assign branches; manage the network roster.',
  },
}

export default function WorkspaceHeader({
  section,
  primaryAction,
  onRefresh,
  refreshing = false,
  userLabel,
  scope = 'my_branch',
  onScopeChange,
  canSwitchScope = false,
  includePending = true,
  onIncludePendingChange,
  showBranchPicker = false,
  branchOptions = [],
  focusedBranchCode = null,
  onFocusedBranchChange,
}) {
  const meta = SECTION_META[section] || SECTION_META.analytics
  const Icon = primaryAction?.icon

  return (
    <header className="pb-4 border-b border-[var(--stroke)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-11 h-11 rounded-xl bg-[var(--accent-muted)] flex items-center justify-center shrink-0 ring-1 ring-[var(--accent)]/15"
            aria-hidden
          >
            <FiGrid className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div className="min-w-0">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] mb-0.5"
            >
              <span>Branches</span>
              <FiChevronRight className="w-3 h-3 opacity-70" aria-hidden />
              <span className="text-[var(--text-secondary)] font-medium">{meta.label}</span>
            </nav>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--text-primary)] truncate">
              Branch workspace
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">
              {meta.subtitle}
              {userLabel ? (
                <span className="text-[var(--text-muted)]"> · {userLabel}</span>
              ) : null}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canSwitchScope ? (
            <SegmentedControl
              options={[
                { value: 'my_branch', label: 'My branch' },
                { value: 'all_branches', label: 'All branches' },
              ]}
              value={scope}
              onChange={onScopeChange}
              className="shrink-0"
            />
          ) : null}

          {showBranchPicker ? (
            <BranchPicker
              options={branchOptions}
              value={focusedBranchCode}
              onChange={onFocusedBranchChange}
            />
          ) : null}

          <label
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] select-none"
            title="Include receipts with Pending or unset status in all totals"
          >
            <span className="text-xs">Include pending</span>
            <Switch
              checked={!!includePending}
              onChange={(v) => onIncludePendingChange?.(v)}
            />
          </label>

          {primaryAction ? (
            <button
              type="button"
              onClick={primaryAction.onClick}
              style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] shadow-sm transition"
            >
              {Icon ? <Icon className="w-4 h-4" aria-hidden /> : null}
              {primaryAction.label}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50 transition-colors"
            aria-label="Refresh workspace"
          >
            <FiRefreshCw
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              aria-hidden
            />
            Refresh
          </button>
        </div>
      </div>
    </header>
  )
}
