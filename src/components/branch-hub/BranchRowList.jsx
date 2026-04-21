import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiBarChart2,
  FiEdit,
  FiUsers,
  FiPower,
  FiMapPin,
  FiArrowRight,
} from 'react-icons/fi'

const ACCENT_COLORS = [
  'var(--accent)',
  'var(--info)',
  'var(--success)',
  'var(--warn)',
  'var(--error)',
]

function accentFor(code) {
  if (!code) return ACCENT_COLORS[0]
  let h = 0
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0
  return ACCENT_COLORS[h % ACCENT_COLORS.length]
}

function initialsOf(code, name) {
  const src = String(code || name || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  if (!src) return 'B'
  if (src.length <= 3) return src
  return src.slice(0, 3)
}

function TypeChip({ type }) {
  const raw = String(type || 'operational').replace(/_/g, ' ')
  const label = raw.charAt(0).toUpperCase() + raw.slice(1)
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-[var(--card-hover)] text-[var(--text-secondary)] border border-[var(--stroke)]">
      {label}
    </span>
  )
}

function StatusPill({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${
        active
          ? 'bg-[var(--success-muted)] text-[var(--success)]'
          : 'bg-[var(--error-muted)] text-[var(--error)]'
      }`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: active ? 'var(--success)' : 'var(--error)' }}
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function UsersPill({ count }) {
  return (
    <span
      title={`${count} assigned user${count === 1 ? '' : 's'}`}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-[var(--accent-muted)] text-[var(--accent)] min-w-[48px] justify-center"
    >
      <FiUsers className="w-3 h-3" aria-hidden />
      {count}
    </span>
  )
}

function TargetBar({ target, className = '' }) {
  const t = Number(target) || 0
  if (!t) {
    return (
      <div className={`flex flex-col ${className}`}>
        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Monthly target</span>
        <span className="text-xs text-[var(--text-muted)] mt-0.5">Not set</span>
      </div>
    )
  }
  const inr = `₹${t.toLocaleString('en-IN')}`
  return (
    <div className={`flex flex-col ${className}`} title={`Monthly target ${inr}`}>
      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Monthly target</span>
      <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums mt-0.5">{inr}</span>
    </div>
  )
}

export default function BranchRowList({
  branches = [],
  users = [],
  loading = false,
  onViewAnalytics,
  onEdit,
  onAssignUsers,
  onToggleActive,
}) {
  const navigate = useNavigate()

  const usersByBranch = useMemo(() => {
    const map = new Map()
    for (const u of users || []) {
      const code = u.branch_code
      if (!code) continue
      map.set(code, (map.get(code) || 0) + 1)
    }
    return map
  }, [users])

  const defaultViewAnalytics = (branch) => {
    const params = new URLSearchParams({
      section: 'analytics',
      scope: 'my_branch',
      branch: branch.branch_code,
    })
    navigate(`/branches?${params.toString()}`)
  }

  const handleRowClick = (branch) => (e) => {
    if (e.target.closest('[data-row-action]')) return
    ;(onViewAnalytics || defaultViewAnalytics)(branch)
  }

  if (loading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (!branches.length) {
    return (
      <div className="text-center py-12 text-[var(--text-muted)] border border-dashed border-[var(--stroke)] rounded-xl">
        <FiMapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No branches match your filters.</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-[var(--stroke)]/70 rounded-xl border border-[var(--stroke)] overflow-hidden bg-[var(--card-bg)]">
      {branches.map((branch) => {
        const code = branch.branch_code
        const name = branch.branch_name || code
        const active = !!branch.is_active
        const accent = accentFor(code)
        const userCount = usersByBranch.get(code) || 0
        const initials = initialsOf(code, name)

        return (
          <li
            key={code}
            role="button"
            tabIndex={0}
            onClick={handleRowClick(branch)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                ;(onViewAnalytics || defaultViewAnalytics)(branch)
              }
            }}
            className="group grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-4 py-3 hover:bg-[var(--card-hover)] focus-visible:bg-[var(--card-hover)] focus-visible:outline-none cursor-pointer transition-colors"
          >
            {/* Avatar tile with accent dot */}
            <div className="relative">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-semibold tracking-wide text-white shadow-sm"
                style={{ background: accent }}
                aria-hidden
              >
                {initials}
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-[var(--card-bg)]"
                style={{ background: active ? 'var(--success)' : 'var(--error)' }}
                title={active ? 'Active' : 'Inactive'}
              />
            </div>

            {/* Code + name + chips */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-[11px] text-[var(--text-muted)] shrink-0">
                  {code}
                </span>
                <span className="truncate font-medium text-[var(--text-primary)]">{name}</span>
                <FiArrowRight
                  className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  aria-hidden
                />
              </div>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <TypeChip type={branch.branch_type} />
                <StatusPill active={active} />
                {branch.address ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)] truncate max-w-[24ch]">
                    <FiMapPin className="w-3 h-3" aria-hidden />
                    {branch.address}
                  </span>
                ) : null}
              </div>
            </div>

            {/* User count */}
            <UsersPill count={userCount} />

            {/* Monthly target */}
            <TargetBar target={branch.monthly_target} className="min-w-[130px]" />

            {/* Hover actions */}
            <div
              className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
              data-row-action
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  ;(onViewAnalytics || defaultViewAnalytics)(branch)
                }}
                className="p-1.5 rounded-md text-[var(--info)] hover:bg-[var(--info-muted)]/40"
                title="View analytics"
                aria-label={`View analytics for ${name}`}
              >
                <FiBarChart2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit?.(branch)
                }}
                className="p-1.5 rounded-md text-[var(--warn)] hover:bg-[var(--warn-muted)]/40"
                title="Edit branch"
                aria-label={`Edit ${name}`}
              >
                <FiEdit className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onAssignUsers?.(branch)
                }}
                className="p-1.5 rounded-md text-[var(--accent)] hover:bg-[var(--accent-muted)]/40"
                title="Assign users"
                aria-label={`Assign users to ${name}`}
              >
                <FiUsers className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleActive?.(branch)
                }}
                className={`p-1.5 rounded-md ${
                  active
                    ? 'text-[var(--error)] hover:bg-[var(--error-muted)]/40'
                    : 'text-[var(--success)] hover:bg-[var(--success-muted)]/40'
                }`}
                title={active ? 'Deactivate branch' : 'Activate branch'}
                aria-label={active ? `Deactivate ${name}` : `Activate ${name}`}
              >
                <FiPower className="w-4 h-4" />
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
