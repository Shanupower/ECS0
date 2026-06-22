import React from 'react'
import { KPI_WIDGET_IDS } from './dashboard-layout.js'

const KPI_GRID = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-5 sm:gap-6'
const COMPACT_GRID = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6'
const CHART_GRID = 'grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8'

const COMPACT_WIDGET_IDS = [
  'target_vs_actual',
  'average_ticket',
  'pending_approvals',
  'cc_vs_si',
  'status_breakdown'
]

const SNAPSHOT_WIDGET_IDS = [
  'top_employees',
  'leads_snapshot',
  'issues_snapshot',
  'overdue_tasks',
  'recent_receipts'
]

const CHART_WIDGET_IDS = [
  'monthly_cc_si',
  'by_category',
  'category_donut',
  'daily_timeline'
]

function WidgetGroup({ ids, widgetSet, className, renderWidget }) {
  const visibleIds = ids.filter((id) => widgetSet.has(id))
  if (!visibleIds.length) return null

  return (
    <div className={className}>
      {visibleIds.map((id) => (
        <div key={id} className="min-w-0">
          {renderWidget(id)}
        </div>
      ))}
    </div>
  )
}

export default function DashboardStaticLayout({ widgetIds, renderWidget }) {
  const widgetSet = new Set(widgetIds || [])

  return (
    <div className="space-y-8">
      <WidgetGroup
        ids={KPI_WIDGET_IDS}
        widgetSet={widgetSet}
        className={KPI_GRID}
        renderWidget={renderWidget}
      />
      <WidgetGroup
        ids={COMPACT_WIDGET_IDS}
        widgetSet={widgetSet}
        className={COMPACT_GRID}
        renderWidget={renderWidget}
      />
      <WidgetGroup
        ids={CHART_WIDGET_IDS}
        widgetSet={widgetSet}
        className={CHART_GRID}
        renderWidget={renderWidget}
      />
      <WidgetGroup
        ids={SNAPSHOT_WIDGET_IDS}
        widgetSet={widgetSet}
        className={COMPACT_GRID}
        renderWidget={renderWidget}
      />
      {widgetSet.has('branch_performance') && (
        <div className="min-h-[52rem]">
          {renderWidget('branch_performance')}
        </div>
      )}
    </div>
  )
}
