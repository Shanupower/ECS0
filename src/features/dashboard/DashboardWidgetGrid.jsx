import React, { useMemo, useRef, useEffect } from 'react'
import { Responsive, useContainerWidth, verticalCompactor } from 'react-grid-layout'
import {
  layoutsToResponsive,
  GRID_COLS,
  GRID_ROW_HEIGHT,
  GRID_MARGIN,
  ensureLayoutForWidgets
} from './dashboard-layout.js'

import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480 }
const COLS = { lg: GRID_COLS, md: 8, sm: 4, xs: 4 }

/**
 * @param {{
 *   layout: { lg: import('./dashboard-layout.js').LayoutItem[] },
 *   editMode: boolean,
 *   onLayoutChange: (layout: { lg: import('./dashboard-layout.js').LayoutItem[] }) => void,
 *   widgetIds: string[],
 *   isAdmin?: boolean,
 *   renderWidget: (id: string) => React.ReactNode,
 * }} props
 */
export default function DashboardWidgetGrid({
  layout,
  editMode,
  onLayoutChange,
  widgetIds,
  isAdmin = true,
  renderWidget
}) {
  const { width, containerRef, mounted } = useContainerWidth()
  const normalizedLayout = useMemo(
    () => ensureLayoutForWidgets(layout, widgetIds, isAdmin),
    [layout, widgetIds, isAdmin]
  )
  const layouts = useMemo(() => layoutsToResponsive(normalizedLayout), [normalizedLayout])
  const ignoreLayoutChange = useRef(true)

  useEffect(() => {
    ignoreLayoutChange.current = true
    const t = setTimeout(() => {
      ignoreLayoutChange.current = false
    }, 100)
    return () => clearTimeout(t)
  }, [widgetIds, editMode])

  const handleLayoutChange = (_current, allLayouts) => {
    if (!editMode) return
    if (ignoreLayoutChange.current) return
    const lg = allLayouts?.lg
    if (!Array.isArray(lg) || lg.length === 0) return
    onLayoutChange({
      lg: lg.map((item) => ({
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h
      }))
    })
  }

  return (
    <div ref={containerRef} className={editMode ? 'dashboard-grid-edit' : 'dashboard-grid-view'}>
      {mounted && width > 0 && (
        <Responsive
          className="dashboard-rgl"
          width={width}
          layouts={layouts}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={GRID_ROW_HEIGHT}
          margin={GRID_MARGIN}
          containerPadding={[0, 0]}
          dragConfig={{ enabled: editMode }}
          resizeConfig={{ enabled: false }}
          compactor={verticalCompactor}
          onLayoutChange={handleLayoutChange}
        >
          {widgetIds.map((id) => (
            <div key={id} className="dashboard-grid-item h-full" data-widget-id={id}>
              <div className={`dashboard-grid-item-shell h-full min-h-0 flex flex-col ${editMode ? 'dashboard-grid-item-shell--edit' : ''}`}>
                {editMode && (
                  <div className="dashboard-grid-drag-handle" aria-hidden>
                    <span className="dashboard-grid-drag-grip" />
                  </div>
                )}
                <div className={`h-full min-h-0 flex-1 ${editMode ? 'dashboard-grid-item-body--edit' : ''}`}>
                  {renderWidget(id)}
                </div>
              </div>
            </div>
          ))}
        </Responsive>
      )}
    </div>
  )
}
