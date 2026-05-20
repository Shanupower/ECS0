import React from 'react'
import { Link } from 'react-router-dom'
import {
  FiAlertTriangle,
  FiAward,
  FiCheckSquare,
  FiList,
  FiPieChart,
  FiTarget,
  FiTrendingUp,
  FiUser
} from 'react-icons/fi'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '../../../components/ui'
import CompactStatValue from '../../../components/ui/CompactStatValue.jsx'
import { formatRelativeDate } from '../dashboard-format.js'
import DashboardSnapshotListCard from './DashboardSnapshotListCard.jsx'

const ISSUE_PRIORITY_CLASS = {
  low: 'bg-[var(--card-hover)] text-[var(--text-muted)]',
  medium: 'bg-[var(--accent-muted)] text-[var(--accent)]',
  high: 'bg-[var(--warn-muted)] text-[var(--warn)]',
  urgent: 'bg-red-500/15 text-red-400'
}

const LEAD_STAGE_CLASS = {
  New: 'bg-[var(--accent-muted)] text-[var(--accent)]',
  Contacted: 'bg-[var(--warn-muted)] text-[var(--warn)]',
  Qualified: 'bg-emerald-500/15 text-emerald-400',
  Won: 'bg-[var(--success-muted)] text-[var(--success)]',
  Lost: 'bg-[var(--card-hover)] text-[var(--text-muted)]'
}

function WidgetIcon({ children, className = 'bg-[var(--accent-muted)]' }) {
  return (
    <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${className}`}>
      {children}
    </div>
  )
}

function PriorityPill({ priority }) {
  const p = (priority || 'medium').toLowerCase()
  return (
    <span
      className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${ISSUE_PRIORITY_CLASS[p] || ISSUE_PRIORITY_CLASS.medium}`}
    >
      {p}
    </span>
  )
}

function StagePill({ stage }) {
  const label = stage || '—'
  return (
    <span
      className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${LEAD_STAGE_CLASS[label] || LEAD_STAGE_CLASS.New}`}
    >
      {label}
    </span>
  )
}

export function PendingApprovalsWidget({ approvalsCount }) {
  return (
    <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <WidgetIcon>
            <FiCheckSquare className="h-4 w-4 text-[var(--accent)]" />
          </WidgetIcon>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">My pending approvals</h3>
        </div>
        <Link to="/approvals" className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]">
          View queue
        </Link>
      </div>
      <p className="text-2xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">{approvalsCount}</p>
      <p className="text-[11px] text-[var(--text-muted)] mt-1">
        Receipt approvals on your teams waiting for action.
      </p>
    </Card>
  )
}

export function TargetVsActualWidget({
  summary,
  viewMode,
  periodTargetNum,
  targetProgressPct,
  targetActualCcLabel,
  targetActualCc,
  targetBasisHint,
  hasTarget,
  targetLoading,
  formatCurrency
}) {
  const pctLabel =
    targetLoading
      ? '…'
      : targetProgressPct != null
        ? `${Math.round(targetProgressPct)}%`
        : '—'
  const targetDisplay = targetLoading
    ? 'Loading…'
    : hasTarget
      ? formatCurrency(periodTargetNum)
      : 'Not set'

  return (
    <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget h-full">
      <div className="flex items-center gap-2 mb-2">
        <FiTarget className="w-5 h-5 text-[var(--accent)]" />
        <h3 className="text-title font-semibold text-[var(--text)]">Target vs actual</h3>
        <span className="ml-auto text-xs font-medium text-[var(--accent)] tabular-nums">{pctLabel}</span>
      </div>
      <div>
        <div className="flex justify-between text-small mb-1 gap-3">
          <span className="text-[var(--text-muted)] min-w-0">
            Target for selected period
            {targetBasisHint ? (
              <span className="block text-[10px] text-[var(--text-muted)]/90 mt-0.5">{targetBasisHint}</span>
            ) : null}
            {!hasTarget && !targetLoading && viewMode === 'personal' && summary?.personal_target == null && summary?.allocated_target == null && summary?.branch_target == null ? (
              <span className="block text-[10px] text-[var(--warn)]/90 mt-0.5">
                Set a personal or branch monthly target in User / Branch settings.
              </span>
            ) : null}
            {!hasTarget && !targetLoading && viewMode === 'all' ? (
              <span className="block text-[10px] text-[var(--warn)]/90 mt-0.5">
                Add monthly targets on each branch in Branch Management.
              </span>
            ) : null}
          </span>
          <span className="font-medium text-[var(--accent)] shrink-0 tabular-nums">{targetDisplay}</span>
        </div>
        <div className="h-2.5 bg-[var(--stroke)] rounded-full overflow-hidden">
          {hasTarget && targetProgressPct != null ? (
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${targetProgressPct}%`,
                backgroundColor: 'var(--accent, #0071e3)',
                minHeight: '10px'
              }}
            />
          ) : (
            <div className="h-full w-full bg-[var(--card-hover)]" style={{ minHeight: '10px' }} />
          )}
        </div>
        <div className="text-helper mt-1">
          {targetActualCcLabel} {formatCurrency(targetActualCc || 0)}
        </div>
      </div>
    </Card>
  )
}

export function StatusBreakdownWidget({ summary }) {
  const entries = Object.entries(summary?.status_counts || {})
    .filter(([, count]) => Number(count) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
  const visible = entries.slice(0, 6)
  const hidden = entries.length - visible.length

  return (
    <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget h-full min-h-0 overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <WidgetIcon>
          <FiPieChart className="h-4 w-4 text-[var(--accent)]" />
        </WidgetIcon>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Status breakdown</h3>
      </div>
      <p className="text-[10px] text-[var(--text-muted)] mb-2 shrink-0">
        Receipts in approval queues count as Pending.
      </p>
      {visible.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No receipt status data for this period.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {visible.map(([status, count]) => (
              <div key={status} className="flex items-center gap-1.5 rounded-lg bg-[var(--card-hover)]/60 px-2.5 py-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    status === 'Completed'
                      ? 'bg-[var(--success)]'
                      : status === 'Pending'
                        ? 'bg-[var(--warn)]'
                        : status === 'Failed' || status === 'Rejected'
                          ? 'bg-[var(--error)]'
                          : 'bg-amber-400'
                  }`}
                />
                <span className="text-xs font-medium text-[var(--text-primary)]">{status}</span>
                <span className="text-xs text-[var(--text-muted)] tabular-nums">{count}</span>
              </div>
            ))}
          </div>
          {hidden > 0 ? (
            <p className="text-[11px] text-[var(--text-muted)] mt-2">+{hidden} more statuses</p>
          ) : null}
        </>
      )}
    </Card>
  )
}

export function LeadsSnapshotWidget({ leadsSnapshot }) {
  const items = Array.isArray(leadsSnapshot) ? leadsSnapshot : []
  return (
    <DashboardSnapshotListCard
      title="Leads"
      icon={<FiUser className="h-4 w-4 text-[var(--accent)]" />}
      href="/leads"
      count={items.length}
      items={items}
      maxItems={4}
      emptyLabel="No leads in your pipeline."
      moreCount={Math.max(0, items.length - 4)}
      getItemKey={(lead, i) => lead._key || lead.id || String(i)}
      renderItem={(lead) => (
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-[var(--text-primary)] font-medium truncate">{lead.name || 'Unnamed lead'}</span>
          <StagePill stage={lead.stage} />
        </div>
      )}
    />
  )
}

export function IssuesSnapshotWidget({ issuesSnapshot, issuesSnapshotTotal, isAdmin }) {
  const items = Array.isArray(issuesSnapshot) ? issuesSnapshot : []
  const total = issuesSnapshotTotal ?? items.length
  const href = isAdmin ? '/issues?status=open' : '/my-issues?status=open'

  return (
    <DashboardSnapshotListCard
      title="Open issues"
      icon={<FiAlertTriangle className="h-4 w-4 text-[var(--warn)]" />}
      iconClassName="bg-[var(--warn-muted)]"
      href={href}
      count={total}
      items={items}
      maxItems={4}
      emptyLabel="No open issues."
      moreCount={Math.max(0, total - 4)}
      getItemKey={(issue, i) => issue.id || issue._key || String(i)}
      renderItem={(issue) => (
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-medium text-[var(--text-primary)] truncate flex-1">
            {issue.title || `Issue #${issue.id || '—'}`}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <PriorityPill priority={issue.priority} />
            {issue.created_at ? (
              <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                {formatRelativeDate(issue.created_at)}
              </span>
            ) : null}
          </div>
        </div>
      )}
    />
  )
}

export function TopEmployeesWidget({ topEmployees, formatCurrency }) {
  return (
    <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget h-full min-h-[7.5rem] overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <WidgetIcon className="bg-[var(--warn-muted)]">
          <FiAward className="h-4 w-4 text-[var(--warn)]" />
        </WidgetIcon>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Top employees</h3>
      </div>
      {topEmployees.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No employee data for this period.</p>
      ) : (
        <ul className="space-y-1 flex-1 min-h-0 overflow-y-auto dashboard-snapshot-list-body">
          {topEmployees.slice(0, 4).map((emp, i) => {
            const invested = Number(emp.total_investment) || 0
            const target = Number(emp.effective_target) || 0
            const pct = target > 0 ? Math.min(100, Math.round((invested / target) * 100)) : null
            return (
              <li key={emp.emp_code || emp.id || i} className="flex justify-between gap-2 text-xs py-0.5">
                <span className="text-[var(--text-primary)] truncate">
                  #{i + 1} {emp.employee_name || emp.name || emp.emp_code || '—'}
                </span>
                <span className="text-[var(--text-muted)] ml-2 shrink-0 text-right">
                  <span className="block">{formatCurrency(invested)}</span>
                  {target > 0 ? (
                    <span className="block text-[10px] text-[var(--text-muted)]">
                      {pct}% of {formatCurrency(target)}
                    </span>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

export function MonthlyCcSiWidget({ monthlyCcSi, formatCurrency }) {
  return (
    <Card padding="lg" hover className="dashboard-widget-card animate-dashboard-widget h-full min-h-[7.5rem]">
      <div className="flex items-center gap-2 mb-2">
        <WidgetIcon className="bg-[var(--success-muted)]">
          <FiTrendingUp className="h-4 w-4 text-[var(--success)]" />
        </WidgetIcon>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Monthly CC / SI</h3>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={monthlyCcSi} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
          <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} width={36} tickFormatter={(v) => `₹${(v / 1e5).toFixed(0)}L`} />
          <Tooltip
            formatter={(v) => formatCurrency(v)}
            labelFormatter={(l) => `Month: ${l}`}
            contentStyle={{ backgroundColor: 'var(--card-bg-opaque)', border: '1px solid var(--stroke)', borderRadius: '8px' }}
            labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
            itemStyle={{ color: 'var(--text-primary)' }}
          />
          <Bar dataKey="cc" fill="#2563eb" name="CC" radius={[4, 4, 0, 0]} />
          <Bar dataKey="si" fill="#059669" name="SI" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

export function OverdueTasksWidget({ overdueTasks }) {
  const items = Array.isArray(overdueTasks) ? overdueTasks : []
  return (
    <DashboardSnapshotListCard
      title="Overdue tasks"
      icon={<FiCheckSquare className="h-4 w-4 text-[var(--accent)]" />}
      href="/tasks"
      count={items.length}
      items={items}
      maxItems={5}
      emptyLabel="No overdue tasks."
      moreCount={Math.max(0, items.length - 5)}
      getItemKey={(task) => task._key || task.id}
      renderItem={(task) => (
        <div className="flex justify-between items-center gap-2">
          <span className="text-xs font-medium text-[var(--text)] truncate flex-1">{task.title || 'Untitled'}</span>
          <span className="text-[10px] text-[var(--text-muted)] shrink-0">{task.due_date}</span>
        </div>
      )}
    />
  )
}

export function RecentReceiptsWidget({ recentReceipts, formatCurrency }) {
  const items = Array.isArray(recentReceipts) ? recentReceipts : []
  return (
    <DashboardSnapshotListCard
      title="Recent receipts"
      icon={<FiList className="h-4 w-4 text-[var(--accent)]" />}
      href="/transactions"
      count={items.length}
      items={items}
      maxItems={5}
      emptyLabel="No recent receipts in this period."
      moreCount={Math.max(0, items.length - 5)}
      getItemKey={(r, i) => r._key || r.id || String(i)}
      renderItem={(r) => {
        const amount = r.transaction?.amount ?? r.investment_amount ?? 0
        const name = r.investor_name || r.investorName || r.customer_name || null
        const receiptNo = r.receipt_no || r.receipt_number
        return (
          <div className="flex justify-between gap-2 text-xs">
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-[var(--text-primary)] truncate">
                {name || receiptNo || '—'}
              </span>
              {name && receiptNo ? (
                <span className="block text-[10px] text-[var(--text-muted)] truncate">{receiptNo}</span>
              ) : null}
            </span>
            <span className="text-[var(--text-muted)] shrink-0 tabular-nums">{formatCurrency(amount)}</span>
          </div>
        )
      }}
    />
  )
}

