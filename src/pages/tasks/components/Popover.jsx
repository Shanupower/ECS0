import React, { useEffect, useRef, useState } from 'react'

export default function Popover({ anchor, onClose, placement = 'bottom-start', children }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)

  useEffect(() => {
    if (!anchor) { setPos(null); return }
    const rect = anchor.getBoundingClientRect()
    const viewportH = window.innerHeight
    const viewportW = window.innerWidth
    const prefTop = rect.bottom + 6
    const top = prefTop + 320 > viewportH ? Math.max(8, rect.top - 320) : prefTop
    const left = Math.min(viewportW - 280, Math.max(8, rect.left))
    setPos({ top, left })
  }, [anchor])

  useEffect(() => {
    const onDocClick = (e) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target) && e.target !== anchor) onClose?.()
    }
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [anchor, onClose])

  if (!pos) return null
  return (
    <div
      ref={ref}
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 60 }}
      className="min-w-[220px] max-w-[320px] rounded-lg border border-[var(--stroke)] bg-[var(--card-bg)] shadow-2xl overflow-hidden"
    >
      {children}
    </div>
  )
}
