import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

function pad2(n) {
  const s = String(n)
  return s.length >= 2 ? s : `0${s}`
}

// Input displays `DD-MM-YYYY`, but the app state uses `YYYY-MM-DD`.
function yyyyMmDdToDisplay(yyyyMmDd) {
  if (!yyyyMmDd) return ''
  const m = String(yyyyMmDd).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return ''
  const year = m[1]
  const month = m[2]
  const day = m[3]
  return `${day}-${month}-${year}`
}

function isValidYyyyMmDd(yyyyMmDd) {
  if (!yyyyMmDd) return false
  const m = String(yyyyMmDd).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return false
  const year = Number(m[1])
  const month = Number(m[2]) // 1-12
  const day = Number(m[3]) // 1-31
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return false
  const d = new Date(year, month - 1, day)
  return d.getFullYear() === year && d.getMonth() === (month - 1) && d.getDate() === day
}

function parseDdMmYyyyToYyyyMmDd(ddMmYyyy) {
  if (!ddMmYyyy) return ''
  const trimmed = String(ddMmYyyy).trim()
  const m = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/)
    || trimmed.match(/^(\d{2})(\d{2})(\d{4})$/)
  if (!m) return ''
  const day = Number(m[1])
  const month = Number(m[2]) // 1-12
  const year = Number(m[3])
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return ''
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== (month - 1) || d.getDate() !== day) return ''
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function compareYyyyMmDd(a, b) {
  // Lexicographic works for `YYYY-MM-DD`.
  if (!a || !b) return 0
  if (a === b) return 0
  return a < b ? -1 : 1
}

function yyyyMmDdToDate(yyyyMmDd) {
  if (!isValidYyyyMmDd(yyyyMmDd)) return null
  const m = String(yyyyMmDd).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2]) // 1..12
  const day = Number(m[3])
  return new Date(year, month - 1, day)
}

function getMonthMatrix(viewYear, viewMonth) {
  const firstOfMonth = new Date(viewYear, viewMonth, 1)
  const startDay = firstOfMonth.getDay() // 0..6, Sunday=0
  const start = new Date(viewYear, viewMonth, 1 - startDay)

  const days = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return days
}

/** Scroll events do not bubble; `window` does not fire when a nested `<main overflow-auto>` scrolls. */
function collectScrollableAncestors(el) {
  const list = []
  if (!el || !el.parentElement) return list
  let node = el.parentElement
  while (node && node !== document.documentElement) {
    if (node instanceof HTMLElement) {
      const s = window.getComputedStyle(node)
      const oy = s.overflowY
      const ox = s.overflowX
      const o = s.overflow
      if (/(auto|scroll|overlay)/.test(o) || /(auto|scroll|overlay)/.test(oy) || /(auto|scroll|overlay)/.test(ox)) {
        list.push(node)
      }
    }
    node = node.parentElement
  }
  return list
}

export default function DatePickerInput({
  value,
  onChange,
  min,
  max,
  disabled,
  readOnly,
  required,
  placeholder = 'DD-MM-YYYY or DDMMYYYY',
  className,
  inputClassName,
  ariaLabel,
}) {
  const rootRef = useRef(null)
  const popupRef = useRef(null)
  const inputRef = useRef(null)
  const yearWheelAccumRef = useRef(0)
  const yearListRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [yearMenuOpen, setYearMenuOpen] = useState(false)
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 })
  const [viewYear, setViewYear] = useState(() => {
    const d = yyyyMmDdToDate(value) || new Date()
    return d.getFullYear()
  })
  const [viewMonth, setViewMonth] = useState(() => {
    const d = yyyyMmDdToDate(value) || new Date()
    return d.getMonth()
  })

  const [isEditing, setIsEditing] = useState(false)
  const [textValue, setTextValue] = useState(() => yyyyMmDdToDisplay(value))

  const disabledAll = !!disabled || !!readOnly

  // Keep display in sync when the parent changes the value (e.g. dashboard presets) even if the field still has focus.
  useEffect(() => {
    setTextValue(yyyyMmDdToDisplay(value))
  }, [value])

  const normalizedMin = useMemo(() => (isValidYyyyMmDd(min) ? min : ''), [min])
  const normalizedMax = useMemo(() => (isValidYyyyMmDd(max) ? max : ''), [max])

  const yearOptions = useMemo(() => {
    const current = viewYear
    const parsedMin = normalizedMin ? Number(String(normalizedMin).slice(0, 4)) : null
    const parsedMax = normalizedMax ? Number(String(normalizedMax).slice(0, 4)) : null

    let start = parsedMin != null ? parsedMin : current - 10
    let end = parsedMax != null ? parsedMax : current + 10

    if (Number.isNaN(start) || Number.isNaN(end)) {
      start = current - 10
      end = current + 10
    }

    if (start > end) {
      const tmp = start
      start = end
      end = tmp
    }

    // Safety cap (avoid generating thousands of options if dates are huge).
    const span = end - start
    if (span > 60) {
      start = current - 25
      end = current + 25
    }

    const options = []
    for (let y = start; y <= end; y++) options.push(y)
    return options
  }, [normalizedMin, normalizedMax, viewYear])

  function isDateSelectable(yyyyMmDd) {
    if (!isValidYyyyMmDd(yyyyMmDd)) return false
    if (normalizedMin && compareYyyyMmDd(yyyyMmDd, normalizedMin) < 0) return false
    if (normalizedMax && compareYyyyMmDd(yyyyMmDd, normalizedMax) > 0) return false
    return true
  }

  function applyTextToValue(nextText) {
    const nextYyyyMmDd = parseDdMmYyyyToYyyyMmDd(nextText)
    if (!nextYyyyMmDd) {
      // If user clears input, accept empty; otherwise revert.
      const trimmed = String(nextText || '').trim()
      if (trimmed === '') {
        if (typeof onChange === 'function') onChange('')
        return
      }
      return false
    }
    if (!isDateSelectable(nextYyyyMmDd)) return false
    onChange && onChange(nextYyyyMmDd)
    return true
  }

  useEffect(() => {
    if (!open) return
    function onDocMouseDown(e) {
      const t = e && e.target
      if (!t) return
      if (rootRef.current && rootRef.current.contains(t)) return
      if (popupRef.current && popupRef.current.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  useEffect(() => {
    if (!open) return

    function updatePosition() {
      if (!inputRef.current) return
      const rect = inputRef.current.getBoundingClientRect()
      const width = rect.width || 288
      const leftCandidate = rect.left
      const maxLeft = (window.innerWidth || 1024) - width - 12
      const left = leftCandidate > maxLeft ? maxLeft : leftCandidate
      const maxTop = (window.innerHeight || 768) - 340
      const topBelow = rect.bottom + 6
      const top = topBelow > maxTop ? Math.max(8, rect.top - 300) : topBelow
      setPopupPos({ top, left: Math.max(8, left) })
    }

    updatePosition()
    const scrollRoots = inputRef.current ? collectScrollableAncestors(inputRef.current) : []
    scrollRoots.forEach((el) => el.addEventListener('scroll', updatePosition, true))
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    let ro = null
    if (typeof ResizeObserver !== 'undefined' && inputRef.current) {
      ro = new ResizeObserver(() => updatePosition())
      ro.observe(inputRef.current)
    }

    const vv = window.visualViewport
    if (vv) vv.addEventListener('resize', updatePosition)

    return () => {
      scrollRoots.forEach((el) => el.removeEventListener('scroll', updatePosition, true))
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
      if (ro) ro.disconnect()
      if (vv) vv.removeEventListener('resize', updatePosition)
    }
  }, [open])

  function openCalendar() {
    if (disabledAll) return
    const d = yyyyMmDdToDate(value) || new Date()
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())

    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      const width = rect.width || 288
      const leftCandidate = rect.left
      const maxLeft = (window.innerWidth || 1024) - width - 12
      const left = leftCandidate > maxLeft ? maxLeft : leftCandidate
      setPopupPos({ top: rect.bottom + 6, left: Math.max(8, left) })
    }
    setYearMenuOpen(false)
    setOpen(true)
  }

  /** Prevent input blur before click; avoids flaky close/reset and keeps popup aligned while selecting. */
  function onPopupMouseDown(e) {
    const t = e && e.target
    const tag = t && t.tagName ? String(t.tagName).toUpperCase() : ''

    // Allow year menu interactions.
    if (tag === 'SELECT' || tag === 'OPTION') return
    if (t && typeof t.closest === 'function' && (t.closest('select') || t.closest('[data-year-menu]'))) return

    e.preventDefault()
  }

  function onSelectDate(dateObj) {
    const year = dateObj.getFullYear()
    const month = dateObj.getMonth() + 1
    const day = dateObj.getDate()
    const yyyyMmDd = `${year}-${pad2(month)}-${pad2(day)}`
    if (!isDateSelectable(yyyyMmDd)) return
    onChange && onChange(yyyyMmDd)
    setTextValue(yyyyMmDdToDisplay(yyyyMmDd))
    setOpen(false)
  }

  const monthDays = useMemo(() => getMonthMatrix(viewYear, viewMonth), [viewYear, viewMonth])
  const selectedYyyyMmDd = isValidYyyyMmDd(value) ? value : ''

  const todayParts = useMemo(() => {
    const t = new Date()
    const y = t.getFullYear()
    const m = t.getMonth()
    const d = t.getDate()
    return { y, m, d, yyyyMmDd: `${y}-${pad2(m + 1)}-${pad2(d)}` }
  }, [open])

  const yearBounds = useMemo(() => {
    if (!Array.isArray(yearOptions) || yearOptions.length === 0) return { minYear: null, maxYear: null }
    return { minYear: yearOptions[0], maxYear: yearOptions[yearOptions.length - 1] }
  }, [yearOptions])

  function onYearWheel(e) {
    if (disabledAll) return
    if (!open) return

    // Prevent the page from scrolling while the wheel is over the year control.
    e.preventDefault()
    e.stopPropagation()

    const deltaY = e.deltaY
    if (!Number.isFinite(deltaY) || yearBounds.minYear == null || yearBounds.maxYear == null) return

    // Normalize wheel units: pixels (0), lines (1), pages (2).
    const unitScale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 120 : 1
    yearWheelAccumRef.current += deltaY * unitScale

    // Convert accumulated wheel motion into year steps.
    const threshold = 24
    const absAccum = Math.abs(yearWheelAccumRef.current)
    const fullSteps = Math.floor(absAccum / threshold)
    if (fullSteps <= 0) return

    const direction = Math.sign(yearWheelAccumRef.current)
    yearWheelAccumRef.current -= direction * fullSteps * threshold

    // Wheel down => later year, wheel up => earlier year.
    const yearDelta = direction > 0 ? fullSteps : -fullSteps
    setViewYear((prevYear) => {
      const nextYear = prevYear + yearDelta
      if (nextYear < yearBounds.minYear) return yearBounds.minYear
      if (nextYear > yearBounds.maxYear) return yearBounds.maxYear
      return nextYear
    })
  }

  useEffect(() => {
    if (!open || !yearMenuOpen || !yearListRef.current) return
    const selectedEl = yearListRef.current.querySelector(`[data-year-item="${viewYear}"]`)
    if (selectedEl && typeof selectedEl.scrollIntoView === 'function') {
      selectedEl.scrollIntoView({ block: 'center' })
    }
  }, [open, yearMenuOpen, viewYear])

  const inputId = ariaLabel ? `date-${String(ariaLabel).toLowerCase().replace(/\s+/g, '-')}` : undefined

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div ref={rootRef} className={className} style={{ position: 'relative' }}>
      <input
        id={inputId}
        ref={inputRef}
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel || 'Select date'}
        placeholder={disabledAll ? '' : placeholder}
        value={textValue}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        onFocus={() => {
          setIsEditing(true)
          if (!disabledAll) openCalendar()
        }}
        onChange={(e) => {
          setTextValue(e.target.value)
        }}
        onBlur={() => {
          setIsEditing(false)
          if (!readOnly) {
            const applied = applyTextToValue(textValue)
            if (!applied) setTextValue(yyyyMmDdToDisplay(value))
          }
        }}
        onKeyDown={(e) => {
          // IE11-safe key handling.
          const keyCode = e.which || e.keyCode
          if (keyCode === 13) {
            e.preventDefault()
            const applied = applyTextToValue(textValue)
            if (!applied) setTextValue(yyyyMmDdToDisplay(value))
            setOpen(false)
          }
          // Escape closes popup.
          if (keyCode === 27) setOpen(false)
        }}
        className={inputClassName || 'w-full rounded-input border bg-[var(--card-bg-opaque)] px-4 py-2.5 text-body text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--placeholder)] border-[var(--stroke)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--canvas)]'}
      />

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popupRef}
            className="ecs-date-picker-popover w-72 rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] shadow-xl overflow-hidden"
            role="dialog"
            aria-label="Date picker"
            onMouseDown={onPopupMouseDown}
            style={{ position: 'fixed', zIndex: 100000, top: popupPos.top, left: popupPos.left }}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--stroke)]">
              <button
                type="button"
                onClick={() => {
                  const next = new Date(viewYear, viewMonth - 1, 1)
                  setViewYear(next.getFullYear())
                  setViewMonth(next.getMonth())
                }}
                className="px-2 py-1 rounded-lg border border-[var(--stroke)] hover:bg-[var(--card-hover)] text-[var(--text-secondary)]"
                aria-label="Previous month"
              >
                ‹
              </button>
            <div
              className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 relative"
              onWheel={onYearWheel}
              data-year-menu
            >
              <span>{MONTH_NAMES[viewMonth]}</span>
              <button
                type="button"
                disabled={disabledAll}
                onClick={() => setYearMenuOpen((prev) => !prev)}
                className="px-2 py-1 rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none min-w-[76px] text-left"
                aria-label="Select year"
              >
                <span className="inline-flex w-full items-center justify-between gap-2">
                  <span>{viewYear}</span>
                  <span aria-hidden="true">▾</span>
                </span>
              </button>
              {yearMenuOpen ? (
                <div
                  ref={yearListRef}
                  className="absolute z-20 top-9 right-0 max-h-44 w-24 overflow-y-auto rounded-lg border border-[var(--stroke)] bg-[var(--card-bg-opaque)] shadow-lg"
                  data-year-menu
                  onWheel={onYearWheel}
                >
                  {yearOptions.map((y) => (
                    <button
                      key={y}
                      type="button"
                      data-year-menu
                      data-year-item={y}
                      onClick={() => {
                        setViewYear(y)
                        setYearMenuOpen(false)
                      }}
                      className={[
                        'block w-full px-2 py-1 text-left text-sm',
                        y === viewYear ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'text-[var(--text-primary)] hover:bg-[var(--card-hover)]',
                      ].join(' ')}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
              <button
                type="button"
                onClick={() => {
                  const next = new Date(viewYear, viewMonth + 1, 1)
                  setViewYear(next.getFullYear())
                  setViewMonth(next.getMonth())
                }}
                className="px-2 py-1 rounded-lg border border-[var(--stroke)] hover:bg-[var(--card-hover)] text-[var(--text-secondary)]"
                aria-label="Next month"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 px-3 py-2 text-center text-xs font-medium text-[var(--text-secondary)]">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                <div key={`${d}-${idx}`}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 px-3 pb-3">
              {monthDays.map((d, idx) => {
                const yyyyMmDd = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
                const inView = d.getMonth() === viewMonth
                const selectable = isDateSelectable(yyyyMmDd)
                const selected = selectedYyyyMmDd && yyyyMmDd === selectedYyyyMmDd
                const isToday = d.getFullYear() === todayParts.y && d.getMonth() === todayParts.m && d.getDate() === todayParts.d
                const showToday = isToday && inView && !selected

                return (
                  <button
                    key={`${yyyyMmDd}-${idx}`}
                    type="button"
                    onClick={() => onSelectDate(d)}
                    disabled={!selectable}
                    data-today={isToday ? 'true' : undefined}
                    style={
                      showToday
                        ? {
                            boxShadow: 'inset 0 0 0 2px var(--accent)',
                            borderColor: 'var(--accent)',
                          }
                        : undefined
                    }
                    className={[
                      'h-9 rounded-lg border text-xs transition-colors',
                      inView ? 'bg-[var(--card-bg-opaque)] border-[var(--stroke)] text-[var(--text-primary)]' : 'bg-[var(--card-bg)] border-[var(--stroke)] text-[var(--text-muted)] opacity-70',
                      selected ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]' : '',
                      // "Today" should be visible even when ring-offset colors differ across pages/themes.
                      showToday && selectable ? 'text-[var(--accent)] font-semibold' : '',
                      showToday && !selectable ? 'font-semibold' : '',
                      !selectable ? 'cursor-not-allowed opacity-40' : 'hover:bg-[var(--card-hover)]',
                    ].join(' ')}
                    aria-label={`Select ${yyyyMmDd}${isToday ? ' (today)' : ''}`}
                  >
                    {d.getDate()}
                  </button>
                )
              })}
            </div>

            {normalizedMin || normalizedMax ? (
              <div className="px-3 pb-3 text-[10px] text-[var(--text-secondary)] border-t border-[var(--stroke)]">
                {normalizedMin ? `Min: ${yyyyMmDdToDisplay(normalizedMin)}` : null}
                {normalizedMin && normalizedMax ? ' • ' : null}
                {normalizedMax ? `Max: ${yyyyMmDdToDisplay(normalizedMax)}` : null}
              </div>
            ) : null}
          </div>,
          document.body
        )}
    </div>
  )
}

