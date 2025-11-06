import React, { useEffect, useMemo, useRef, useState } from 'react'

export default function SearchableSelect({
  options = [],            // array of strings OR array of {label, value}
  value = '',
  onChange,
  placeholder = 'Search…',
  emptyText = 'No results',
  disabled = false,
  maxHeight = 220
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const boxRef = useRef(null)

  const normalized = useMemo(() => {
    return options.map(o => typeof o === 'string' ? { label: o, value: o } : o)
  }, [options])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return normalized
    return normalized.filter(o => o.label.toLowerCase().includes(qq))
  }, [normalized, q])

  useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current) return
      if (!boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const selectedLabel = useMemo(() => {
    const f = normalized.find(o => String(o.value) === String(value))
    return f ? f.label : ''
  }, [normalized, value])

  return (
    <div ref={boxRef} className="ss relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v=>!v)}
        className="w-full text-left px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {selectedLabel || <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>}
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 shadow-xl">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <input
              autoFocus
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div style={{ maxHeight, overflow:'auto' }} className="py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-gray-500 dark:text-gray-400">{emptyText}</div>
            ) : filtered.map((opt, i) => (
              <div 
                key={i}
                onClick={() => { onChange && onChange(opt.value); setOpen(false); setQ('') }}
                className="px-4 py-2.5 cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700 first:border-t-0"
              >
                {opt.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
