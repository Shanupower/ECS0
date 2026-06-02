import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FiRefreshCw, FiDownload, FiBarChart2, FiAlertOctagon, FiUser } from 'react-icons/fi'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import DatePickerInput from '../components/ui/DatePickerInput.jsx'
import { downloadBlob, rowsFromObjects, rowsToCsv } from '../features/analytics/lib/report-download.js'

export default function TasksReportsPage() {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [branch, setBranch] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await api.getTasksReports(token, { from, to, branch: branch || undefined })
      setData(res)
    } catch (err) {
      console.error('reports load failed:', err?.message)
    } finally {
      setLoading(false)
    }
  }, [token, from, to, branch])

  useEffect(() => { load() }, [load])

  const maxCompletion = useMemo(() => {
    const arr = data?.completion_by_day || []
    return arr.reduce((m, r) => Math.max(m, r.count || 0), 0) || 1
  }, [data])

  const maxCreated = useMemo(() => {
    const arr = data?.created_by_day || []
    return arr.reduce((m, r) => Math.max(m, r.count || 0), 0) || 1
  }, [data])

  const exportCsv = () => {
    if (!data) return
    const cols = [{ key: 'day', label: 'Day' }, { key: 'count', label: 'Completed' }]
    const { headers, dataRows } = rowsFromObjects(data.completion_by_day || [], cols)
    const csv = rowsToCsv(headers, dataRows, {
      reportTitle: 'Tasks Completion Trend',
      from,
      to
    })
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `tasks-completion-${from}-to-${to}.csv`)
  }

  const exportWorkload = () => {
    if (!data) return
    const cols = [
      { key: 'assignee', label: 'Assignee' },
      { key: 'total', label: 'Open' },
      { key: 'overdue', label: 'Overdue' },
      { key: 'sla_breached', label: 'SLA breached' }
    ]
    const { headers, dataRows } = rowsFromObjects(data.workload || [], cols)
    const csv = rowsToCsv(headers, dataRows, {
      reportTitle: 'Tasks Workload',
      from,
      to
    })
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `tasks-workload-${from}-to-${to}.csv`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <FiBarChart2 className="w-6 h-6 text-red-600" />
          Tasks reports
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <DatePickerInput
            value={from}
            onChange={(v) => setFrom(v)}
            inputClassName="px-2 py-1 text-sm border border-[var(--stroke)] rounded bg-[var(--card-bg-opaque)] text-[var(--text-primary)]"
          />
          <span className="text-xs text-[var(--text-muted)]">to</span>
          <DatePickerInput
            value={to}
            onChange={(v) => setTo(v)}
            inputClassName="px-2 py-1 text-sm border border-[var(--stroke)] rounded bg-[var(--card-bg-opaque)] text-[var(--text-primary)]"
          />
          <input type="text" placeholder="Branch code" value={branch} onChange={(e) => setBranch(e.target.value)} className="px-2 py-1 text-sm border border-[var(--stroke)] rounded bg-[var(--card-bg-opaque)] text-[var(--text-primary)] w-28" />
          <button onClick={load} className="inline-flex items-center gap-1 px-2 py-1 text-sm border border-[var(--stroke)] rounded hover:bg-[var(--card-hover)] text-[var(--text-primary)]">
            <FiRefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* SLA summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] p-3">
          <div className="text-xs text-[var(--text-muted)]">Tracked under SLA</div>
          <div className="text-2xl font-semibold text-[var(--text-primary)]">{data?.sla_summary?.tracked ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] p-3">
          <div className="text-xs text-[var(--text-muted)]">Breached</div>
          <div className="text-2xl font-semibold text-rose-600 flex items-center gap-1"><FiAlertOctagon className="w-5 h-5" />{data?.sla_summary?.breached ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] p-3">
          <div className="text-xs text-[var(--text-muted)]">Adherence</div>
          <div className="text-2xl font-semibold text-emerald-600">{Math.round(data?.sla_summary?.adherence_pct ?? 100)}%</div>
        </div>
      </div>

      {/* Completion trend */}
      <section className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Completion trend</h2>
          <button onClick={exportCsv} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] inline-flex items-center gap-1">
            <FiDownload className="w-3 h-3" /> CSV
          </button>
        </div>
        <MiniBars rows={data?.completion_by_day || []} max={maxCompletion} color="#10b981" />
      </section>

      {/* Created trend */}
      <section className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Created trend</h2>
        </div>
        <MiniBars rows={data?.created_by_day || []} max={maxCreated} color="#3b82f6" />
      </section>

      {/* Workload */}
      <section className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1"><FiUser className="w-4 h-4" /> Workload matrix (top 20)</h2>
          <button onClick={exportWorkload} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] inline-flex items-center gap-1">
            <FiDownload className="w-3 h-3" /> CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--text-muted)] text-xs">
                <th className="py-1 pr-2 font-normal">Assignee</th>
                <th className="py-1 pr-2 font-normal">Open</th>
                <th className="py-1 pr-2 font-normal">Overdue</th>
                <th className="py-1 font-normal">SLA breached</th>
              </tr>
            </thead>
            <tbody>
              {(data?.workload || []).map((r) => (
                <tr key={r.assignee || 'none'} className="border-t border-[var(--stroke)]">
                  <td className="py-1 pr-2 text-[var(--text-primary)]">{r.assignee || '—'}</td>
                  <td className="py-1 pr-2 text-[var(--text-primary)]">{r.total}</td>
                  <td className="py-1 pr-2 text-amber-600">{r.overdue}</td>
                  <td className="py-1 text-rose-600">{r.sla_breached}</td>
                </tr>
              ))}
              {!data?.workload?.length && (
                <tr><td colSpan="4" className="py-4 text-center text-xs text-[var(--text-muted)]">No open workload</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* By branch */}
      <section className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] p-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Branch compare</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--text-muted)] text-xs">
                <th className="py-1 pr-2 font-normal">Branch</th>
                <th className="py-1 pr-2 font-normal">Total</th>
                <th className="py-1 pr-2 font-normal">Open</th>
                <th className="py-1 pr-2 font-normal">Completed</th>
                <th className="py-1 font-normal">SLA breached</th>
              </tr>
            </thead>
            <tbody>
              {(data?.by_branch || []).map((r) => (
                <tr key={r.branch || 'none'} className="border-t border-[var(--stroke)]">
                  <td className="py-1 pr-2 text-[var(--text-primary)]">{r.branch || '—'}</td>
                  <td className="py-1 pr-2 text-[var(--text-primary)]">{r.total}</td>
                  <td className="py-1 pr-2 text-[var(--text-primary)]">{r.open}</td>
                  <td className="py-1 pr-2 text-emerald-600">{r.completed}</td>
                  <td className="py-1 text-rose-600">{r.sla_breached}</td>
                </tr>
              ))}
              {!data?.by_branch?.length && (
                <tr><td colSpan="5" className="py-4 text-center text-xs text-[var(--text-muted)]">No data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function MiniBars({ rows, max, color }) {
  if (!rows?.length) {
    return <div className="text-xs text-[var(--text-muted)] text-center py-6">No data in range.</div>
  }
  return (
    <div className="flex items-end gap-1 h-24">
      {rows.map((r) => (
        <div key={r.day} className="flex-1 min-w-[8px] flex flex-col items-center justify-end" title={`${r.day}: ${r.count}`}>
          <div
            style={{ height: `${Math.max(4, (r.count / max) * 100)}%`, backgroundColor: color }}
            className="w-full rounded-t"
          />
          <span className="text-[9px] text-[var(--text-muted)] mt-0.5 rotate-[-45deg] origin-top-left translate-x-1">
            {r.day?.slice(5)}
          </span>
        </div>
      ))}
    </div>
  )
}
