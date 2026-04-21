import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FiAlertCircle, FiClock, FiChevronRight } from 'react-icons/fi'
import ChartCard from './ChartCard'

function daysSince(iso) {
  if (!iso) return Infinity
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return Infinity
  return Math.floor((Date.now() - t) / 86400000)
}

export default function WorkQueueCard({
  recentReceipts = [],
  leads = [],
  branchCode,
  staleLeadsServer = null,
  staleCustomersServer = null,
  staleDaysServer = 14,
}) {
  const { pendingReceipts, staleLeadsClient } = useMemo(() => {
    let pending = 0
    ;(recentReceipts || []).forEach((r) => {
      const st = String(r.status || '').toLowerCase()
      if (st === 'pending') pending += 1
    })

    const staleDays = Number(staleDaysServer) > 0 ? Number(staleDaysServer) : 14
    let stale = 0
    ;(leads || []).forEach((l) => {
      const status = String(l.status || l.stage || 'new').toLowerCase()
      if (!['new', 'contacted', 'open'].some((s) => status.includes(s))) return
      const touch = l.updated_at || l.created_at || l.date
      if (daysSince(touch) >= staleDays) stale += 1
    })

    return { pendingReceipts: pending, staleLeadsClient: stale }
  }, [recentReceipts, leads, staleDaysServer])

  const staleLeads =
    staleLeadsServer != null && Number.isFinite(Number(staleLeadsServer)) ? Number(staleLeadsServer) : staleLeadsClient
  const staleCustomers =
    staleCustomersServer != null && Number.isFinite(Number(staleCustomersServer))
      ? Number(staleCustomersServer)
      : null

  const tx = branchCode ? `/transactions?branch=${encodeURIComponent(branchCode)}` : '/transactions'
  const custLink = '/customers'

  return (
    <ChartCard
      title="Work queue"
      subtitle="Items that may need attention in your filters window"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Link
          to={tx}
          className="flex items-center justify-between gap-2 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] px-3 py-3 hover:bg-[var(--card-hover)] transition-colors text-left"
        >
          <div className="flex items-start gap-2 min-w-0">
            <FiClock className="w-5 h-5 text-[var(--warn)] shrink-0 mt-0.5" aria-hidden />
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">Pending receipts (sample)</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                In recent branch receipts: {pendingReceipts} with Pending status
              </div>
            </div>
          </div>
          <FiChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" aria-hidden />
        </Link>
        <Link
          to="/leads"
          className="flex items-center justify-between gap-2 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] px-3 py-3 hover:bg-[var(--card-hover)] transition-colors text-left"
        >
          <div className="flex items-start gap-2 min-w-0">
            <FiAlertCircle className="w-5 h-5 text-[var(--accent)] shrink-0 mt-0.5" aria-hidden />
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                Stale leads ({staleDaysServer}+ days)
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Open pipeline leads not touched in {staleDaysServer} days (server count when available): {staleLeads}
              </div>
            </div>
          </div>
          <FiChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" aria-hidden />
        </Link>
        {staleCustomers != null && (
          <Link
            to={custLink}
            className="flex items-center justify-between gap-2 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] px-3 py-3 hover:bg-[var(--card-hover)] transition-colors text-left sm:col-span-2 lg:col-span-1"
          >
            <div className="flex items-start gap-2 min-w-0">
              <FiAlertCircle className="w-5 h-5 text-[var(--warn)] shrink-0 mt-0.5" aria-hidden />
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">Stale customers</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  No record update in {staleDaysServer}+ days (branch scope): {staleCustomers}
                </div>
              </div>
            </div>
            <FiChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" aria-hidden />
          </Link>
        )}
      </div>
      <p className="text-[10px] text-[var(--text-muted)] mt-3">
        Receipt status uses your loaded sample (up to 200). Refine date range in filters for a tighter queue.
      </p>
    </ChartCard>
  )
}
