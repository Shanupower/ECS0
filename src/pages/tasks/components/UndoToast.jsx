import React, { useEffect, useState } from 'react'
import { FiRotateCcw, FiX } from 'react-icons/fi'

export default function UndoToast({ message, onUndo, onDismiss, durationMs = 5000 }) {
  const [remaining, setRemaining] = useState(durationMs)
  useEffect(() => {
    const start = Date.now()
    const tick = setInterval(() => {
      const elapsed = Date.now() - start
      const left = Math.max(0, durationMs - elapsed)
      setRemaining(left)
      if (left <= 0) {
        clearInterval(tick)
        onDismiss?.()
      }
    }, 100)
    return () => clearInterval(tick)
  }, [durationMs, onDismiss])

  const pct = Math.max(0, Math.min(100, (remaining / durationMs) * 100))

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
      <div className="relative overflow-hidden rounded-lg border border-[var(--stroke)] bg-[var(--card-bg)] shadow-2xl min-w-[280px]">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <span className="text-sm text-[var(--text-primary)]">{message}</span>
          <button onClick={() => { onUndo?.(); onDismiss?.() }} className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline">
            <FiRotateCcw className="w-3 h-3" /> Undo
          </button>
          <button onClick={onDismiss} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <FiX className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="absolute bottom-0 left-0 h-0.5 bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
