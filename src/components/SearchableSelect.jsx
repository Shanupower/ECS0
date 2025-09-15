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
    <div ref={boxRef} className="ss" style={{ position:'relative' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v=>!v)}
        className="ss-btn"
        style={{
          width:'100%', textAlign:'left', padding:'12px 14px', border:'1px solid rgba(0,0,0,.1)',
          borderRadius:12, background:'#fff', cursor:'pointer'
        }}
      >
        {selectedLabel || <span style={{color:'#9ca3af'}}>{placeholder}</span>}
      </button>

      {open && (
        <div className="ss-pop"
          style={{
            position:'absolute', left:0, right:0, zIndex:30, marginTop:6, border:'1px solid rgba(0,0,0,.1)',
            borderRadius:12, background:'#fff', boxShadow:'0 12px 28px rgba(0,0,0,.12)'
          }}
        >
          <div style={{ padding:10, borderBottom:'1px solid rgba(0,0,0,.06)' }}>
            <input
              autoFocus
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder={placeholder}
              style={{ width:'100%', padding:'10px 12px', border:'1px solid rgba(0,0,0,.1)', borderRadius:10 }}
            />
          </div>
          <div style={{ maxHeight, overflow:'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding:12, color:'#6b7280' }}>{emptyText}</div>
            ) : filtered.map((opt, i) => (
              <div key={i}
                   onClick={() => { onChange && onChange(opt.value); setOpen(false); setQ('') }}
                   style={{ padding:'10px 12px', cursor:'pointer', borderTop:'1px solid rgba(0,0,0,.04)' }}
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
