import React from 'react'
import { FaRupeeSign } from 'react-icons/fa'
import { FiAward, FiFileText, FiTrendingUp, FiUsers } from 'react-icons/fi'
import { Card } from '../../../components/ui'
import CompactStatValue from '../../../components/ui/CompactStatValue.jsx'

function KpiCard({ title, helper, icon, iconBg, value, kind = 'money', valueClass }) {
  return (
    <Card
      padding="lg"
      hover
      className="dashboard-widget-card dashboard-kpi-expandable animate-dashboard-widget h-full min-h-[7.5rem]"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="dashboard-kpi-content">
          <div className="text-small font-medium text-[var(--text-muted)] mb-1.5">{title}</div>
          <CompactStatValue value={value} kind={kind} className={valueClass} />
          {helper ? <div className="text-helper mt-1">{helper}</div> : null}
        </div>
        <div className={`dashboard-kpi-icon w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

export function AverageTicketWidget({ summary }) {
  const receipts = summary?.total_receipts ?? 0
  if (receipts <= 0) return null
  return (
    <KpiCard
      title="Average ticket"
      helper="Per receipt in period"
      icon={<FaRupeeSign className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--success)]" aria-hidden />}
      iconBg="bg-[var(--success-muted)]"
      value={(summary?.total_investments || 0) / receipts}
      valueClass="text-[var(--success)]"
    />
  )
}

export function TotalReceiptsWidget({ summary, isAdmin, viewMode, isEmployee }) {
  const helper = isAdmin
    ? (viewMode === 'personal' ? 'Personal' : viewMode === 'branch' ? 'Your branch' : 'All branches')
    : (viewMode === 'personal' ? 'Personal' : 'Your branch')
  return (
    <KpiCard
      title="Total Receipts"
      helper={helper}
      icon={<FiFileText className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--accent)]" />}
      iconBg="bg-[var(--accent-muted)] rounded-card"
      value={summary?.total_receipts ?? 0}
      kind="count"
      valueClass="text-[var(--text-primary)]"
    />
  )
}

export function TotalInvestmentsWidget({ summary }) {
  return (
    <KpiCard
      title="Total Investments"
      helper="Investment amount in the selected period"
      icon={<FiTrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--success)]" aria-hidden />}
      iconBg="bg-[var(--success-muted)]"
      value={summary?.total_investments || 0}
      valueClass="text-[var(--success)]"
    />
  )
}

export function TotalCustomersWidget({ summary }) {
  return (
    <KpiCard
      title="Total Customers"
      helper="Customers in the selected scope"
      icon={<FiUsers className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--accent)]" />}
      iconBg="bg-[var(--accent-muted)]"
      value={summary?.total_customers ?? 0}
      kind="count"
      valueClass="text-[var(--text-primary)]"
    />
  )
}

export function CollectionCreditWidget({ summary }) {
  return (
    <KpiCard
      title="Collection/Credit Earned"
      helper="Sum of CC on qualifying receipts"
      icon={<FiAward className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--warn)]" />}
      iconBg="bg-[var(--warn-muted)]"
      value={summary?.collection_credit_earned || summary?.commissions_total || 0}
      valueClass="text-[var(--warn)]"
    />
  )
}

export function ServiceIncomeWidget({ summary }) {
  return (
    <KpiCard
      title="Service Income Earned"
      helper="Admin-only SI"
      icon={<FiAward className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--accent)]" />}
      iconBg="bg-[var(--accent-muted)] rounded-card"
      value={summary?.service_income_earned || 0}
      valueClass="text-[var(--text-primary)]"
    />
  )
}

export function CcVsSiWidget({ summary }) {
  return (
    <Card padding="lg" hover className="dashboard-widget-card dashboard-kpi-expandable animate-dashboard-widget h-full min-h-[7.5rem]">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--warn-muted)]">
          <FiAward className="h-4 w-4 text-[var(--warn)]" />
        </div>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">CC vs SI</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="dashboard-kpi-expandable-sm rounded-lg border border-[var(--stroke)] bg-[var(--card-hover)]/50 p-3">
          <div className="text-xs font-medium text-[var(--text-muted)]">CC</div>
          <CompactStatValue
            value={summary?.collection_credit_earned || summary?.commissions_total || 0}
            kind="money"
            size="md"
            className="mt-0.5 text-[var(--warn)]"
          />
        </div>
        <div className="dashboard-kpi-expandable-sm rounded-lg border border-[var(--stroke)] bg-[var(--card-hover)]/50 p-3">
          <div className="text-xs font-medium text-[var(--text-muted)]">SI</div>
          <CompactStatValue
            value={summary?.service_income_earned || 0}
            kind="money"
            size="md"
            className="mt-0.5 text-[var(--success)]"
          />
        </div>
      </div>
    </Card>
  )
}
