import React from 'react'
import { Link } from 'react-router-dom'
import { FiAlertTriangle, FiCheckSquare, FiChevronRight } from 'react-icons/fi'
import ChartCard from './ChartCard'

export default function TasksIssuesCard({ tasks = [], issues = [], taskTotal = 0, issueTotal = 0 }) {
  const openTasks = (tasks || []).slice(0, 4)
  const openIssues = (issues || []).slice(0, 4)

  return (
    <ChartCard title="Tasks & issues" subtitle="Open items for your access (read-only)">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <FiCheckSquare className="w-4 h-4 text-[var(--accent)]" aria-hidden />
              Branch tasks
            </div>
            <Link
              to="/tasks"
              className="text-[11px] text-[var(--accent)] hover:underline inline-flex items-center gap-0.5"
            >
              All
              <FiChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mb-2">
            Pending / in progress (visible scope): <span className="font-medium text-[var(--text-secondary)]">{taskTotal}</span>
          </p>
          <ul className="space-y-1.5">
            {openTasks.length === 0 && (
              <li className="text-xs text-[var(--text-muted)]">No open tasks in this sample.</li>
            )}
            {openTasks.map((t) => (
              <li key={t._key || t.id} className="text-xs text-[var(--text-secondary)] truncate">
                · {t.title || 'Untitled'}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <FiAlertTriangle className="w-4 h-4 text-[var(--warn)]" aria-hidden />
              My reported issues
            </div>
            <Link
              to="/issues"
              className="text-[11px] text-[var(--accent)] hover:underline inline-flex items-center gap-0.5"
            >
              All
              <FiChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mb-2">
            Open status: <span className="font-medium text-[var(--text-secondary)]">{issueTotal}</span>
          </p>
          <ul className="space-y-1.5">
            {openIssues.length === 0 && (
              <li className="text-xs text-[var(--text-muted)]">No open issues.</li>
            )}
            {openIssues.map((i) => (
              <li key={i.id || i._key} className="text-xs text-[var(--text-secondary)] truncate">
                · {i.title || `Issue #${i.id}`}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ChartCard>
  )
}
