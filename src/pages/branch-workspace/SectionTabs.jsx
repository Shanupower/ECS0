import React, { useCallback, useEffect, useRef, useState } from 'react'
import { classNames } from '../../components/branch-hub/utils'

export default function SectionTabs({ tabs, value, onChange }) {
  const containerRef = useRef(null)
  const sentinelRef = useRef(null)
  const buttonsRef = useRef({})
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { threshold: [1] }
    )
    io.observe(sentinel)
    return () => io.disconnect()
  }, [])

  const focusTab = useCallback(
    (id) => {
      const btn = buttonsRef.current[id]
      if (btn) btn.focus()
    },
    []
  )

  const onKeyDown = useCallback(
    (e) => {
      const currentIdx = tabs.findIndex((t) => t.id === value)
      if (currentIdx < 0) return
      let nextIdx = null
      if (e.key === 'ArrowRight') nextIdx = (currentIdx + 1) % tabs.length
      else if (e.key === 'ArrowLeft') nextIdx = (currentIdx - 1 + tabs.length) % tabs.length
      else if (e.key === 'Home') nextIdx = 0
      else if (e.key === 'End') nextIdx = tabs.length - 1
      if (nextIdx == null) return
      e.preventDefault()
      const nextId = tabs[nextIdx].id
      onChange(nextId)
      requestAnimationFrame(() => focusTab(nextId))
    },
    [tabs, value, onChange, focusTab]
  )

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-0 w-full" />
      <div
        ref={containerRef}
        className={classNames(
          'sticky top-0 z-20 -mx-4 lg:-mx-6 px-4 lg:px-6 bg-[var(--canvas)]/90 backdrop-blur supports-[backdrop-filter]:bg-[var(--canvas)]/75 border-b border-[var(--stroke)] transition-shadow',
          stuck ? 'shadow-[0_1px_0_0_var(--stroke),0_6px_18px_-12px_rgba(0,0,0,0.25)]' : ''
        )}
      >
        <div
          role="tablist"
          aria-label="Branch workspace sections"
          onKeyDown={onKeyDown}
          className="flex gap-1 sm:gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
        >
          {tabs.map((t) => {
            const Icon = t.icon
            const active = value === t.id
            return (
              <button
                key={t.id}
                ref={(el) => {
                  if (el) buttonsRef.current[t.id] = el
                  else delete buttonsRef.current[t.id]
                }}
                id={`ws-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`ws-panel-${t.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => onChange(t.id)}
                className={classNames(
                  'group relative snap-start shrink-0 inline-flex items-start gap-2 px-3 md:px-4 py-3 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-t-md',
                  active
                    ? 'border-[var(--accent)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--stroke)]'
                )}
              >
                <Icon
                  className={classNames(
                    'w-4 h-4 mt-0.5 transition-colors',
                    active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
                  )}
                  aria-hidden
                />
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-sm font-medium">{t.label}</span>
                  {t.description ? (
                    <span className="hidden md:block text-[11px] text-[var(--text-muted)] mt-0.5">
                      {t.description}
                    </span>
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
