import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FiArrowUpRight, FiArrowDownRight, FiMinus, FiInfo } from 'react-icons/fi'
import { deltaPercent, formatPct } from './utils'

function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const from = 0
    const to = Number(target || 0)
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + (to - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

export default function KpiStat({
  title,
  value,
  previousValue = null,
  format = (v) => v,
  icon: Icon,
  iconBg = 'bg-[var(--accent-muted)]',
  iconColor = 'text-[var(--accent)]',
  compare = false,
  invertDelta = false,
  definition = null,
}) {
  const numericValue = Number(value || 0)
  const shown = useCountUp(numericValue)
  const delta = compare && previousValue != null ? deltaPercent(numericValue, Number(previousValue)) : null
  const neutral = delta == null || Math.abs(delta) < 0.5
  const up = !neutral && delta > 0
  const good = invertDelta ? !up : up
  const toneClass = neutral
    ? 'bg-[var(--card-bg-opaque)] text-[var(--text-muted)] border-[var(--stroke)]'
    : good
      ? 'bg-[var(--success-muted)] text-[var(--success)] border-[var(--success)]/30'
      : 'bg-[var(--error-muted)] text-[var(--error)] border-[var(--error)]/30'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl border border-[var(--stroke)] bg-[var(--card-bg)] p-4 hover:bg-[var(--card-hover)] transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <span>{title}</span>
            {definition && (
              <button
                type="button"
                className="inline-flex p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                title={definition}
                aria-label={`About ${title}`}
              >
                <FiInfo className="w-3.5 h-3.5" aria-hidden />
              </button>
            )}
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)] mt-1 tabular-nums truncate">
            {format(Math.round(shown))}
          </div>
          {compare && delta != null && (
            <div className={`mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${toneClass}`}>
              {neutral ? <FiMinus className="w-3 h-3" /> : up ? <FiArrowUpRight className="w-3 h-3" /> : <FiArrowDownRight className="w-3 h-3" />}
              {formatPct(Math.abs(delta))} vs prev
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        )}
      </div>
    </motion.div>
  )
}
