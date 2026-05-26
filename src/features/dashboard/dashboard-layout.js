/** @typedef {{ i: string, x: number, y: number, w: number, h: number }} LayoutItem */
/** @typedef {{ lg: LayoutItem[], layoutVersion?: number }} DashboardLayout */

/** Bump when row templates change — triggers one-time reflow for saved layouts. */
export const LAYOUT_VERSION = 2

/** 15 columns so five equal KPI cards fit one row (5×3). */
export const GRID_COLS = 15
/** Row height tuned for min-h-[7.5rem] KPI cards + 1.5rem gutters */
export const GRID_ROW_HEIGHT = 56
export const GRID_MARGIN = [24, 24]

export const LEGACY_KPI_BLOCK = 'kpi_cards'

export const KPI_WIDGET_IDS = [
  'total_receipts',
  'total_investments',
  'total_customers',
  'collection_credit_earned',
  'service_income_earned'
]

/** Widget ids shown in Customize (legacy kpi_cards excluded). */
export const ALL_WIDGET_IDS = [
  'pending_approvals',
  'average_ticket',
  ...KPI_WIDGET_IDS,
  'target_vs_actual',
  'cc_vs_si',
  'status_breakdown',
  'leads_snapshot',
  'issues_snapshot',
  'top_employees',
  'monthly_cc_si',
  'overdue_tasks',
  'recent_receipts',
  'by_category',
  'category_donut',
  'daily_timeline',
  'branch_performance'
]

/** Shipped default dashboard (Customize can add more widgets). */
export const ADMIN_PRESET_WIDGETS = [
  ...KPI_WIDGET_IDS,
  'cc_vs_si',
  'status_breakdown',
  'leads_snapshot',
  'issues_snapshot',
  'top_employees'
]

export const NON_ADMIN_PRESET_WIDGETS = [
  'total_receipts',
  'total_investments',
  'total_customers',
  'collection_credit_earned',
  'status_breakdown',
  'leads_snapshot',
  'issues_snapshot',
  'top_employees'
]

export const WIDGET_LABELS = {
  pending_approvals: 'My pending approvals',
  average_ticket: 'Average ticket',
  total_receipts: 'Total Receipts',
  total_investments: 'Total Investments',
  total_customers: 'Total Customers',
  collection_credit_earned: 'Collection/Credit Earned',
  service_income_earned: 'Service Income Earned',
  overdue_tasks: 'Overdue tasks',
  by_category: 'By Category (bar)',
  daily_timeline: 'Daily Timeline',
  branch_performance: 'Branch Performance',
  target_vs_actual: 'Target vs actual',
  recent_receipts: 'Recent receipts',
  status_breakdown: 'Status breakdown',
  category_donut: 'Category donut',
  monthly_cc_si: 'Monthly CC/SI',
  top_employees: 'Top employees',
  leads_snapshot: 'Leads snapshot',
  issues_snapshot: 'Issues snapshot',
  cc_vs_si: 'CC vs SI'
}

const REMOVED_WIDGET_IDS = new Set(['investor_heatmap'])

/** One fifth of the row each (5×3=15). */
const SMALL_KPI = { w: 3, h: 3 }
const MEDIUM = { w: 5, h: 3 }
const CHART = { w: 8, h: 7 }
/** Tall enough for target summary + ~3 rows of branch cards without clipping. */
const WIDE = { w: 15, h: 14 }
export const BRANCH_PERFORMANCE_MIN_H = 12

/** Default grid footprint per widget (not user-resizable). */
export function footprint(widgetId) {
  switch (widgetId) {
    case 'average_ticket':
    case 'total_receipts':
    case 'total_investments':
    case 'total_customers':
    case 'collection_credit_earned':
    case 'service_income_earned':
      return SMALL_KPI
    case 'pending_approvals':
      return { w: 5, h: 2 }
    case 'target_vs_actual':
      return { w: 8, h: 3 }
    case 'cc_vs_si':
    case 'status_breakdown':
    case 'leads_snapshot':
    case 'issues_snapshot':
    case 'top_employees':
    case 'monthly_cc_si':
    case 'overdue_tasks':
    case 'recent_receipts':
      return MEDIUM
    case 'by_category':
    case 'category_donut':
    case 'daily_timeline':
      return CHART
    case 'branch_performance':
      return WIDE
    default:
      return MEDIUM
  }
}

/** Visual order for auto-placement when no saved layout. */
const DEFAULT_WIDGET_ORDER = [
  'average_ticket',
  ...KPI_WIDGET_IDS,
  'pending_approvals',
  'target_vs_actual',
  'cc_vs_si',
  'status_breakdown',
  'leads_snapshot',
  'issues_snapshot',
  'top_employees',
  'monthly_cc_si',
  'overdue_tasks',
  'recent_receipts',
  'by_category',
  'category_donut',
  'daily_timeline',
  'branch_performance'
]

export function migrateWidgetIds(widgetIds) {
  if (widgetIds == null) return null
  if (!Array.isArray(widgetIds)) return widgetIds
  let out = widgetIds.map((id) => String(id).trim()).filter(Boolean)
  out = out.filter((id) => !REMOVED_WIDGET_IDS.has(id))
  if (!out.includes(LEGACY_KPI_BLOCK)) return out
  out = out.filter((id) => id !== LEGACY_KPI_BLOCK)
  for (const kid of KPI_WIDGET_IDS) {
    if (!out.includes(kid)) out.push(kid)
  }
  return out
}

/**
 * @param {boolean} isAdmin
 * @param {{ includePendingApprovals?: boolean }} [options]
 */
export function defaultWidgetIdsForRole(isAdmin, options = {}) {
  const base = isAdmin ? [...ADMIN_PRESET_WIDGETS] : [...NON_ADMIN_PRESET_WIDGETS]
  if (!options.includePendingApprovals) return base
  const kpis = isAdmin
    ? KPI_WIDGET_IDS
    : ['total_receipts', 'total_investments', 'total_customers', 'collection_credit_earned']
  const rest = base.filter((id) => !kpis.includes(id))
  return [...kpis, 'pending_approvals', ...rest]
}

/** Upgrade layouts saved on the old 12-column grid. */
export function migrateLayoutTo15Cols(lg) {
  if (!lg?.length) return lg
  const maxRight = Math.max(...lg.map((item) => item.x + item.w))
  if (maxRight > 13) return lg

  const kpiIndex = new Map(KPI_WIDGET_IDS.map((id, index) => [id, index]))

  return lg.map((item) => {
    if (KPI_WIDGET_IDS.includes(item.i)) {
      const idx = kpiIndex.get(item.i) ?? 0
      return { ...item, x: idx * 3, w: 3, h: Math.max(item.h || 0, 3) }
    }
    const scale = 15 / 12
    let w = Math.max(1, Math.round(item.w * scale))
    let x = Math.round(item.x * scale)
    if (item.i === 'pending_approvals') {
      w = 5
      x = 0
    }
    if (item.i === 'top_employees' && item.w >= 8) {
      w = 10
    }
    if (x + w > GRID_COLS) x = Math.max(0, GRID_COLS - w)
    return { ...item, x, w, h: item.h }
  })
}

/** Keep pending approvals under the KPI row (legacy saves had it on top). */
export function reconcilePendingApprovalsLayout(lg) {
  if (!lg?.length) return lg
  const pending = lg.find((item) => item.i === 'pending_approvals')
  if (!pending) return lg
  const kpiItems = lg.filter((item) => KPI_WIDGET_IDS.includes(item.i))
  if (!kpiItems.length) return lg
  const minKpiY = Math.min(...kpiItems.map((k) => k.y))
  if (pending.y > minKpiY) return lg
  const maxKpiBottom = Math.max(...kpiItems.map((k) => k.y + k.h))
  return lg.map((item) =>
    item.i === 'pending_approvals'
      ? { ...item, x: 0, y: maxKpiBottom, w: item.w || 5, h: item.h || 2 }
      : item
  )
}

/** Layout zones — widgets always pack inside their section rows. */
const LAYOUT_SECTION_ORDER = ['metrics', 'insights', 'performance', 'charts', 'wide']

/** @type {Record<string, { section: string, order: number, w?: number, h?: number }>} */
const WIDGET_BLUEPRINT = {
  total_receipts: { section: 'kpi', order: 0 },
  total_investments: { section: 'kpi', order: 1 },
  total_customers: { section: 'kpi', order: 2 },
  collection_credit_earned: { section: 'kpi', order: 3 },
  service_income_earned: { section: 'kpi', order: 4 },
  pending_approvals: { section: 'metrics', order: 0, w: 5, h: 2 },
  average_ticket: { section: 'metrics', order: 1, w: 5, h: 3 },
  cc_vs_si: { section: 'insights', order: 0 },
  status_breakdown: { section: 'insights', order: 1 },
  leads_snapshot: { section: 'insights', order: 2 },
  issues_snapshot: { section: 'insights', order: 3 },
  overdue_tasks: { section: 'insights', order: 4 },
  recent_receipts: { section: 'insights', order: 5 },
  target_vs_actual: { section: 'performance', order: 0, w: 8, h: 3 },
  top_employees: { section: 'performance', order: 1, w: 7, h: 3 },
  monthly_cc_si: { section: 'charts', order: 0, w: 8, h: 7 },
  by_category: { section: 'charts', order: 1, w: 7, h: 7 },
  category_donut: { section: 'charts', order: 2, w: 7, h: 7 },
  daily_timeline: { section: 'charts', order: 3, w: 8, h: 7 },
  branch_performance: { section: 'wide', order: 0, w: 15, h: 14 }
}

const NON_ADMIN_KPI_IDS = [
  'total_receipts',
  'total_investments',
  'total_customers',
  'collection_credit_earned'
]

function blueprintSize(widgetId, sectionItems) {
  const bp = WIDGET_BLUEPRINT[widgetId]
  const fp = footprint(widgetId)
  let w = bp?.w ?? fp.w
  let h = bp?.h ?? fp.h
  if (widgetId === 'top_employees' && !sectionItems.includes('target_vs_actual')) {
    w = GRID_COLS
  }
  return { w: Math.min(w, GRID_COLS), h }
}

const CHART_WIDGET_IDS = [
  'monthly_cc_si',
  'by_category',
  'category_donut',
  'daily_timeline'
]

/**
 * Place widgets on one row; skips missing ids. All items share the same `h`.
 * @param {LayoutItem[]} lg
 * @param {number} y
 * @param {string[]} ids
 * @param {number[]} widths
 * @param {number} h
 * @param {Set<string>} idSet
 * @returns {number} next Y
 */
function placeFixedRow(lg, y, ids, widths, h, idSet) {
  let x = 0
  let placed = 0
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]
    if (!idSet.has(id)) continue
    const w = widths[i] ?? 5
    lg.push({ i: id, x, y, w, h })
    x += w
    placed++
  }
  return placed ? y + h : y
}

/**
 * Production layout: explicit rows with uniform heights per row.
 * @param {string[]} widgetIds
 * @param {boolean} isAdmin
 */
export function buildLayoutRows(widgetIds, isAdmin) {
  const idSet = new Set(widgetIds)
  /** @type {LayoutItem[]} */
  const lg = []
  let y = 0

  const kpiIds = (isAdmin ? KPI_WIDGET_IDS : NON_ADMIN_KPI_IDS).filter((id) => idSet.has(id))
  kpiIds.forEach((id, index) => {
    lg.push({ i: id, x: index * 3, y, w: 3, h: 3 })
  })
  if (kpiIds.length) y += 3

  y = placeFixedRow(lg, y, ['pending_approvals', 'average_ticket'], [5, 5], 3, idSet)
  y = placeFixedRow(
    lg,
    y,
    ['cc_vs_si', 'status_breakdown', 'leads_snapshot'],
    [5, 5, 5],
    4,
    idSet
  )
  y = placeFixedRow(
    lg,
    y,
    ['issues_snapshot', 'overdue_tasks', 'recent_receipts'],
    [5, 5, 5],
    4,
    idSet
  )

  const hasTarget = idSet.has('target_vs_actual')
  const hasTop = idSet.has('top_employees')
  if (hasTarget && hasTop) {
    y = placeFixedRow(lg, y, ['target_vs_actual', 'top_employees'], [8, 7], 4, idSet)
  } else if (hasTarget) {
    y = placeFixedRow(lg, y, ['target_vs_actual'], [15], 4, idSet)
  } else if (hasTop) {
    y = placeFixedRow(lg, y, ['top_employees'], [15], 4, idSet)
  }

  const charts = CHART_WIDGET_IDS.filter((id) => idSet.has(id))
  for (let i = 0; i < charts.length; i++) {
    const id = charts[i]
    const next = charts[i + 1]
    if (next) {
      lg.push({ i: id, x: 0, y, w: 8, h: 7 })
      lg.push({ i: next, x: 8, y, w: 7, h: 7 })
      y += 7
      i++
    } else {
      lg.push({ i: id, x: 0, y, w: 8, h: 7 })
      y += 7
    }
  }

  if (idSet.has('branch_performance')) {
    lg.push({ i: 'branch_performance', x: 0, y, w: 15, h: 14 })
    y += 14
  }

  const placed = new Set(lg.map((item) => item.i))
  const orphans = widgetIds.filter((id) => idSet.has(id) && !placed.has(id))
  if (orphans.length) {
    y = packSectionRow(lg, y, 'insights', orphans, new Set(orphans))
  }

  return stampLayout({
    lg: reconcilePendingApprovalsLayout(migrateLayoutTo15Cols(normalizeLayoutRowHeights(lg)))
  })
}

/** Align bottom edges: all widgets on the same grid row share max height. */
export function normalizeLayoutRowHeights(lg) {
  if (!lg?.length) return lg
  /** @type {Map<number, LayoutItem[]>} */
  const byY = new Map()
  for (const item of lg) {
    const row = byY.get(item.y) || []
    row.push(item)
    byY.set(item.y, row)
  }
  const maxHByY = new Map()
  for (const [rowY, row] of byY) {
    maxHByY.set(rowY, Math.max(...row.map((item) => item.h || 1)))
  }
  return lg.map((item) => ({
    ...item,
    h: maxHByY.get(item.y) ?? item.h
  }))
}

/** @param {{ lg: LayoutItem[] }} layout */
export function stampLayout(layout) {
  return {
    lg: normalizeLayoutRowHeights(layout?.lg || []),
    layoutVersion: LAYOUT_VERSION
  }
}

/** Pack a section's widgets left-to-right, wrapping at 15 columns. */
function packSectionRow(lg, startY, sectionKey, widgetIds, idSet) {
  const items = widgetIds
    .filter((id) => idSet.has(id) && WIDGET_BLUEPRINT[id]?.section === sectionKey)
    .sort((a, b) => (WIDGET_BLUEPRINT[a]?.order ?? 0) - (WIDGET_BLUEPRINT[b]?.order ?? 0))

  if (!items.length) return startY

  let y = startY
  let x = 0
  let rowH = 0

  for (const id of items) {
    const { w, h } = blueprintSize(id, items)
    if (x > 0 && x + w > GRID_COLS) {
      y += rowH
      x = 0
      rowH = 0
    }
    lg.push({ i: id, x, y, w, h })
    x += w
    rowH = Math.max(rowH, h)
  }
  return y + rowH
}

/**
 * Production default layout: KPI row → metrics → insights (3-up) → performance → charts.
 * @param {string[]} widgetIds
 * @param {boolean} isAdmin
 */
export function buildDesignedLayout(widgetIds, isAdmin) {
  return buildLayoutRows(widgetIds, isAdmin)
}

/** Product default positions (matches shipped dashboard). */
export function buildPresetDefaultLayout(isAdmin, includePendingApprovals = false) {
  const widgets = defaultWidgetIdsForRole(isAdmin, { includePendingApprovals })
  return buildDesignedLayout(widgets, isAdmin)
}

/**
 * @param {boolean} isAdmin
 * @param {{ includePendingApprovals?: boolean }} [options]
 */
export function defaultDashboardPrefs(isAdmin, options = {}) {
  const includePendingApprovals = !!options.includePendingApprovals
  const dashboard_widgets = defaultWidgetIdsForRole(isAdmin, { includePendingApprovals })
  const dashboard_layout = buildPresetDefaultLayout(isAdmin, includePendingApprovals)
  return { dashboard_widgets, dashboard_layout }
}

/** Pack widgets left-to-right, top-to-bottom on a 12-column grid. */
export function buildDefaultLayout(widgetIds) {
  const ids = DEFAULT_WIDGET_ORDER.filter((id) => widgetIds.includes(id))
  /** @type {LayoutItem[]} */
  const lg = []
  let x = 0
  let y = 0
  let rowH = 0

  for (const id of ids) {
    const { w, h } = footprint(id)
    if (x + w > GRID_COLS) {
      x = 0
      y += rowH
      rowH = 0
    }
    lg.push({ i: id, x, y, w, h })
    x += w
    rowH = Math.max(rowH, h)
    if (x >= GRID_COLS) {
      x = 0
      y += rowH
      rowH = 0
    }
  }
  return { lg }
}

function stackLayoutForCols(lgLayout, colCount) {
  let y = 0
  return lgLayout.map((item) => {
    const w = Math.min(item.w, colCount)
    const h = item.h
    const placed = { ...item, x: 0, y, w: colCount }
    y += h
    return placed
  })
}

export function responsiveLayouts(lgLayout) {
  return {
    lg: lgLayout,
    md: stackLayoutForCols(lgLayout, 8),
    sm: stackLayoutForCols(lgLayout, 4),
    xs: stackLayoutForCols(lgLayout, 4)
  }
}

export function layoutMaxY(layout) {
  if (!layout?.length) return 0
  return layout.reduce((max, item) => Math.max(max, item.y + item.h), 0)
}

function layoutRectsOverlap(a, b) {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  )
}

/** First non-overlapping slot, scanning rows left-to-right (fills gaps in a row). */
export function findOpenLayoutSlot(lg, w, h) {
  const width = Math.min(w, GRID_COLS)
  const maxScanY = Math.max(layoutMaxY(lg) + h, h) + 24
  for (let y = 0; y < maxScanY; y++) {
    for (let x = 0; x <= GRID_COLS - width; x++) {
      const candidate = { x, y, w: width, h }
      if (!lg.some((item) => layoutRectsOverlap(candidate, item))) {
        return candidate
      }
    }
  }
  return { x: 0, y: layoutMaxY(lg), w: width, h }
}

/** Place one widget using its footprint — prefers same-row gaps over stacking below. */
export function placeWidgetInLayout(layout, widgetId) {
  const lg = [...(layout?.lg || [])]
  if (lg.some((item) => item.i === widgetId)) return { lg }
  const { w, h } = footprint(widgetId)
  const slot = findOpenLayoutSlot(lg, w, h)
  lg.push({ i: widgetId, ...slot })
  return { lg }
}

/** Append a widget (legacy name — uses row-aware placement). */
export function appendLayoutItem(layout, widgetId) {
  return placeWidgetInLayout(layout, widgetId)
}

/** @deprecated use buildDesignedLayout */
export function packLayoutForWidgets(widgetIds, isAdmin = true) {
  return buildDesignedLayout(widgetIds, isAdmin)
}

/** True when items were saved as a vertical stack (x=0), not a real grid. */
export function shouldReflowLayout(lg) {
  if (!lg?.length || lg.length < 2) return false
  const stackedAtOrigin = lg.filter((item) => item.x === 0).length
  return stackedAtOrigin >= lg.length - 1
}

function rowHasOrphanGap(row) {
  if (row.length !== 1) return false
  const item = row[0]
  return item.w <= 5 && GRID_COLS - item.w >= 8
}

/** Saved layout is missing widgets or does not follow the designed zones. */
export function needsDesignedLayout(lg, visibleIds, layoutVersion) {
  if (layoutVersion == null || layoutVersion < LAYOUT_VERSION) return true
  if (!lg?.length) return true
  if (shouldReflowLayout(lg)) return true
  const visible = new Set(visibleIds)
  if (lg.length !== visibleIds.length) return true
  if (lg.some((item) => !visible.has(item.i))) return true
  if (visibleIds.some((id) => !lg.some((item) => item.i === id))) return true

  const kpis = lg.filter((item) => KPI_WIDGET_IDS.includes(item.i))
  if (kpis.length >= 2 && new Set(kpis.map((k) => k.y)).size > 1) return true

  /** @type {Map<number, LayoutItem[]>} */
  const byY = new Map()
  for (const item of lg) {
    const row = byY.get(item.y) || []
    row.push(item)
    byY.set(item.y, row)
  }
  for (const row of byY.values()) {
    const heights = new Set(row.map((item) => item.h))
    if (heights.size > 1) return true
    if (rowHasOrphanGap(row)) return true
  }

  const branchPerf = lg.find((item) => item.i === 'branch_performance')
  if (branchPerf && branchPerf.h < BRANCH_PERFORMANCE_MIN_H) return true

  return false
}

export function filterLayout(layout, visibleIds) {
  const set = new Set(visibleIds)
  const lg = (layout?.lg || []).filter((item) => set.has(item.i))
  return { lg }
}

/**
 * Merge saved layout with visible widgets. Rebuilds with blueprint when messy or widgets change.
 * Custom drag positions from Edit layout are kept until Customize adds/removes widgets.
 */
export function mergeLayoutWithVisible(savedLayout, visibleIds, isAdmin = true) {
  const layoutVersion = savedLayout?.layoutVersion
  const lg = (savedLayout?.lg || []).filter((item) => visibleIds.includes(item.i))
  if (!lg.length || needsDesignedLayout(lg, visibleIds, layoutVersion)) {
    return buildDesignedLayout(visibleIds, isAdmin)
  }
  return stampLayout({ lg })
}

/**
 * @param {object} user
 * @param {boolean} isAdmin
 * @param {{ includePendingApprovals?: boolean }} [options]
 */
export function layoutForUser(user, isAdmin, options = {}) {
  const defaults = defaultWidgetIdsForRole(isAdmin, options)
  const widgets = migrateWidgetIds(
    user?.dashboard_widgets != null && Array.isArray(user.dashboard_widgets)
      ? user.dashboard_widgets
      : defaults
  )
  const visible = widgets || defaults
  const saved = user?.dashboard_layout
  if (saved?.lg?.length) {
    return mergeLayoutWithVisible(saved, visible, isAdmin)
  }
  return buildPresetDefaultLayout(isAdmin, !!options.includePendingApprovals)
}

export function layoutsToResponsive(dashboardLayout) {
  return responsiveLayouts(dashboardLayout.lg || [])
}

/** Role / view gates only — widgets still render empty states when data is missing. */
export function isWidgetAllowed(widgetId, ctx) {
  const { isAdmin, viewMode, approvalFlagOn } = ctx
  switch (widgetId) {
    case 'pending_approvals':
      return !!approvalFlagOn
    case 'service_income_earned':
    case 'cc_vs_si':
      return isAdmin
    case 'branch_performance':
      return isAdmin && viewMode === 'all'
    default:
      return true
  }
}

/** Ensure every visible widget has a grid position (repairs partial/corrupt saved layouts). */
export function ensureLayoutForWidgets(layout, widgetIds, isAdmin = true) {
  if (!widgetIds?.length) return stampLayout({ lg: [] })
  return mergeLayoutWithVisible(layout, widgetIds, isAdmin)
}

/** @deprecated use isWidgetAllowed — kept for callers that expected data gating */
export function isWidgetRenderable(widgetId, ctx) {
  return isWidgetAllowed(widgetId, ctx)
}
