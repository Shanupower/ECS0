import React from 'react'
import {
  AverageTicketWidget,
  CcVsSiWidget,
  CollectionCreditWidget,
  ServiceIncomeWidget,
  TotalCustomersWidget,
  TotalInvestmentsWidget,
  TotalReceiptsWidget
} from './kpi-widgets.jsx'
import {
  BranchPerformanceWidget,
  ByCategoryWidget,
  CategoryDonutWidget,
  DailyTimelineWidget
} from './chart-widgets.jsx'
import {
  IssuesSnapshotWidget,
  LeadsSnapshotWidget,
  PendingApprovalsWidget,
  MonthlyCcSiWidget,
  OverdueTasksWidget,
  RecentReceiptsWidget,
  StatusBreakdownWidget,
  TargetVsActualWidget,
  TopEmployeesWidget
} from './snapshot-widgets.jsx'

export function renderDashboardWidget(widgetId, ctx) {
  const { summary, isAdmin, isEmployee, viewMode } = ctx

  switch (widgetId) {
    case 'pending_approvals':
      return <PendingApprovalsWidget approvalsCount={ctx.approvalsCount} />
    case 'average_ticket':
      return <AverageTicketWidget summary={summary} />
    case 'total_receipts':
      return <TotalReceiptsWidget summary={summary} isAdmin={isAdmin} viewMode={viewMode} isEmployee={isEmployee} />
    case 'total_investments':
      return <TotalInvestmentsWidget summary={summary} />
    case 'total_customers':
      return <TotalCustomersWidget summary={summary} />
    case 'collection_credit_earned':
      return <CollectionCreditWidget summary={summary} />
    case 'service_income_earned':
      return <ServiceIncomeWidget summary={summary} />
    case 'cc_vs_si':
      return <CcVsSiWidget summary={summary} />
    case 'target_vs_actual':
      return (
        <TargetVsActualWidget
          summary={summary}
          viewMode={viewMode}
          periodTargetNum={ctx.periodTargetNum}
          targetProgressPct={ctx.targetProgressPct}
          targetActualCcLabel={ctx.targetActualCcLabel}
          targetActualCc={ctx.targetActualCc}
          targetBasisHint={ctx.targetBasisHint}
          hasTarget={ctx.hasTarget}
          targetLoading={ctx.targetLoading}
          formatCurrency={ctx.formatCurrency}
        />
      )
    case 'status_breakdown':
      return <StatusBreakdownWidget summary={summary} />
    case 'leads_snapshot':
      return <LeadsSnapshotWidget leadsSnapshot={ctx.leadsSnapshot} />
    case 'issues_snapshot':
      return (
        <IssuesSnapshotWidget
          issuesSnapshot={ctx.issuesSnapshot}
          issuesSnapshotTotal={ctx.issuesSnapshotTotal}
          isAdmin={isAdmin}
        />
      )
    case 'top_employees':
      return <TopEmployeesWidget topEmployees={ctx.topEmployees} formatCurrency={ctx.formatCurrency} />
    case 'monthly_cc_si':
      return <MonthlyCcSiWidget monthlyCcSi={ctx.monthlyCcSi} formatCurrency={ctx.formatCurrency} />
    case 'overdue_tasks':
      return <OverdueTasksWidget overdueTasks={ctx.overdueTasks} />
    case 'recent_receipts':
      return <RecentReceiptsWidget recentReceipts={ctx.recentReceipts} formatCurrency={ctx.formatCurrency} />
    case 'by_category':
      return <ByCategoryWidget categoryChartData={ctx.categoryChartData} formatCurrency={ctx.formatCurrency} navigate={ctx.navigate} />
    case 'category_donut':
      return <CategoryDonutWidget categoryChartData={ctx.categoryChartData} formatCurrency={ctx.formatCurrency} />
    case 'daily_timeline':
      return <DailyTimelineWidget dailyStats={ctx.dailyStats} formatCurrency={ctx.formatCurrency} formatDate={ctx.formatDate} />
    case 'branch_performance':
      return (
        <BranchPerformanceWidget
          allBranchesTargetSummary={ctx.allBranchesTargetSummary}
          targetLoading={ctx.targetLoading}
          dateRange={ctx.dateRange}
          formatCurrency={ctx.formatCurrency}
          scaleMonthlyTargetToDateRange={ctx.scaleMonthlyTargetToDateRange}
          toSafeNumber={ctx.toSafeNumber}
          openBranchBreakdown={ctx.openBranchBreakdown}
        />
      )
    default:
      return null
  }
}
