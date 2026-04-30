import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FiChevronDown, FiSearch, FiCheck, FiMapPin } from 'react-icons/fi'

/**
 * Searchable branch combobox for the workspace header.
 * Only rendered for admins when scope === 'my_branch'.
 */
export default function BranchPicker({ options = [], value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  const current = useMemo(
    () => options.find((o) => o.code === value) || null,
    [options, value]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) =>
        o.code.toLowerCase().includes(q) ||
        (o.name || '').toLowerCase().includes(q)
    )
  }, [options, query])

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (!open) return
    setHighlight(0)
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [open])

  const commit = (opt) => {
    if (!opt) return
    onChange?.(opt.code)
    setOpen(false)
    setQuery('')
  }

  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commit(filtered[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        disabled={disabled || options.length === 0}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-[var(--stroke)] bg-[var(--card-bg-opaque)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50 transition-colors min-w-[11rem]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <FiMapPin className="w-4 h-4 text-[var(--text-muted)]" aria-hidden />
        <span className="truncate max-w-[9rem] text-left flex-1">
          {current ? (
            <span className="text-[var(--text-primary)]">{current.name}</span>
          ) : (
            <span className="text-[var(--text-muted)]">Pick a branch</span>
          )}
        </span>
        <FiChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open ? (
        <div
          className="absolute right-0 mt-1 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--stroke)] bg-[var(--card-bg-opaque)] shadow-xl overflow-hidden"
          role="listbox"
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--stroke)]">
            <FiSearch className="w-4 h-4 text-[var(--text-muted)]" aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
              placeholder="Search by code or name"
              className="flex-1 bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-xs text-[var(--text-muted)] text-center">
                No branches match “{query}”
              </li>
            ) : (
              filtered.map((opt, idx) => {
                const isActive = opt.code === value
                const isHl = idx === highlight
                return (
                  <li
                    key={opt.code}
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setHighlight(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      commit(opt)
                    }}
                    className={`px-3 py-2 cursor-pointer flex items-center gap-2 text-sm ${
                      isHl ? 'bg-[var(--card-hover)]' : ''
                    } ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                  >
                    <span className="flex-1 truncate">{opt.name}</span>
                    {!opt.is_active ? (
                      <span className="text-[10px] uppercase tracking-wide text-[var(--warn)]">inactive</span>
                    ) : null}
                    {isActive ? (
                      <FiCheck className="w-4 h-4 text-[var(--accent)]" aria-hidden />
                    ) : null}
                  </li>
                )
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
