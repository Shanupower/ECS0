import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FiX } from 'react-icons/fi'

export default function MultiSelect({
  options = [],            // array of strings OR array of {label, value}
  value = [],              // array of selected values
  onChange,
  placeholder = 'Select...',
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

  const selectedLabels = useMemo(() => {
    const selected = Array.isArray(value) ? value : []
    return selected.map(v => {
      const f = normalized.find(o => String(o.value) === String(v))
      return f ? f.label : v
    })
  }, [normalized, value])

  const isSelected = (optValue) => {
    const selected = Array.isArray(value) ? value : []
    return selected.some(v => String(v) === String(optValue))
  }

  const handleToggle = (optValue) => {
    const selected = Array.isArray(value) ? [...value] : []
    const index = selected.findIndex(v => String(v) === String(optValue))
    
    if (index >= 0) {
      // Remove if already selected
      selected.splice(index, 1)
    } else {
      // Add if not selected
      selected.push(optValue)
    }
    
    onChange && onChange(selected)
  }

  const handleRemove = (e, optValue) => {
    e.stopPropagation()
    const selected = Array.isArray(value) ? [...value] : []
    const index = selected.findIndex(v => String(v) === String(optValue))
    if (index >= 0) {
      selected.splice(index, 1)
      onChange && onChange(selected)
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] flex items-center flex-wrap gap-2"
      >
        {selectedLabels.length > 0 ? (
          <div className="flex flex-wrap gap-2 w-full">
            {selectedLabels.map((label, idx) => {
              const optValue = Array.isArray(value) ? value[idx] : null
              return (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm"
                >
                  {label}
                  <span
                    onClick={(e) => handleRemove(e, optValue)}
                    className="hover:bg-red-200 dark:hover:bg-red-900/50 rounded-full p-0.5 cursor-pointer"
                  >
                    <FiX className="w-3 h-3" />
                  </span>
                </span>
              )
            })}
          </div>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 shadow-xl">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div style={{ maxHeight, overflow: 'auto' }} className="py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-gray-500 dark:text-gray-400">{emptyText}</div>
            ) : filtered.map((opt, i) => (
              <div
                key={i}
                onClick={() => handleToggle(opt.value)}
                className={`px-4 py-2.5 cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700 first:border-t-0 flex items-center justify-between ${
                  isSelected(opt.value) ? 'bg-red-50 dark:bg-red-900/20' : ''
                }`}
              >
                <span>{opt.label}</span>
                {isSelected(opt.value) && (
                  <span className="text-red-600 dark:text-red-400">✓</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

